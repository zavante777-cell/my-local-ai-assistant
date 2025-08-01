const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const OLLAMA_API_BASE = 'http://localhost:11434/api';
const MEMORY_FILE = path.join(app.getPath('userData'), 'memory.json');
const BEHAVIOR_FILE = path.join(app.getPath('userData'), 'behavior.json');

// Security: Allowed commands whitelist
const ALLOWED_COMMANDS = [
  'npm', 'node', 'git', 'echo', 'dir', 'ls', 'cat', 'type',
  'python', 'python3', 'pip', 'pip3', 'npm install', 'npm run',
  'cd', 'pwd', 'whoami', 'date', 'time', 'echo %PATH%'
];

// Security: Allowed file extensions for editing
const ALLOWED_FILE_EXTENSIONS = [
  '.js', '.ts', '.html', '.css', '.json', '.txt', '.md',
  '.py', '.java', '.cpp', '.c', '.h', '.xml', '.yaml', '.yml'
];

// Security: Check if command is allowed
function isCommandAllowed(command) {
  const lowerCommand = command.toLowerCase();
  return ALLOWED_COMMANDS.some(allowed => 
    lowerCommand.startsWith(allowed.toLowerCase())
  );
}

// Security: Check if file path is safe
function isFilePathSafe(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_FILE_EXTENSIONS.includes(ext) && 
         !filePath.includes('..') && 
         !filePath.includes('\\') &&
         (filePath.startsWith('./') || filePath.startsWith('src/') || !filePath.includes('/'));
}

// Execute terminal command safely
async function executeCommand(command) {
  if (!isCommandAllowed(command)) {
    throw new Error(`Command not allowed: ${command}`);
  }
  
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${error.message}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Read file safely
async function readFile(filePath) {
  if (!isFilePathSafe(filePath)) {
    throw new Error(`File path not allowed: ${filePath}`);
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { content, path: filePath };
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

// Write file safely
async function writeFile(filePath, content) {
  if (!isFilePathSafe(filePath)) {
    throw new Error(`File path not allowed: ${filePath}`);
  }
  
  try {
    // Create backup
    const backupPath = `${filePath}.backup.${Date.now()}`;
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, backupPath };
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
}

// Clear all memory
function clearAllMemory() {
  userMemory = {
    chatHistory: [],
    preferences: {
      preferredModel: 'llama3',
      theme: 'anime',
      responseStyle: 'friendly',
      devMode: false,
      codeExecution: false,
      fileEditing: false
    },
    behavior: {
      totalMessages: 0,
      averageResponseTime: 0,
      commonTopics: [],
      activeHours: {}
    }
  };
  saveMemory();
}

// Memory management
let userMemory = {
  chatHistory: [],
  preferences: {
    preferredModel: 'llama3',
    theme: 'anime',
    responseStyle: 'friendly'
  },
  behavior: {
    totalMessages: 0,
    averageResponseTime: 0,
    commonTopics: [],
    activeHours: {}
  }
};

// Load memory from file
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, 'utf8');
      userMemory = { ...userMemory, ...JSON.parse(data) };
      console.log('Memory loaded successfully');
    }
  } catch (error) {
    console.error('Error loading memory:', error);
  }
}

// Save memory to file
function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(userMemory, null, 2));
    console.log('Memory saved successfully');
  } catch (error) {
    console.error('Error saving memory:', error);
  }
}

// Track user behavior
function trackBehavior(action, data = {}) {
  const now = new Date();
  const hour = now.getHours();
  
  userMemory.behavior.totalMessages++;
  userMemory.behavior.activeHours[hour] = (userMemory.behavior.activeHours[hour] || 0) + 1;
  
  if (data.topic) {
    const topic = data.topic.toLowerCase();
    const existingTopic = userMemory.behavior.commonTopics.find(t => t.name === topic);
    if (existingTopic) {
      existingTopic.count++;
    } else {
      userMemory.behavior.commonTopics.push({ name: topic, count: 1 });
    }
    // Sort by count
    userMemory.behavior.commonTopics.sort((a, b) => b.count - a.count);
    // Keep only top 10
    userMemory.behavior.commonTopics = userMemory.behavior.commonTopics.slice(0, 10);
  }
  
  saveMemory();
}

