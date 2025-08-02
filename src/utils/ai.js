// AI utilities for My Agent Two
const { userMemory, trackBehavior, buildMemoryContext, extractTopic } = require('./memory');

const OLLAMA_API_BASE = 'http://localhost:11434/api';

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
    return 'qwen2.5:0.5b';
  }
  
  // For creative tasks
  if (lowerMessage.includes('write') || lowerMessage.includes('story') || lowerMessage.includes('creative')) {
    return 'qwen2.5:0.5b';
  }
  
  // For fast responses
  if (lowerMessage.includes('quick') || lowerMessage.includes('fast') || lowerMessage.includes('simple')) {
    return 'qwen2.5:0.5b';
  }
  
  // For complex reasoning
  if (lowerMessage.includes('explain') || lowerMessage.includes('why') || lowerMessage.includes('how')) {
    return 'qwen2.5:0.5b';
  }
  
  // For file operations
  if (lowerMessage.includes('file') || lowerMessage.includes('create') || lowerMessage.includes('make')) {
    return 'qwen2.5:0.5b';
  }
  
  // Default to working model
  return 'qwen2.5:0.5b';
}

// Get available models
function getAvailableModels() {
  return [
    'qwen2.5:0.5b',
    'tinyllama:latest'
  ];
}

// Get fastest available model
function getFastestModel() {
  const localModels = ['qwen2.5:0.5b', 'tinyllama', 'llama2:7b-chat-q4_K_M', 'phi3:mini', 'mistral', 'llama3'];
  const speedOrder = ['qwen2.5:0.5b', 'tinyllama', 'llama2:7b-chat-q4_K_M', 'phi3:mini', 'mistral', 'llama3'];
  
  for (const model of speedOrder) {
    if (localModels.includes(model)) {
      return model;
    }
  }
  return 'qwen2.5:0.5b';
}

// Get conversation history for better context
function getConversationHistory() {
  // localStorage is not available in main process, so we'll skip this for now
  return '';
}

module.exports = {
  OLLAMA_API_BASE,
  spellcheck,
  getSpeedParams,
  getRecommendedModel,
  getAvailableModels,
  getFastestModel,
  getConversationHistory
}; 