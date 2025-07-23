const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  testOllamaConnection: () => ipcRenderer.invoke('test-ollama-connection'),
  getAIResponse: (message, model) => ipcRenderer.invoke('get-ai-response', { message, model }),
  // Add other methods you need
});