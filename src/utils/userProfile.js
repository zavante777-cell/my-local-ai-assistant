// User Profile System - Learns mannerisms and intent patterns
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const PROFILE_FILE = path.join(app.getPath('userData'), 'userProfile.json');

// Default profile structure
const defaultProfile = {
  communication: {
    style: 'casual', // casual, formal, technical, creative
    commonPhrases: [],
    intentPatterns: [],
    appReferences: {},
    fileTypePreferences: {}
  },
  intentMapping: {
    // Maps user phrases to actual intents
    'make a text file in microsoft word': 'open_word_document',
    'create a word doc': 'open_word_document',
    'open word': 'open_word_document',
    'create document': 'create_word_document',
    'make document': 'create_word_document',
    'new document': 'create_word_document',
    'edit that file': 'edit_last_file',
    'open that file': 'open_last_file',
    'put a link in it': 'add_link_to_file',
    'add chatgbt link': 'add_chatgpt_link'
  },
  appPreferences: {
    textEditor: 'notepad', // Default, can be changed
    wordProcessor: 'microsoft_word',
    browser: 'default',
    fileManager: 'explorer'
  },
  learning: {
    successfulRequests: [],
    failedRequests: [],
    corrections: [],
    userFeedback: []
  }
};

let userProfile = { ...defaultProfile };

// Load profile from file
function loadProfile() {
  try {
    if (fs.existsSync(PROFILE_FILE)) {
      const data = fs.readFileSync(PROFILE_FILE, 'utf8');
      userProfile = { ...defaultProfile, ...JSON.parse(data) };
      console.log('User profile loaded successfully');
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// Save profile to file
function saveProfile() {
  try {
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(userProfile, null, 2));
    console.log('User profile saved successfully');
  } catch (error) {
    console.error('Error saving profile:', error);
  }
}

// Learn from user interaction
function learnFromInteraction(message, intent, success, feedback = '') {
  const interaction = {
    timestamp: new Date().toISOString(),
    message: message.toLowerCase(),
    intent: intent,
    success: success,
    feedback: feedback
  };

  if (success) {
    userProfile.learning.successfulRequests.push(interaction);
    // Learn successful patterns
    if (!userProfile.intentMapping[message]) {
      userProfile.intentMapping[message] = intent;
    }
  } else {
    userProfile.learning.failedRequests.push(interaction);
  }

  // Track common phrases
  const words = message.toLowerCase().split(' ');
  words.forEach(word => {
    if (word.length > 2) { // Ignore short words
      const existing = userProfile.communication.commonPhrases.find(p => p.phrase === word);
      if (existing) {
        existing.count++;
      } else {
        userProfile.communication.commonPhrases.push({ phrase: word, count: 1 });
      }
    }
  });

  // Sort phrases by frequency
  userProfile.communication.commonPhrases.sort((a, b) => b.count - a.count);
  userProfile.communication.commonPhrases = userProfile.communication.commonPhrases.slice(0, 50);

  saveProfile();
}

// Understand user intent based on learned patterns
function understandIntent(message) {
  const lowerMessage = message.toLowerCase();
  
  // Check exact matches first
  if (userProfile.intentMapping[lowerMessage]) {
    return {
      intent: userProfile.intentMapping[lowerMessage],
      confidence: 0.9,
      method: 'exact_match'
    };
  }

  // Check partial matches
  for (const [pattern, intent] of Object.entries(userProfile.intentMapping)) {
    if (lowerMessage.includes(pattern) || pattern.includes(lowerMessage)) {
      return {
        intent: intent,
        confidence: 0.7,
        method: 'partial_match'
      };
    }
  }

  // Pattern matching based on keywords (more specific matching)
  const patterns = [
    { pattern: 'microsoft word', intent: 'open_word_document' },
    { pattern: 'word', intent: 'open_word_document' },
    { pattern: 'document', intent: 'create_word_document' },
    { pattern: 'text file', intent: 'create_text_file' },
    { pattern: 'edit file', intent: 'edit_file' },
    { pattern: 'open file', intent: 'open_file' },
    { pattern: 'link', intent: 'add_link' },
    { pattern: 'chatgbt', intent: 'add_chatgpt_link' },
    { pattern: 'chatgpt', intent: 'add_chatgpt_link' }
  ];

  for (const { pattern, intent } of patterns) {
    if (lowerMessage.includes(pattern)) {
      return {
        intent: intent,
        confidence: 0.6,
        method: 'keyword_match'
      };
    }
  }

  // Context-based guessing
  const contextIntent = guessFromContext(lowerMessage);
  if (contextIntent) {
    return {
      intent: contextIntent,
      confidence: 0.4,
      method: 'context_guess'
    };
  }

  return {
    intent: 'unknown',
    confidence: 0.1,
    method: 'unknown'
  };
}

// Guess intent from context
function guessFromContext(message) {
  const recentRequests = userProfile.learning.successfulRequests.slice(-5);
  
  // If user recently worked with files, they might want to edit
  if (recentRequests.some(r => r.intent.includes('file'))) {
    if (message.includes('edit') || message.includes('change') || message.includes('add')) {
      return 'edit_last_file';
    }
  }

  // If user mentioned Word recently, they might want Word again
  if (recentRequests.some(r => r.intent.includes('word'))) {
    if (message.includes('file') || message.includes('document')) {
      return 'open_word_document';
    }
  }

  return null;
}

// Get user's preferred app for a task
function getPreferredApp(task) {
  const appMap = {
    'text_editing': userProfile.appPreferences.textEditor,
    'word_processing': userProfile.appPreferences.wordProcessor,
    'web_browsing': userProfile.appPreferences.browser,
    'file_management': userProfile.appPreferences.fileManager
  };

  return appMap[task] || 'default';
}

// Update app preferences based on user feedback
function updateAppPreference(task, app) {
  const preferenceMap = {
    'text_editing': 'textEditor',
    'word_processing': 'wordProcessor',
    'web_browsing': 'browser',
    'file_management': 'fileManager'
  };

  const preference = preferenceMap[task];
  if (preference) {
    userProfile.appPreferences[preference] = app;
    saveProfile();
  }
}

// Get communication style insights
function getCommunicationInsights() {
  const insights = {
    style: userProfile.communication.style,
    commonWords: userProfile.communication.commonPhrases.slice(0, 10),
    successRate: userProfile.learning.successfulRequests.length / 
                (userProfile.learning.successfulRequests.length + userProfile.learning.failedRequests.length) * 100
  };

  return insights;
}

// Add correction when user corrects the AI
function addCorrection(originalMessage, correctedIntent, userFeedback) {
  const correction = {
    timestamp: new Date().toISOString(),
    originalMessage,
    correctedIntent,
    userFeedback
  };

  userProfile.learning.corrections.push(correction);
  
  // Update intent mapping with the correction
  userProfile.intentMapping[originalMessage.toLowerCase()] = correctedIntent;
  
  saveProfile();
}

module.exports = {
  userProfile,
  loadProfile,
  saveProfile,
  learnFromInteraction,
  understandIntent,
  getPreferredApp,
  updateAppPreference,
  getCommunicationInsights,
  addCorrection
}; 