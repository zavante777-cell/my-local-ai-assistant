// Intent Handler - Executes actions based on understood user intent
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { app, clipboard } = require('electron');
const { understandIntent, learnFromInteraction, getPreferredApp, addCorrection } = require('./userProfile');

// Track last created files for context
let lastCreatedFiles = [];
let lastOpenedFiles = [];

// Handle user request with intent understanding
async function handleUserRequest(message) {
  console.log('🤖 Processing request:', message);
  
  // Understand the intent
  const intentResult = understandIntent(message);
  console.log('🎯 Intent detected:', intentResult);
  
  let result = {
    success: false,
    message: '',
    action: intentResult.intent,
    confidence: intentResult.confidence
  };

  try {
    switch (intentResult.intent) {
      case 'open_word_document':
        result = await openMicrosoftWord();
        break;
        
      case 'create_word_document':
        result = await createWordDocument();
        break;
        
      case 'create_text_file':
        result = await createTextFile();
        break;
        
      case 'edit_last_file':
        result = await editLastFile();
        break;
        
      case 'open_last_file':
        result = await openLastFile();
        break;
        
      case 'add_link_to_file':
        result = await addLinkToFile();
        break;
        
      case 'add_chatgpt_link':
        result = await addChatGPTLink();
        break;
        
      case 'edit_file':
        result = await editFile(message);
        break;
        
      case 'open_file':
        result = await openFile(message);
        break;
        
      default:
        result.message = `I'm not sure what you want me to do. Could you rephrase that?`;
        result.confidence = 0.1;
    }
    
    // Learn from this interaction
    learnFromInteraction(message, intentResult.intent, result.success, result.message);
    
    return result;
    
  } catch (error) {
    console.error('Error handling request:', error);
    result.message = `Sorry, I encountered an error: ${error.message}`;
    learnFromInteraction(message, intentResult.intent, false, error.message);
    return result;
  }
}

// Open Microsoft Word and create a new document
async function openMicrosoftWord() {
  return new Promise((resolve) => {
    // Try to open Word with a new document
    exec('start winword.exe /q /n', (error) => {
      if (error) {
        // Try alternative methods
        exec('start "Microsoft Word" "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE" /q /n', (error2) => {
          if (error2) {
            // Try just opening Word normally
            exec('start winword.exe', (error3) => {
              if (error3) {
                resolve({
                  success: false,
                  message: '❌ Could not open Microsoft Word. Please make sure it\'s installed.',
                  action: 'open_word_document'
                });
              } else {
                resolve({
                  success: true,
                  message: '✅ Microsoft Word opened successfully! (New document may not have been created automatically)',
                  action: 'open_word_document'
                });
              }
            });
          } else {
            resolve({
              success: true,
              message: '✅ Microsoft Word opened with new document!',
              action: 'open_word_document'
            });
          }
        });
      } else {
        resolve({
          success: true,
          message: '✅ Microsoft Word opened with new document!',
          action: 'open_word_document'
        });
      }
    });
  });
}

// Create a Word document specifically
async function createWordDocument() {
  return new Promise((resolve) => {
    // Try to open Word with a new document using different methods
    exec('start winword.exe /q /n', (error) => {
      if (error) {
        // Try alternative method
        exec('start "Microsoft Word" "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE" /q /n', (error2) => {
          if (error2) {
            // Try just opening Word normally
            exec('start winword.exe', (error3) => {
              if (error3) {
                resolve({
                  success: false,
                  message: '❌ Could not create Word document. Please make sure Microsoft Word is installed.',
                  action: 'create_word_document'
                });
              } else {
                resolve({
                  success: true,
                  message: '✅ Microsoft Word opened! You can create a new document manually.',
                  action: 'create_word_document'
                });
              }
            });
          } else {
            resolve({
              success: true,
              message: '✅ New Word document created successfully!',
              action: 'create_word_document'
            });
          }
        });
      } else {
        resolve({
          success: true,
          message: '✅ New Word document created successfully!',
          action: 'create_word_document'
        });
      }
    });
  });
}

