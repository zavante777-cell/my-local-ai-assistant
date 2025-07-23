// Import CSS
import './index.css';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[RENDERER] DOM loaded, electronAPI available:', !!window.electronAPI);
  
  // Get elements
  const startScreen = document.getElementById('start-screen');
  const chatScreen = document.getElementById('chat-screen');
  const startButton = document.getElementById('start-button');
  const backButton = document.getElementById('back-button');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const chatLog = document.getElementById('chat-log');
  const modelDropdown = document.getElementById('model-dropdown');

  // Test Ollama connection on startup
  if (window.electronAPI && window.electronAPI.testOllamaConnection) {
    try {
      const connectionTest = await window.electronAPI.testOllamaConnection();
      console.log('[RENDERER] Ollama connection test:', connectionTest);
      
      if (connectionTest.connected && connectionTest.models?.length > 0) {
        // Update model dropdown with available models
        modelDropdown.innerHTML = '';
        connectionTest.models.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model.charAt(0).toUpperCase() + model.slice(1);
          modelDropdown.appendChild(option);
        });
      }
    } catch (error) {
      console.error('[RENDERER] Connection test failed:', error);
    }
  }

  // Start button click
  startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
    userInput.focus();
    
    // Add welcome message
    addMessageToChat('🤖 Hello! I\'m your local AI assistant. How can I help you today?', 'ai-message');
  });

  // Back button click
  backButton.addEventListener('click', () => {
    chatScreen.style.display = 'none';
    startScreen.style.display = 'flex';
    // Clear chat log
    chatLog.innerHTML = '';
  });

  // Send message function
  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    const selectedModel = modelDropdown.value;
    userInput.value = '';
    userInput.disabled = true;
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
    
    addMessageToChat(message, 'user-message');
    
    // Show typing indicator with model info
    const typingDiv = addMessageToChat(`🤖 [${selectedModel.toUpperCase()}] is thinking...`, 'ai-message typing-indicator');
    
    try {
      // Check if electronAPI is available
      if (window.electronAPI && window.electronAPI.getAIResponse) {
        console.log('[RENDERER] Sending message to AI:', message);
        const response = await window.electronAPI.getAIResponse(message, selectedModel);
        console.log('[RENDERER] Got AI response:', response);
        
        // Remove typing indicator
        typingDiv.remove();
        addMessageToChat(response, 'ai-message');
      } else {
        // Fallback fake response if preload didn't work
        console.warn('[RENDERER] electronAPI not available, using fallback');
        setTimeout(() => {
          typingDiv.textContent = '❌ ElectronAPI not loaded. Please restart the app.';
          typingDiv.className = 'message ai-message error-message';
        }, 1000);
      }
    } catch (error) {
      console.error('[RENDERER] AI Error:', error);
      typingDiv.remove();
      addMessageToChat('❌ Sorry, I encountered an error. Please try again.', 'ai-message error-message');
    } finally {
      // Re-enable input
      userInput.disabled = false;
      sendButton.disabled = false;
      sendButton.textContent = 'Send';
      userInput.focus();
    }
  }

  // Add message to chat
  function addMessageToChat(message, className) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.textContent = message;
    chatLog.appendChild(messageDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
    return messageDiv;
  }

  // Send button click
  sendButton.addEventListener('click', sendMessage);

  // Enter key press
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Auto-resize input as user types
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
  });
});