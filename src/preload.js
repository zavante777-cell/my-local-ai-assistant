const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  testOllamaConnection: () => ipcRenderer.invoke('test-ollama-connection'),
  getAIResponse: (message, model, speedMode) => ipcRenderer.invoke('get-ai-response', { message, model, speedMode }),
  getUserMemory: () => ipcRenderer.invoke('get-user-memory'),
  updateUserPreferences: (preferences) => ipcRenderer.invoke('update-user-preferences', preferences),
  getBehaviorStats: () => ipcRenderer.invoke('get-behavior-stats'),
  // Dev mode functions
  executeCommand: (command, devMode) => ipcRenderer.invoke('execute-command', { command, devMode }),
  readFile: (filePath, devMode) => ipcRenderer.invoke('read-file', { filePath, devMode }),
  writeFile: (filePath, content, devMode) => ipcRenderer.invoke('write-file', { filePath, content, devMode }),
  clearAllMemory: () => ipcRenderer.invoke('clear-all-memory'),
  // Training functions
  exportTrainingData: () => ipcRenderer.invoke('export-training-data'),
  prepareTrainingDataset: () => ipcRenderer.invoke('prepare-training-dataset'),
  getFastestModel: () => ipcRenderer.invoke('get-fastest-model'),
});