// Simple spellcheck function
function spellcheck(text) {
  const commonTypos = {
    'teh': 'the',
    'recieve': 'receive',
    'seperate': 'separate',
    'definately': 'definitely',
    'occured': 'occurred',
    'neccessary': 'necessary',
    'accomodate': 'accommodate',
    'begining': 'beginning',
    'beleive': 'believe',
    'calender': 'calendar'
  };
  
  let corrected = text;
  for (const [typo, correct] of Object.entries(commonTypos)) {
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    corrected = corrected.replace(regex, correct);
  }
  
  return corrected;
}

// Get speed optimization parameters for each model
function getSpeedParams(model, speedMode = 'balanced') {
  const baseConfigs = {
    'qwen2.5:0.5b': { num_predict: 128, temperature: 0.6, top_p: 0.9, repeat_penalty: 1.1 },
    'tinyllama:latest': { num_predict: 256, temperature: 0.7, top_p: 0.9, repeat_penalty: 1.1 }
  };
  const config = baseConfigs[model] || baseConfigs['qwen2.5:0.5b'];
  switch (speedMode) {
    case 'fast': config.num_predict = Math.floor(config.num_predict * 0.5); config.temperature = 0.6; break;
    case 'quality': config.num_predict = Math.floor(config.num_predict * 1.5); config.temperature = 0.9; break;
    case 'balanced': default: break;
  }
  return config;
}

// Get recommended model based on task
function getRecommendedModel(message) {
  const lowerMessage = message.toLowerCase();
  
  // For coding tasks
  if (lowerMessage.includes('code') || lowerMessage.includes('program') || lowerMessage.includes('function')) {
    return 'qwen2.5:0.5b'; // Use working model for coding
  }
  
  // For creative tasks
  if (lowerMessage.includes('write') || lowerMessage.includes('story') || lowerMessage.includes('creative')) {
    return 'qwen2.5:0.5b'; // Use working model for creative tasks
  }
  
  // For fast responses
  if (lowerMessage.includes('quick') || lowerMessage.includes('fast') || lowerMessage.includes('simple')) {
    return 'qwen2.5:0.5b'; // Fastest working model
  }
  
  // For complex reasoning
  if (lowerMessage.includes('explain') || lowerMessage.includes('why') || lowerMessage.includes('how')) {
    return 'qwen2.5:0.5b'; // Use working model for reasoning
  }
  
  // For file operations
  if (lowerMessage.includes('file') || lowerMessage.includes('create') || lowerMessage.includes('make')) {
    return 'qwen2.5:0.5b'; // Use working model for tasks
  }
  
  // Default to working model
  return 'qwen2.5:0.5b';
}

// Get available models (check what's actually installed)
function getAvailableModels() {
  return [
    'qwen2.5:0.5b',
    'tinyllama:latest'
    // Removed memory-hungry models that cause HTTP 500 errors
  ];
}

