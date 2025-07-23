const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD] Loading preload script...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAIResponse: (prompt, model) => {
    console.log('[PRELOAD] getAIResponse called with:', { prompt, model });
    return ipcRenderer.invoke('get-ai-response', prompt, model);
  },
  
  testOllamaConnection: () => {
    console.log('[PRELOAD] testOllamaConnection called');
    return ipcRenderer.invoke('test-ollama-connection');
  },
  
  // Future API methods for memory/learning features
  saveMemory: (memoryData) => ipcRenderer.invoke('save-memory', memoryData),
  loadMemory: () => ipcRenderer.invoke('load-memory'),
  
  // Add other API methods here as needed
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
});

console.log('[PRELOAD] Preload script loaded successfully! API exposed to window.electronAPI');