const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
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

// Ollama API handler (fake response for now)
ipcMain.handle('get-ai-response', async (_, prompt) => {
  // For now, return a fake response
  // TODO: Replace with real Ollama call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`This is a fake response to: "${prompt}". Ollama integration coming soon!`);
    }, 1000);
  });
  
  // Uncomment this when Ollama is ready:
  /*
  return new Promise((resolve, reject) => {
    exec(`ollama run llama3 "${prompt}"`, 
      { timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) reject(stderr);
        else resolve(stdout);
      }
    );
  });
  */
});