// Enhanced AI response with memory context and streaming
async function getEnhancedAIResponse(message, model, speedMode = 'balanced') {
  try {
    console.log(`Attempting to get AI response with model: ${model}, speedMode: ${speedMode}`);
    
    // Spellcheck the message
    const correctedMessage = spellcheck(message);
    const wasCorrected = correctedMessage !== message;
    
    // Get recommended model if using auto-selection
    if (model === 'auto') {
      model = getRecommendedModel(correctedMessage);
      console.log(`Auto-selected model: ${model}`);
    }
    
    // Build context from memory
    const context = buildMemoryContext();
    
    // Check for dev mode commands
    const devCommands = await handleDevCommands(correctedMessage);
    if (devCommands.shouldExecute) {
      console.log('Executing dev command instead of AI response');
      return devCommands.response;
    }
    
    // Get conversation history for better context
    const conversationHistory = getConversationHistory();
    
    // Create enhanced prompt with conversation history
    const enhancedPrompt = `${context}\n\n${conversationHistory}\n\nUser: ${correctedMessage}\nAssistant:`;
    
    // Handle ensemble mode
    if (model === 'ensemble') {
      console.log('Using ensemble mode');
      const availableModels = getAvailableModels();
      const result = await getEnsembleResponse(enhancedPrompt, availableModels, speedMode);
      
      // Track behavior
      trackBehavior('message_sent', {
        topic: extractTopic(correctedMessage),
        model: 'ensemble',
        models: result.models,
        speedMode: speedMode,
        wasCorrected: wasCorrected
      });
      
      return {
        response: result.response,
        corrected: wasCorrected ? correctedMessage : null,
        original: wasCorrected ? message : null
      };
    }
    
    // Speed optimization parameters
    const speedParams = getSpeedParams(model, speedMode);
    console.log(`Using speed params for ${model}:`, speedParams);
    
    const requestBody = {
      model,
      prompt: enhancedPrompt,
      stream: false, // We'll implement streaming in the renderer
      options: speedParams
    };
    
    console.log(`Sending request to Ollama with model: ${model}`);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${OLLAMA_API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`Ollama response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama error response: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Ollama response received successfully');
    
    // Track behavior
    trackBehavior('message_sent', {
      topic: extractTopic(correctedMessage),
      model: model,
      speedMode: speedMode,
      wasCorrected: wasCorrected
    });
    
    return {
      response: result.response,
      corrected: wasCorrected ? correctedMessage : null,
      original: wasCorrected ? message : null
    };
    
  } catch (error) {
    console.error('Enhanced AI response error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      model: model,
      speedMode: speedMode
    });
    return { response: `Error: ${error.message}` };
  }
}

// Model ensemble system
async function getEnsembleResponse(message, models, speedMode = 'balanced') {
  try {
    const responses = [];
    const promises = models.map(async (model) => {
      try {
        const response = await fetch(`${OLLAMA_API_BASE}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt: message,
            stream: false,
            options: getSpeedParams(model, speedMode)
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          return { model, response: result.response, success: true };
        }
      } catch (error) {
        console.error(`Model ${model} failed:`, error);
        return { model, response: null, success: false };
      }
    });
    
    const results = await Promise.all(promises);
    const successfulResponses = results.filter(r => r.success);
    
    if (successfulResponses.length === 0) {
      throw new Error('All models failed to respond');
    }
    
    // Combine responses intelligently
    const combinedResponse = combineResponses(successfulResponses);
    
    return {
      response: combinedResponse,
      models: successfulResponses.map(r => r.model),
      totalModels: results.length
    };
    
  } catch (error) {
    console.error('Ensemble response error:', error);
    return { response: `Error: ${error.message}` };
  }
}

// Combine multiple model responses intelligently
function combineResponses(responses) {
  if (responses.length === 1) {
    return responses[0].response;
  }
  
  // For multiple responses, create a summary
  const responseTexts = responses.map(r => r.response);
  const summary = `🤖 **Ensemble Response** (${responses.length} models)\n\n`;
  
  // Take the longest response as primary, others as alternatives
  const sortedResponses = responseTexts.sort((a, b) => b.length - a.length);
  const primary = sortedResponses[0];
  const alternatives = sortedResponses.slice(1);
  
  let combined = summary + primary;
  
  if (alternatives.length > 0) {
    combined += '\n\n**Alternative perspectives:**\n';
    alternatives.forEach((alt, index) => {
      combined += `\n${index + 1}. ${alt.substring(0, 100)}...`;
    });
  }
  
  return combined;
}

