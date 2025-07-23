const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fetch = require('node-fetch');

const OLLAMA_API_BASE = 'http://localhost:11434/api';

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

ipcMain.handle('get-ai-response', async (_, { message, model }) => {
  try {
    const response = await fetch(`${OLLAMA_API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: message,
        stream: false
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Ollama AI response error:', error);
    return { response: `Error: ${error.message}` };
  }
});

// --- Create Main Window ---
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});