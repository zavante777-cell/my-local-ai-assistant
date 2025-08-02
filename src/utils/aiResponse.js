// AI response generation for My Agent Two
const { OLLAMA_API_BASE, spellcheck, getSpeedParams, getRecommendedModel, getConversationHistory } = require('./ai');
const { trackBehavior, buildMemoryContext, extractTopic } = require('./memory');

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
    
    // Try smaller models if the main model fails due to memory
    const modelsToTry = [model];
    if (model === 'llama3') {
      modelsToTry.push('llama3:1b', 'llama3:3b', 'llama2:7b', 'llama2:3b');
    } else if (model === 'llama3:8b') {
      modelsToTry.push('llama3:1b', 'llama3:3b', 'llama2:7b', 'llama2:3b');
    }
    
    // Build context from memory
    const context = buildMemoryContext();
    
    // Get conversation history for better context
    const conversationHistory = getConversationHistory();
    
    // Create enhanced prompt with better system instructions
    const systemPrompt = `You are a helpful AI assistant with the ability to create files and run commands when the user asks. 

IMPORTANT CONTEXT:
- If the user asks for a file to be created, you can do it
- If the user asks for a command to be run, you can do it  
- You understand natural language and context, not just keywords
- You remember previous conversations and user preferences
- You respond in a casual, friendly manner

${context}

${conversationHistory}

User: ${correctedMessage}
Assistant:`;
    
    // Try multiple models if needed
    let lastError = null;
    
    for (const tryModel of modelsToTry) {
      try {
        console.log(`Trying model: ${tryModel}`);
        
        // Speed optimization parameters
        const speedParams = getSpeedParams(tryModel, speedMode);
        console.log(`Using speed params for ${tryModel}:`, speedParams);
        
        const requestBody = {
          model: tryModel,
          prompt: systemPrompt,
          stream: false,
          options: speedParams
        };
        
        console.log(`Sending request to Ollama with model: ${tryModel}`);
        
        const response = await fetch(`${OLLAMA_API_BASE}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        console.log(`Ollama response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Ollama error response: ${errorText}`);
          lastError = new Error(`HTTP ${response.status}: ${errorText}`);
          
          // If it's a memory error, try the next model
          if (errorText.includes('memory') || errorText.includes('GiB')) {
            console.log(`Memory error with ${tryModel}, trying next model...`);
            continue;
          } else {
            throw lastError;
          }
        }
        
        const result = await response.json();
        console.log(`Ollama response received successfully with ${tryModel}`);
        
        // If we used a different model than requested, note it
        if (tryModel !== model) {
          console.log(`Used fallback model: ${tryModel} instead of ${model}`);
        }
        
        // Track behavior
        trackBehavior('message_sent', {
          topic: extractTopic(correctedMessage),
          model: tryModel,
          speedMode: speedMode,
          wasCorrected: wasCorrected,
          usedFallback: tryModel !== model
        });
        
        return {
          response: result.response,
          corrected: wasCorrected ? correctedMessage : null,
          original: wasCorrected ? message : null,
          usedModel: tryModel
        };
        
      } catch (error) {
        lastError = error;
        console.error(`Error with model ${tryModel}:`, error);
        
        // If it's not a memory error, don't try other models
        if (!error.message.includes('memory') && !error.message.includes('GiB')) {
          throw error;
        }
      }
    }
    
    // If we get here, all models failed
    throw lastError || new Error('All available models failed');
    
  } catch (error) {
    console.error('Enhanced AI response error:', error);
    return { response: `Error: ${error.message}` };
  }
}

module.exports = {
  getEnhancedAIResponse
}; 