// Create a text file
async function createTextFile() {
  const timestamp = Date.now();
  const fileName = `textfile_${timestamp}.txt`;
  const filePath = path.join(app.getPath('userData'), fileName);
  
  const content = `# Text File Created by AI Assistant
Created on: ${new Date().toLocaleString()}
This file was created automatically based on your request.`;

  try {
    fs.writeFileSync(filePath, content);
    lastCreatedFiles.push(filePath);
    
    return {
      success: true,
      message: `✅ Text file created successfully!\n📄 File: ${fileName}\n📍 Location: ${filePath}\n📝 Content:\n\`\`\`\n${content}\n\`\`\`\nYou can now edit this file or ask me to open it!`,
      action: 'create_text_file',
      filePath: filePath
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to create text file: ${error.message}`,
      action: 'create_text_file'
    };
  }
}

// Edit the last created file
async function editLastFile() {
  if (lastCreatedFiles.length === 0) {
    return {
      success: false,
      message: '❌ No files have been created yet. Please create a file first.',
      action: 'edit_last_file'
    };
  }
  
  const filePath = lastCreatedFiles[lastCreatedFiles.length - 1];
  return await openFileWithDefault(filePath, 'edit');
}

// Open the last created file
async function openLastFile() {
  if (lastCreatedFiles.length === 0) {
    return {
      success: false,
      message: '❌ No files have been created yet. Please create a file first.',
      action: 'open_last_file'
    };
  }
  
  const filePath = lastCreatedFiles[lastCreatedFiles.length - 1];
  return await openFileWithDefault(filePath, 'open');
}

// Add a link to the last file
async function addLinkToFile() {
  if (lastCreatedFiles.length === 0) {
    return {
      success: false,
      message: '❌ No files have been created yet. Please create a file first.',
      action: 'add_link_to_file'
    };
  }
  
  const filePath = lastCreatedFiles[lastCreatedFiles.length - 1];
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    content += '\n\n🔗 Link added: https://example.com';
    
    fs.writeFileSync(filePath, content);
    
    return {
      success: true,
      message: `✅ Link added to file!\n📄 File: ${path.basename(filePath)}\n🔗 Added: https://example.com`,
      action: 'add_link_to_file'
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to add link: ${error.message}`,
      action: 'add_link_to_file'
    };
  }
}

// Add ChatGPT link specifically
async function addChatGPTLink() {
  if (lastCreatedFiles.length === 0) {
    return {
      success: false,
      message: '❌ No files have been created yet. Please create a file first.',
      action: 'add_chatgpt_link'
    };
  }
  
  const filePath = lastCreatedFiles[lastCreatedFiles.length - 1];
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    content += '\n\n🤖 ChatGPT Link: https://chat.openai.com/';
    
    fs.writeFileSync(filePath, content);
    
    return {
      success: true,
      message: `✅ ChatGPT link added to file!\n📄 File: ${path.basename(filePath)}\n🤖 Added: https://chat.openai.com/`,
      action: 'add_chatgpt_link'
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to add ChatGPT link: ${error.message}`,
      action: 'add_chatgpt_link'
    };
  }
}

// Generic file editing
async function editFile(message) {
  // Extract filename from message
  const words = message.toLowerCase().split(' ');
  const fileIndex = words.findIndex(word => word === 'file');
  
  if (fileIndex === -1 || fileIndex === words.length - 1) {
    return {
      success: false,
      message: '❌ Please specify which file you want to edit.',
      action: 'edit_file'
    };
  }
  
  const fileName = words[fileIndex + 1];
  const filePath = path.join(app.getPath('userData'), fileName);
  
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      message: `❌ File "${fileName}" not found.`,
      action: 'edit_file'
    };
  }
  
  return await openFileWithDefault(filePath, 'edit');
}

// Generic file opening
async function openFile(message) {
  const words = message.toLowerCase().split(' ');
  const fileIndex = words.findIndex(word => word === 'file');
  
  if (fileIndex === -1 || fileIndex === words.length - 1) {
    return {
      success: false,
      message: '❌ Please specify which file you want to open.',
      action: 'open_file'
    };
  }
  
  const fileName = words[fileIndex + 1];
  const filePath = path.join(app.getPath('userData'), fileName);
  
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      message: `❌ File "${fileName}" not found.`,
      action: 'open_file'
    };
  }
  
  return await openFileWithDefault(filePath, 'open');
}

// Open file with default application
async function openFileWithDefault(filePath, action) {
  return new Promise((resolve) => {
    exec(`start "" "${filePath}"`, (error) => {
      if (error) {
        resolve({
          success: false,
          message: `❌ Failed to ${action} file: ${error.message}`,
          action: action
        });
      } else {
        lastOpenedFiles.push(filePath);
        resolve({
          success: true,
          message: `✅ File ${action}ed successfully!\n📄 File: ${path.basename(filePath)}`,
          action: action
        });
      }
    });
  });
}

// Add user correction
function addUserCorrection(originalMessage, correctedIntent, feedback) {
  addCorrection(originalMessage, correctedIntent, feedback);
  return {
    success: true,
    message: '✅ Thank you for the correction! I\'ll remember that for next time.',
    action: 'correction'
  };
}

// Copy chat to clipboard on error
function copyChatToClipboard(errorMessage) {
  try {
    const timestamp = new Date().toLocaleString();
    const clipboardText = `My Agent Two - Error Report\n\nTime: ${timestamp}\nError: ${errorMessage}\n\nThis error occurred while using the AI assistant. The chat history has been copied to help with debugging.`;
    
    clipboard.writeText(clipboardText);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// Get intent statistics
function getIntentStats() {
  return {
    lastCreatedFiles: lastCreatedFiles.length,
    lastOpenedFiles: lastOpenedFiles.length,
    recentFiles: lastCreatedFiles.slice(-5).map(f => path.basename(f))
  };
}

module.exports = {
  handleUserRequest,
  addUserCorrection,
  getIntentStats,
  copyChatToClipboard
}; 