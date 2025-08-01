// Global state
let isConnected = false;
let availableModels = [];
let currentModel = 'qwen2.5:0.5b'; // Use working model by default
let speedMode = 'balanced';
let devMode = false;
let codeExecution = false;
let fileEditing = false;
let currentChatId = null;
let chatHistory = [];

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing app...');
  
  // Get elements with null checks
  const startScreen = document.getElementById('start-screen');
  const chatScreen = document.getElementById('chat-screen');
  const startButton = document.getElementById('start-button');
  const backButton = document.getElementById('back-button');
  const newChatButton = document.getElementById('new-chat-button');
  const settingsButton = document.getElementById('settings-button');
  const chatHistoryButton = document.getElementById('chat-history-button');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const chatLog = document.getElementById('chat-log');
  const modelDropdown = document.getElementById('model-dropdown');
  const connectionStatus = document.getElementById('connection-status');
  const speedModeDropdown = document.getElementById('speed-mode');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettings = document.getElementById('close-settings');
  const devModeToggle = document.getElementById('dev-mode-toggle');
  const codeExecutionToggle = document.getElementById('code-execution');
  const fileEditingToggle = document.getElementById('file-editing');
  const responseStyleSelect = document.getElementById('response-style');
  const clearMemoryBtn = document.getElementById('clear-memory');
  const chatSidebar = document.getElementById('chat-sidebar');
  const closeSidebar = document.getElementById('close-sidebar');
  const chatList = document.getElementById('chat-list');
  const exportTrainingDataBtn = document.getElementById('export-training-data');
  const prepareDatasetBtn = document.getElementById('prepare-dataset');
  const getFastestModelBtn = document.getElementById('get-fastest-model');

  console.log('Elements found:', {
    startScreen: !!startScreen,
    chatScreen: !!chatScreen,
    startButton: !!startButton,
    backButton: !!backButton,
    newChatButton: !!newChatButton,
    settingsButton: !!settingsButton,
    chatHistoryButton: !!chatHistoryButton,
    userInput: !!userInput,
    sendButton: !!sendButton,
    chatLog: !!chatLog,
    modelDropdown: !!modelDropdown,
    connectionStatus: !!connectionStatus,
    speedModeDropdown: !!speedModeDropdown,
    settingsModal: !!settingsModal,
    chatSidebar: !!chatSidebar
  });

  // Check if all elements exist
  if (!startScreen || !chatScreen || !startButton || !backButton || 
      !userInput || !sendButton || !chatLog || !modelDropdown) {
    console.error('Critical UI elements missing!');
    return;
  }

  // Initialize app
  initializeApp();

  // Start button click
  if (startButton) {
    startButton.addEventListener('click', () => {
      console.log('Start button clicked');
      if (startScreen && chatScreen) {
        startScreen.style.display = 'none';
        chatScreen.style.display = 'flex';
        if (userInput) userInput.focus();
        // Test connection when entering chat
        testConnection();
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

  // New chat button click
  if (newChatButton) {
    newChatButton.addEventListener('click', () => {
      console.log('New chat button clicked');
      createNewChat();
      if (userInput) userInput.focus();
    });
  }

  // Settings button click
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      console.log('Settings button clicked');
      if (settingsModal) {
        settingsModal.style.display = 'block';
      }
    });
  }

  // Close settings modal
  if (closeSettings) {
    closeSettings.addEventListener('click', () => {
      if (settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
  }

  // Close modal when clicking outside
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
  }

  // Dev mode toggle
  if (devModeToggle) {
    devModeToggle.addEventListener('change', (e) => {
      devMode = e.target.checked;
      console.log('Dev mode:', devMode);
      
      // Enable/disable dependent toggles
      if (codeExecutionToggle) {
        codeExecutionToggle.disabled = !devMode;
        if (!devMode) codeExecutionToggle.checked = false;
      }
      if (fileEditingToggle) {
        fileEditingToggle.disabled = !devMode;
        if (!devMode) fileEditingToggle.checked = false;
      }
      
      // Save preference
      window.electronAPI.updateUserPreferences({
        devMode: devMode
      });
    });
  }

  // Code execution toggle
  if (codeExecutionToggle) {
    codeExecutionToggle.addEventListener('change', (e) => {
      codeExecution = e.target.checked;
      console.log('Code execution:', codeExecution);
      
      window.electronAPI.updateUserPreferences({
        codeExecution: codeExecution
      });
    });
  }

  // File editing toggle
  if (fileEditingToggle) {
    fileEditingToggle.addEventListener('change', (e) => {
      fileEditing = e.target.checked;
      console.log('File editing:', fileEditing);
      
      window.electronAPI.updateUserPreferences({
        fileEditing: fileEditing
      });
    });
  }

  // Response style change
  if (responseStyleSelect) {
    responseStyleSelect.addEventListener('change', (e) => {
      const responseStyle = e.target.value;
      console.log('Response style:', responseStyle);
      
      window.electronAPI.updateUserPreferences({
        responseStyle: responseStyle
      });
    });
  }

  // Clear memory button
  if (clearMemoryBtn) {
    clearMemoryBtn.addEventListener('click', () => {
      if (confirm('⚠️ Are you sure you want to clear all memory? This cannot be undone!')) {
        if (chatLog) chatLog.innerHTML = '';
        localStorage.removeItem('chatHistory');
        window.electronAPI.clearAllMemory();
        console.log('Memory cleared');
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

  // Model dropdown change
  if (modelDropdown) {
    modelDropdown.addEventListener('change', (e) => {
      currentModel = e.target.value;
      console.log('Model changed to:', currentModel);
      updateConnectionStatus();
      
      // Save user preference
      window.electronAPI.updateUserPreferences({
        preferredModel: currentModel
      });
    });
  }

  // Speed mode change
  if (speedModeDropdown) {
    speedModeDropdown.addEventListener('change', (e) => {
      speedMode = e.target.value;
      console.log('Speed mode changed to:', speedMode);
      
      // Save user preference
      window.electronAPI.updateUserPreferences({
        speedMode: speedMode
      });
    });
  }

  // Add stats button to chat header
  function addStatsButton() {
    const chatHeader = document.getElementById('chat-header');
    if (chatHeader && !document.getElementById('stats-button')) {
      const statsButton = document.createElement('button');
      statsButton.id = 'stats-button';
      statsButton.innerHTML = '📊 Stats';
      statsButton.className = 'stats-btn';
      statsButton.addEventListener('click', displayBehaviorStats);
      chatHeader.appendChild(statsButton);
    }
  }

  // Initialize app functionality
  function initializeApp() {
    console.log('Initializing app...');
    loadChatHistory();
    updateModelDropdown();
    updateConnectionStatus();
    loadUserMemory();
    addStatsButton(); // Add stats button on app initialization
    
    // Initialize chat history sidebar
    setTimeout(() => {
      if (chatList) {
        console.log('Loading chat history list...');
        loadChatHistoryList();
      } else {
        console.error('Chat list element not found!');
      }
    }, 1000); // Small delay to ensure DOM is ready
  }

  // Load user memory and preferences
  async function loadUserMemory() {
    try {
      const memory = await window.electronAPI.getUserMemory();
      if (memory && memory.preferences) {
        // Update current model if user has a preference
        if (memory.preferences.preferredModel) {
          currentModel = memory.preferences.preferredModel;
          if (modelDropdown) {
            modelDropdown.value = currentModel;
          }
        }
        // Update speed mode if user has a preference
        if (memory.preferences.speedMode) {
          speedMode = memory.preferences.speedMode;
          if (speedModeDropdown) {
            speedModeDropdown.value = speedMode;
          }
        }
        // Update dev mode if user has a preference
        if (memory.preferences.devMode) {
          devMode = memory.preferences.devMode;
          if (devModeToggle) {
            devModeToggle.checked = devMode;
          }
        }
        // Update code execution if user has a preference
        if (memory.preferences.codeExecution) {
          codeExecution = memory.preferences.codeExecution;
          if (codeExecutionToggle) {
            codeExecutionToggle.checked = codeExecution;
          }
        }
        // Update file editing if user has a preference
        if (memory.preferences.fileEditing) {
          fileEditing = memory.preferences.fileEditing;
          if (fileEditingToggle) {
            fileEditingToggle.checked = fileEditing;
          }
        }
        // Update response style if user has a preference
        if (memory.preferences.responseStyle) {
          const responseStyleSelect = document.getElementById('response-style');
          if (responseStyleSelect) {
            responseStyleSelect.value = memory.preferences.responseStyle;
          }
        }
        console.log('User memory loaded:', memory);
      }
    } catch (error) {
      console.error('Error loading user memory:', error);
    }
  }

  // Display behavior statistics
  function displayBehaviorStats() {
    if (!chatLog) return;
    
    window.electronAPI.getBehaviorStats().then(stats => {
      if (stats && stats.totalMessages > 0) {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'behavior-stats';
        
        const topTopics = stats.commonTopics.slice(0, 3);
        const topicsText = topTopics.length > 0 
          ? `Top topics: ${topTopics.map(t => `${t.name} (${t.count})`).join(', ')}`
          : 'No common topics yet';
        
        statsDiv.innerHTML = `
          📊 <strong>Your Stats:</strong><br>
          • Total messages: ${stats.totalMessages}<br>
          • ${topicsText}<br>
          • Most active: ${getMostActiveHours(stats.activeHours)}
        `;
        
        chatLog.appendChild(statsDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
      }
    }).catch(error => {
      console.error('Error getting behavior stats:', error);
    });
  }

  // Get most active hours
  function getMostActiveHours(activeHours) {
    const sorted = Object.entries(activeHours)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2);
    
    if (sorted.length === 0) return 'No data yet';
    
    return sorted.map(([hour, count]) => `${hour}:00 (${count} messages)`).join(', ');
  }

  // Test Ollama connection
  async function testConnection() {
    if (!connectionStatus) return;
    
    connectionStatus.textContent = 'Testing connection...';
    connectionStatus.className = 'status-testing';
    
    try {
      const result = await window.electronAPI.testOllamaConnection();
      isConnected = result.success;
      
      if (result.success) {
        availableModels = result.models || [];
        updateModelDropdown();
        connectionStatus.textContent = '✅ Connected to Ollama';
        connectionStatus.className = 'status-success';
      } else {
        connectionStatus.textContent = '❌ Ollama not running';
        connectionStatus.className = 'status-error';
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      isConnected = false;
      connectionStatus.textContent = '❌ Connection failed';
      connectionStatus.className = 'status-error';
    }
  }

  // Update model dropdown
  function updateModelDropdown() {
    if (!modelDropdown) return;
    
    // Clear existing options
    modelDropdown.innerHTML = '';
    
    // Add models with speed indicators (using only working models)
    const models = [
      { name: 'auto', display: '🤖 Auto (Smart Selection)', speed: 'Adaptive' },
      { name: 'qwen2.5:0.5b', display: '⚡ Qwen2.5 0.5B (Fast & Reliable)', speed: 'Fast' },
      { name: 'tinyllama:latest', display: '🚀 TinyLlama (Very Fast)', speed: 'Very Fast' }
    ];
    
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.name;
      option.textContent = model.display;
      option.title = `Speed: ${model.speed}`;
      if (model.name === currentModel) {
        option.selected = true;
      }
      modelDropdown.appendChild(option);
    });
    
    console.log('Model dropdown updated with working models:', models.map(m => m.name));
  }

  // Update connection status display
  function updateConnectionStatus() {
    if (!connectionStatus) return;
    
    if (isConnected) {
      const speedIndicator = getSpeedIndicator(currentModel);
      connectionStatus.textContent = `✅ Connected (${currentModel}) ${speedIndicator}`;
      connectionStatus.className = 'status-success';
    } else {
      connectionStatus.textContent = '❌ Not connected';
      connectionStatus.className = 'status-error';
    }
  }

  // Get speed indicator for current model
  function getSpeedIndicator(model) {
    const speedMap = {
      'qwen2.5:0.5b': '⚡',
      'tinyllama': '🚀',
      'phi3:mini': '⚡',
      'mistral': '⚡',
      'llama3': '🐌'
    };
    return speedMap[model] || '🐌';
  }

  // Save chat history to localStorage
  function saveChatHistory() {
    if (!chatLog) return;
    
    const messages = [];
    const messageElements = chatLog.querySelectorAll('.message');
    
    messageElements.forEach(element => {
      messages.push({
        text: element.textContent,
        className: element.className
      });
    });
    
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }

  // Load chat history from localStorage
  function loadChatHistory() {
    if (!chatLog) return;
    
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      try {
        const messages = JSON.parse(saved);
        messages.forEach(msg => {
          addMessageToChat(msg.text, msg.className);
        });
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }

  // Load chat history list
  function loadChatHistoryList() {
    if (!chatList) {
      console.error('Chat list element not found!');
      return;
    }
    
    console.log('Loading chat history...');
    const savedChats = JSON.parse(localStorage.getItem('chatHistoryList') || '[]');
    console.log('Found saved chats:', savedChats.length);
    
    chatList.innerHTML = '';
    
    if (savedChats.length === 0) {
      const noChatsMsg = document.createElement('div');
      noChatsMsg.style.color = '#888';
      noChatsMsg.style.textAlign = 'center';
      noChatsMsg.style.padding = '20px';
      noChatsMsg.textContent = 'No saved chats yet';
      chatList.appendChild(noChatsMsg);
      return;
    }
    
    savedChats.forEach(chat => {
      const chatItem = document.createElement('div');
      chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
      chatItem.innerHTML = `
        <div class="chat-item-title">${chat.title}</div>
        <div class="chat-item-preview">${chat.preview}</div>
        <div class="chat-item-date">${new Date(chat.date).toLocaleDateString()}</div>
      `;
      
      chatItem.addEventListener('click', () => {
        console.log('Loading chat:', chat.id);
        loadChat(chat.id);
        if (chatSidebar) {
          chatSidebar.classList.remove('open');
        }
      });
      
      chatList.appendChild(chatItem);
    });
    
    console.log('Chat history loaded successfully');
  }

  // Save current chat
  function saveCurrentChat() {
    if (!chatLog) return;
    
    const messages = [];
    const messageElements = chatLog.querySelectorAll('.message');
    
    messageElements.forEach(element => {
      messages.push({
        text: element.textContent,
        className: element.className
      });
    });
    
    if (messages.length === 0) return;
    
    // Generate chat title from first user message
    const firstUserMessage = messages.find(m => m.className.includes('user-message'));
    const title = firstUserMessage ? firstUserMessage.text.substring(0, 30) + '...' : 'New Chat';
    
    const chatData = {
      id: currentChatId || Date.now().toString(),
      title: title,
      preview: messages[messages.length - 1]?.text.substring(0, 50) + '...' || 'Empty chat',
      date: Date.now(),
      messages: messages
    };
    
    // Save to localStorage
    const savedChats = JSON.parse(localStorage.getItem('chatHistoryList') || '[]');
    const existingIndex = savedChats.findIndex(chat => chat.id === chatData.id);
    
    if (existingIndex >= 0) {
      savedChats[existingIndex] = chatData;
    } else {
      savedChats.unshift(chatData);
    }
    
    // Keep only last 20 chats
    savedChats.splice(20);
    
    localStorage.setItem('chatHistoryList', JSON.stringify(savedChats));
    currentChatId = chatData.id;
  }

  // Load specific chat
  function loadChat(chatId) {
    const savedChats = JSON.parse(localStorage.getItem('chatHistoryList') || '[]');
    const chat = savedChats.find(c => c.id === chatId);
    
    if (!chat || !chatLog) return;
    
    // Clear current chat
    chatLog.innerHTML = '';
    
    // Load messages
    chat.messages.forEach(msg => {
      addMessageToChat(msg.text, msg.className);
    });
    
    currentChatId = chatId;
    loadChatHistoryList(); // Update sidebar
  }

  // Create new chat
  function createNewChat() {
    if (!chatLog) return;
    
    // Save current chat if it has messages
    saveCurrentChat();
    
    // Clear chat log
    chatLog.innerHTML = '';
    currentChatId = null;
    
    // Update sidebar
    loadChatHistoryList();
  }

  // Real send message function with AI integration and streaming
  async function sendMessage() {
    if (!userInput || !chatLog) return;
    
    const message = userInput.value.trim();
    if (!message) return;
    
    console.log('Sending message:', message);
    userInput.value = '';
    addMessageToChat(message, 'user-message');
    
    // Auto-save chat after user message
    saveCurrentChat();
    
    // Disable input during AI response
    if (userInput) userInput.disabled = true;
    if (sendButton) sendButton.disabled = true;
    
    // Add typing indicator with speed info
    const speedEmoji = getSpeedIndicator(currentModel);
    const typingIndicator = addMessageToChat(`${speedEmoji} Thinking...`, 'ai-message typing');
    
    try {
      // Get enhanced AI response
      const response = await window.electronAPI.getAIResponse(message, currentModel, speedMode);
      
      // Remove typing indicator
      if (typingIndicator) typingIndicator.remove();
      
      // Show spellcheck correction if any
      if (response.corrected && response.corrected !== response.original) {
        addMessageToChat(`📝 Corrected: "${response.original}" → "${response.corrected}"`, 'correction-message');
      }
      
      // Add AI response with speed indicator
      if (response && response.response) {
        const speedIndicator = getSpeedIndicator(currentModel);
        addMessageToChat(`${speedIndicator} ${response.response}`, 'ai-message');
      } else {
        addMessageToChat('❌ Error: No response from AI', 'ai-message error');
      }
      
      // Auto-save chat after AI response
      saveCurrentChat();
      
    } catch (error) {
      console.error('AI response error:', error);
      
      // Remove typing indicator
      if (typingIndicator) typingIndicator.remove();
      
      // Add error message
      addMessageToChat('❌ Error: Could not get AI response', 'ai-message error');
    } finally {
      // Re-enable input
      if (userInput) userInput.disabled = false;
      if (sendButton) sendButton.disabled = false;
      if (userInput) userInput.focus();
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
    return messageDiv;
  }

  // Training buttons
  if (exportTrainingDataBtn) {
    exportTrainingDataBtn.addEventListener('click', async () => {
      try {
        const result = await window.electronAPI.exportTrainingData();
        if (result.success) {
          alert(`✅ Exported ${result.count} training examples!`);
        }
      } catch (error) {
        console.error('Export error:', error);
        alert('❌ Failed to export training data');
      }
    });
  }

  if (prepareDatasetBtn) {
    prepareDatasetBtn.addEventListener('click', async () => {
      try {
        const result = await window.electronAPI.prepareTrainingDataset();
        if (result.success) {
          alert(`✅ Prepared ${result.count} training pairs!`);
        } else {
          alert('❌ No training data available');
        }
      } catch (error) {
        console.error('Dataset preparation error:', error);
        alert('❌ Failed to prepare dataset');
      }
    });
  }

  if (getFastestModelBtn) {
    getFastestModelBtn.addEventListener('click', async () => {
      try {
        const fastestModel = await window.electronAPI.getFastestModel();
        alert(`⚡ Fastest available model: ${fastestModel}`);
        
        // Auto-switch to fastest model
        if (modelDropdown) {
          modelDropdown.value = fastestModel;
          currentModel = fastestModel;
          updateConnectionStatus();
        }
      } catch (error) {
        console.error('Get fastest model error:', error);
        alert('❌ Failed to get fastest model');
      }
    });
  }

  // Chat history button click
  if (chatHistoryButton) {
    chatHistoryButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Chat history button clicked');
      
      if (chatSidebar) {
        console.log('Opening chat sidebar...');
        chatSidebar.classList.add('open');
        loadChatHistoryList();
      } else {
        console.error('Chat sidebar not found!');
      }
    });
  }

  // Close sidebar
  if (closeSidebar) {
    closeSidebar.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Closing chat sidebar...');
      if (chatSidebar) {
        chatSidebar.classList.remove('open');
      }
    });
  }

  // Close sidebar when clicking outside
  if (chatSidebar) {
    chatSidebar.addEventListener('click', (e) => {
      if (e.target === chatSidebar) {
        console.log('Closing sidebar (outside click)');
        chatSidebar.classList.remove('open');
      }
    });
  }

  console.log('App initialization complete');
});