// Handle dev mode commands
async function handleDevCommands(message) {
  const lowerMessage = message.toLowerCase();
  if (!userMemory.preferences.devMode) { return { shouldExecute: false }; }

  // File creation commands
  if (lowerMessage.includes('make a text file') || 
      lowerMessage.includes('create a text file') ||
      lowerMessage.includes('make an text file') ||
      lowerMessage.includes('create an text file') ||
      lowerMessage.includes('make a file') ||
      lowerMessage.includes('create a file')) {
    
    if (userMemory.preferences.fileEditing) {
      try {
        const timestamp = Date.now();
        const fileName = `textfile_${timestamp}.txt`;
        const content = `# Text File Created by AI Assistant\n\nCreated on: ${new Date().toLocaleString()}\n\nThis file was created automatically based on your request.`;
        const result = await writeFile(fileName, content);
        return { 
          shouldExecute: true, 
          response: { 
            response: `✅ **Text file created successfully!**\n\n📄 **File:** ${fileName}\n📍 **Location:** ${process.cwd()}\n\n**Content:**\n\`\`\`\n${content}\n\`\`\`\n\nYou can now edit this file or ask me to modify it!`, 
            corrected: null, 
            original: null 
          } 
        };
      } catch (error) {
        return { 
          shouldExecute: true, 
          response: { 
            response: `❌ Failed to create text file: ${error.message}`, 
            corrected: null, 
            original: null 
          } 
        };
      }
    } else {
      return { 
        shouldExecute: true, 
        response: { 
          response: `⚠️ **File editing is disabled!**\n\nTo create files, enable file editing in Settings → Development Mode → File Editing`, 
          corrected: null, 
          original: null 
        } 
      };
    }
  }

  // Command execution
  if (lowerMessage.includes('run command') || lowerMessage.includes('execute command')) {
    if (userMemory.preferences.codeExecution) {
      const command = message.replace(/run command|execute command/gi, '').trim();
      if (command && isCommandAllowed(command)) {
        try {
          const result = await executeCommand(command);
          return { 
            shouldExecute: true, 
            response: { 
              response: `✅ **Command executed successfully!**\n\n\`\`\`bash\n${command}\n\`\`\`\n\n**Output:**\n\`\`\`\n${result}\n\`\`\``, 
              corrected: null, 
              original: null 
            } 
          };
        } catch (error) {
          return { 
            shouldExecute: true, 
            response: { 
              response: `❌ Command failed: ${error.message}`, 
              corrected: null, 
              original: null 
            } 
          };
        }
      } else {
        return { 
          shouldExecute: true, 
          response: { 
            response: `⚠️ **Command not allowed!**\n\nFor security reasons, only basic commands are allowed.`, 
            corrected: null, 
            original: null 
          } 
        };
      }
    } else {
      return { 
        shouldExecute: true, 
        response: { 
          response: `⚠️ **Code execution is disabled!**\n\nTo run commands, enable code execution in Settings → Development Mode → Code Execution`, 
          corrected: null, 
          original: null 
        } 
      };
    }
  }

  return { shouldExecute: false };
}

// Build context from user memory
function buildMemoryContext() {
  const context = [];
  
  // Add user preferences
  context.push(`User prefers: ${userMemory.preferences.responseStyle} responses`);
  
  // Add common topics
  if (userMemory.behavior.commonTopics.length > 0) {
    const topTopics = userMemory.behavior.commonTopics.slice(0, 3);
    context.push(`User often discusses: ${topTopics.map(t => t.name).join(', ')}`);
  }
  
  // Add active hours
  const activeHours = Object.entries(userMemory.behavior.activeHours)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => hour);
  
  if (activeHours.length > 0) {
    context.push(`User is most active during hours: ${activeHours.join(', ')}`);
  }
  
  return context.join('. ') + '.';
}

