const { app, BrowserWindow, ipcMain } = require('electron');
const axios = require('axios');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // Load the index.html of the app.
  if (MAIN_WINDOW_WEBPACK_ENTRY) {
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  }

  // Open the DevTools for debugging
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Real Ollama API handler
ipcMain.handle('get-ai-response', async (_, prompt, model = 'llama3') => {
  console.log(`[MAIN] Getting AI response for: "${prompt}" using model: ${model}`);
  
  try {
    // Check if Ollama is running by testing the API
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2000
      }
    }, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('[MAIN] Got response from Ollama:', response.data.response);
    return response.data.response;

  } catch (error) {
    console.error('[MAIN] Ollama API Error:', error.message);
    
    // More specific error handling
    if (error.code === 'ECONNREFUSED') {
      return `❌ Cannot connect to Ollama. Please make sure:
1. Ollama is installed and running
2. Run: ollama serve
3. Run: ollama pull ${model}

Error: Connection refused to localhost:11434`;
    } else if (error.response && error.response.status === 404) {
      return `❌ Model "${model}" not found. Please run: ollama pull ${model}`;
    } else if (error.code === 'ENOTFOUND') {
      return `❌ Network error. Check if Ollama is running on localhost:11434`;
    } else {
      return `❌ Ollama Error: ${error.message}`;
    }
  }
});

// Test Ollama connection
ipcMain.handle('test-ollama-connection', async () => {
  try {
    const response = await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
    console.log('[MAIN] Ollama models available:', response.data.models?.map(m => m.name));
    return { 
      connected: true, 
      models: response.data.models?.map(m => m.name) || [] 
    };
  } catch (error) {
    console.error('[MAIN] Ollama connection test failed:', error.message);
    return { 
      connected: false, 
      error: error.message 
    };
  }
});