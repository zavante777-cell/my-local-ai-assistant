// Import CSS
import './index.css';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  // Get elements
  const startScreen = document.getElementById('start-screen');
  const chatScreen = document.getElementById('chat-screen');
  const startButton = document.getElementById('start-button');
  const backButton = document.getElementById('back-button');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const chatLog = document.getElementById('chat-log');
  const modelDropdown = document.getElementById('model-dropdown');

  // Start button click
  startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
    userInput.focus();
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
    addMessageToChat(message, 'user-message');
    
    // Show typing indicator
    const typingDiv = addMessageToChat('🤖 AI is thinking...', 'ai-message');
    
    try {
      // Check if electronAPI is available
      if (window.electronAPI && window.electronAPI.getAIResponse) {
        const response = await window.electronAPI.getAIResponse(message, selectedModel);
        // Remove typing indicator
        typingDiv.remove();
        addMessageToChat(response, 'ai-message');
      } else {
        // Fallback fake response if preload didn't work
        setTimeout(() => {
          typingDiv.remove();
          addMessageToChat(`🤖 [${selectedModel.toUpperCase()}]: This is a fake response to "${message}". Real Ollama integration coming next!`, 'ai-message');
        }, 1500);
      }
    } catch (error) {
      console.error('AI Error:', error);
      typingDiv.remove();
      addMessageToChat('Sorry, I encountered an error', 'ai-message');
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
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
});