// Extract topic from message
function extractTopic(message) {
  const topics = ['coding', 'programming', 'anime', 'music', 'games', 'work', 'study', 'help', 'question'];
  const lowerMessage = message.toLowerCase();
  
  for (const topic of topics) {
    if (lowerMessage.includes(topic)) {
      return topic;
    }
  }
  
  return 'general';
}

// Alternative model backends for speed
const MODEL_BACKENDS = {
  local: {
    baseUrl: 'http://localhost:11434/api',
    models: ['qwen2.5:0.5b', 'tinyllama', 'llama2:7b-chat-q4_K_M', 'phi3:mini', 'mistral', 'llama3']
  },
  // Add cloud options for speed
  cloud: {
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-3.5-turbo', 'gpt-4']
  }
};

// Check if cloud API is available (for speed fallback)
async function checkCloudAPI() {
  // This would check if you have API keys configured
  return false; // For now, keep it local
}

// Get fastest available model
function getFastestModel() {
  const localModels = MODEL_BACKENDS.local.models;
  // Prioritize by size (smaller = faster)
  const speedOrder = ['qwen2.5:0.5b', 'tinyllama', 'llama2:7b-chat-q4_K_M', 'phi3:mini', 'mistral', 'llama3'];
  
  for (const model of speedOrder) {
    if (localModels.includes(model)) {
      return model;
    }
  }
  return 'qwen2.5:0.5b'; // Default to fastest
}

// Model training infrastructure
const TRAINING_CONFIG = {
  baseModel: 'qwen2.5:0.5b', // Start with fastest model
  trainingData: [],
  maxTrainingExamples: 1000,
  trainingEnabled: false
};

// Export chat history for training
function exportChatHistoryForTraining() {
  const savedChats = JSON.parse(localStorage.getItem('chatHistoryList') || '[]');
  const trainingData = [];
  
  savedChats.forEach(chat => {
    if (chat.messages && chat.messages.length > 0) {
      // Convert to training format
      const conversation = chat.messages.map(msg => ({
        role: msg.className.includes('user-message') ? 'user' : 'assistant',
        content: msg.text
      }));
      
      trainingData.push({
        messages: conversation,
        metadata: {
          date: chat.date,
          title: chat.title
        }
      });
    }
  });
  
  return trainingData;
}

// Prepare training dataset
function prepareTrainingDataset() {
  const chatData = exportChatHistoryForTraining();
  
  if (chatData.length === 0) {
    return null;
  }
  
  // Convert to fine-tuning format
  const trainingExamples = chatData.map(chat => {
    const messages = chat.messages;
    if (messages.length < 2) return null;
    
    // Create training pairs
    const pairs = [];
    for (let i = 0; i < messages.length - 1; i += 2) {
      if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
        pairs.push({
          instruction: messages[i].content,
          response: messages[i + 1].content
        });
      }
    }
    
    return pairs;
  }).flat().filter(Boolean);
  
  return trainingExamples.slice(0, TRAINING_CONFIG.maxTrainingExamples);
}

// Get conversation history for better context
function getConversationHistory() {
  // localStorage is not available in main process, so we'll skip this for now
  // The conversation history will be handled in the renderer process
  return '';
}

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
  return await getEnhancedAIResponse(message, model, speedMode);
});

// New IPC handlers for memory management
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

// Training IPC handlers
ipcMain.handle('export-training-data', async () => {
  const trainingData = exportChatHistoryForTraining();
  return {
    success: true,
    data: trainingData,
    count: trainingData.length
  };
});

ipcMain.handle('prepare-training-dataset', async () => {
  const dataset = prepareTrainingDataset();
  return {
    success: !!dataset,
    dataset: dataset,
    count: dataset ? dataset.length : 0
  };
});

ipcMain.handle('get-fastest-model', () => {
  return getFastestModel();
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
  console.log('App is ready, loading memory...');
  loadMemory();
  createWindow();
});

app.on('window-all-closed', () => {
  saveMemory(); // Save memory before closing
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});