const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAIResponse: (prompt) => {
    console.log('Preload: getAIResponse called with:', prompt);
    return ipcRenderer.invoke('get-ai-response', prompt);
  },
  
  // Add other API methods here as needed
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
});

console.log('Preload script loaded successfully!');