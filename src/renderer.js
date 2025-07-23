// Import CSS
import './index.css';

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
  const connectionStatus = document.getElementById('connection-status');

  // Check if all elements exist
  if (!startScreen || !chatScreen || !startButton || !backButton || 
      !userInput || !sendButton || !chatLog || !modelDropdown) {
    console.error('Critical UI elements missing!');
    return;
  }

  // Initialize the app
  initializeApp();

  async function initializeApp() {
    console.log('Initializing app...');
    
    // Test connection and load models
    if (window.electronAPI) {
      try {
        const connectionResult = await window.electronAPI.testOllamaConnection();
        
        if (connectionResult.success) {
          isConnected = true;
          availableModels = connectionResult.models;
          updateModelDropdown();
          updateConnectionStatus('Connected to Ollama ✅', 'success');
        } else {
          isConnected = false;
          updateConnectionStatus(`Connection failed: ${connectionResult.error}`, 'error');
        }
      } catch (error) {
        console.error('Failed to test connection:', error);
        updateConnectionStatus('Failed to test connection', 'error');
      }
    } else {
      console.error('electronAPI not available!');
      updateConnectionStatus('ElectronAPI not available', 'error');
    }
  }

  function updateModelDropdown() {
    if (!modelDropdown) return;
    
    // Clear existing options
    modelDropdown.innerHTML = '';
    
    if (availableModels.length === 0) {
      const option = document.createElement('option');
      option.value = 'llama3';
      option.textContent = 'LLaMA 3 (default)';
      modelDropdown.appendChild(option);
    } else {
      availableModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = `${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)`;
        modelDropdown.appendChild(option);
      });
    }
    
    // Set current model
    modelDropdown.value = currentModel;
  }

  function updateConnectionStatus(message, type) {
    if (connectionStatus) {
      connectionStatus.textContent = message;
      connectionStatus.className = `connection-status ${type}`;
    } else {
      // If no connection status element, show in console
      console.log(`Connection Status: ${message}`);
    }
  }

  // Start button click
  if (startButton) {
    startButton.addEventListener('click', () => {
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
      if (chatScreen && startScreen && chatLog) {
        chatScreen.style.display = 'none';
        startScreen.style.display = 'flex';
        chatLog.innerHTML = ''; // Clear chat log
      }
    });
  }

  // Model dropdown change
  if (modelDropdown) {
    modelDropdown.addEventListener('change', (e) => {
      currentModel = e.target.value;
      console.log('Model changed to:', currentModel);
    });
  }

  // Persistent chat history
  function saveChatHistory() {
    if (!chatLog) return;
    const messages = Array.from(chatLog.children).map(div => ({
      text: div.textContent,
      className: div.className
    }));
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }

  function loadChatHistory() {
    if (!chatLog) return;
    const messages = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    chatLog.innerHTML = '';
    messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = msg.className;
      div.textContent = msg.text;
      chatLog.appendChild(div);
    });
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  loadChatHistory();

  // Send message function
  async function sendMessage() {
    if (!userInput || !chatLog) return;
    
    const message = userInput.value.trim();
    if (!message) return;
    
    userInput.value = '';
    addMessageToChat(message, 'user-message');
    
    // Check connection status
    if (!isConnected) {
      addMessageToChat('⚠️ Not connected to Ollama. Please make sure Ollama is running with "ollama serve".', 'ai-message error');
      return;
    }
    
    // Show typing indicator
    const typingDiv = addMessageToChat('🤖 AI is thinking...', 'ai-message typing');
    
    // Disable input while processing
    if (sendButton) sendButton.disabled = true;
    if (userInput) userInput.disabled = true;
    
    try {
      if (window.electronAPI && window.electronAPI.getAIResponse) {
        const response = await window.electronAPI.getAIResponse(message, currentModel);
        
        // Remove typing indicator
        if (typingDiv && typingDiv.parentNode) {
          typingDiv.remove();
        }
        
        // Add AI response
        // Only display the AI's message text (Ollama returns { response: "..." })
        addMessageToChat(response.response || JSON.stringify(response), 'ai-message');
      } else {
        // Fallback if electronAPI is not available
        if (typingDiv && typingDiv.parentNode) {
          typingDiv.remove();
        }
        addMessageToChat('❌ ElectronAPI not available. Please restart the application.', 'ai-message error');
      }
    } catch (error) {
      console.error('AI Error:', error);
      if (typingDiv && typingDiv.parentNode) {
        typingDiv.remove();
      }
      addMessageToChat(`❌ Error: ${error.message}`, 'ai-message error');
    } finally {
      // Re-enable input
      if (sendButton) sendButton.disabled = false;
      if (userInput) {
        userInput.disabled = false;
        userInput.focus();
      }
    }
  }

  // Add message to chat
  function addMessageToChat(message, className) {
    if (!chatLog) return null;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.textContent = message;
    chatLog.appendChild(messageDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
    saveChatHistory();
    return messageDiv;
  }

  // Send button click
  if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
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

  console.log('App initialization complete');
});