// Global state
let isConnected = false;
let availableModels = [];
let currentModel = 'llama3';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing app...');
  
  // Get elements with null checks
  const startScreen = document.getElementById('start-screen');
  const chatScreen = document.getElementById('chat-screen');
  const startButton = document.getElementById('start-button');
  const backButton = document.getElementById('back-button');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const chatLog = document.getElementById('chat-log');
  const modelDropdown = document.getElementById('model-dropdown');

  console.log('Elements found:', {
    startScreen: !!startScreen,
    chatScreen: !!chatScreen,
    startButton: !!startButton,
    backButton: !!backButton,
    userInput: !!userInput,
    sendButton: !!sendButton,
    chatLog: !!chatLog,
    modelDropdown: !!modelDropdown
  });

  // Check if all elements exist
  if (!startScreen || !chatScreen || !startButton || !backButton || 
      !userInput || !sendButton || !chatLog || !modelDropdown) {
    console.error('Critical UI elements missing!');
    return;
  }

  // Start button click
  if (startButton) {
    startButton.addEventListener('click', () => {
      console.log('Start button clicked');
      if (startScreen && chatScreen) {
        startScreen.style.display = 'none';
        chatScreen.style.display = 'flex';
        if (userInput) userInput.focus();
      }
    });
  }

  // Back button click
  if (backButton) {
    backButton.addEventListener('click', () => {
      console.log('Back button clicked');
      if (chatScreen && startScreen && chatLog) {
        chatScreen.style.display = 'none';
        startScreen.style.display = 'flex';
        chatLog.innerHTML = ''; // Clear chat log
      }
    });
  }

  // Send button click
  if (sendButton) {
    sendButton.addEventListener('click', () => {
      console.log('Send button clicked');
      sendMessage();
    });
  }

  // Enter key press
  if (userInput) {
    userInput.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && e.ctrlKey)) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Simple send message function
  function sendMessage() {
    if (!userInput || !chatLog) return;
    
    const message = userInput.value.trim();
    if (!message) return;
    
    console.log('Sending message:', message);
    userInput.value = '';
    addMessageToChat(message, 'user-message');
    
    // Simple fake response for testing
    setTimeout(() => {
      addMessageToChat('🤖 This is a test response!', 'ai-message');
    }, 1000);
  }

  // Add message to chat
  function addMessageToChat(message, className) {
    if (!chatLog) return null;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.textContent = message;
    chatLog.appendChild(messageDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
    return messageDiv;
  }

  console.log('App initialization complete');
});