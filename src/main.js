const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import modular utilities
const { executeCommand, readFile, writeFile } = require('./utils/fileOperations');
const { userMemory, loadMemory, saveMemory, clearAllMemory } = require('./utils/memory');
const { OLLAMA_API_BASE, getAvailableModels, getFastestModel } = require('./utils/ai');
const { getEnhancedAIResponse } = require('./utils/aiResponse');
const { handleDevCommands } = require('./utils/devCommands');
const { loadProfile } = require('./utils/userProfile');
const { handleUserRequest, addUserCorrection, getIntentStats, copyChatToClipboard } = require('./utils/intentHandler');

// --- IPC Handlers ---
ipcMain.handle('test-ollama-connection', async () => {
  try {
    const response = await fetch(`${OLLAMA_API_BASE}/tags`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { success: true, models: data.models };
  } catch (error) {
    console.error('Ollama connection error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-ai-response', async (_, { message, model, speedMode }) => {
  try {
    return await getEnhancedAIResponse(message, model, speedMode);
  } catch (error) {
    // Format error for better display in renderer
    let errorMessage = '❌ AI Error: Could not get response';
    
    if (error.message.includes('memory') || error.message.includes('GiB')) {
      errorMessage = '❌ AI Error: Not enough RAM for the model. Try a smaller model or close other apps.';
    } else if (error.message.includes('HTTP 500') || error.message.includes('500')) {
      errorMessage = '❌ AI Error: Server error. The AI model may be overloaded or not running.';
    } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
      errorMessage = '❌ AI Error: Network connection issue. Check your internet connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = '❌ AI Error: Request timed out. The model may be too slow or overloaded.';
    } else if (error.message.includes('model')) {
      errorMessage = '❌ AI Error: Model not found or not loaded. Check if Ollama is running.';
    }
    
    return {
      success: false,
      error: errorMessage,
      originalError: error.message
    };
  }
});

// Memory management IPC handlers
ipcMain.handle('get-user-memory', () => {
  return userMemory;
});

ipcMain.handle('update-user-preferences', async (_, preferences) => {
  userMemory.preferences = { ...userMemory.preferences, ...preferences };
  saveMemory();
  return { success: true };
});

ipcMain.handle('get-behavior-stats', () => {
  return userMemory.behavior;
});

// Dev mode IPC handlers
ipcMain.handle('execute-command', async (_, { command, devMode }) => {
  if (!devMode) {
    throw new Error('Dev mode not enabled');
  }
  return await executeCommand(command);
});

ipcMain.handle('read-file', async (_, { filePath, devMode }) => {
  if (!devMode) {
    throw new Error('Dev mode not enabled');
  }
  return await readFile(filePath);
});

ipcMain.handle('write-file', async (_, { filePath, content, devMode }) => {
  if (!devMode) {
    throw new Error('Dev mode not enabled');
  }
  return await writeFile(filePath, content);
});

ipcMain.handle('clear-all-memory', async () => {
  clearAllMemory();
  return { success: true };
});

// Model IPC handlers
ipcMain.handle('get-fastest-model', () => {
  return getFastestModel();
});

ipcMain.handle('get-available-models', async () => {
  try {
    return getAvailableModels();
  } catch (error) {
    console.error('Error getting available models:', error);
    return [];
  }
});

// Intent handling IPC handlers
ipcMain.handle('handle-user-request', async (_, message) => {
  return await handleUserRequest(message);
});

ipcMain.handle('add-user-correction', async (_, { originalMessage, correctedIntent, feedback }) => {
  return addUserCorrection(originalMessage, correctedIntent, feedback);
});

ipcMain.handle('get-intent-stats', () => {
  return getIntentStats();
});

ipcMain.handle('copy-chat-to-clipboard', async (_, errorMessage) => {
  return copyChatToClipboard(errorMessage);
});

// --- Create Main Window ---
function createWindow() {
  console.log('Creating main window...');
  
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  console.log('Loading HTML file directly...');
  win.loadFile(path.join(__dirname, 'index.html'));
  
  // Open DevTools for debugging
  win.webContents.openDevTools();
  
  win.webContents.on('did-finish-load', () => {
    console.log('Window finished loading');
  });
  
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Window failed to load:', errorCode, errorDescription);
  });
}

app.whenReady().then(() => {
  console.log('App is ready, loading memory and profile...');
  loadMemory();
  loadProfile();
  createWindow();
});

app.on('window-all-closed', () => {
  saveMemory(); // Save memory before closing
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});