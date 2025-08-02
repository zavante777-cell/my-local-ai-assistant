// Memory management for My Agent Two
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const MEMORY_FILE = path.join(app.getPath('userData'), 'memory.json');

// Default memory structure
const defaultMemory = {
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

let userMemory = { ...defaultMemory };

// Load memory from file
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, 'utf8');
      userMemory = { ...defaultMemory, ...JSON.parse(data) };
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

// Clear all memory
function clearAllMemory() {
  userMemory = { ...defaultMemory };
  saveMemory();
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

module.exports = {
  userMemory,
  loadMemory,
  saveMemory,
  clearAllMemory,
  trackBehavior,
  buildMemoryContext,
  extractTopic
}; 