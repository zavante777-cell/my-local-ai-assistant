// Development commands for My Agent Two
const { userMemory } = require('./memory');
const { writeFile } = require('./fileOperations');

// Track created files
let createdFiles = [];

// Handle dev mode commands with better context understanding
async function handleDevCommands(message) {
  const lowerMessage = message.toLowerCase();
  if (!userMemory.preferences.devMode) { return { shouldExecute: false }; }

  // File creation commands - more natural language detection
  const fileCreationPatterns = [
    /make.*(?:a|an|some).*(?:file|text|document|word)/i,
    /create.*(?:a|an|some).*(?:file|text|document|word)/i,
    /can you.*(?:make|create).*(?:file|text|document|word)/i,
    /i need.*(?:a|an|some).*(?:file|text|document|word)/i,
    /help me.*(?:make|create).*(?:file|text|document|word)/i,
    /(?:make|create).*(?:file|text|document|word).*for me/i,
    /(?:file|text|document|word).*creation/i
  ];

  // Check if user wants to create a file
  const wantsFile = fileCreationPatterns.some(pattern => pattern.test(message)) ||
                   (lowerMessage.includes('file') && (lowerMessage.includes('make') || lowerMessage.includes('create'))) ||
                   (lowerMessage.includes('text') && (lowerMessage.includes('make') || lowerMessage.includes('create'))) ||
                   (lowerMessage.includes('document') && (lowerMessage.includes('make') || lowerMessage.includes('create'))) ||
                   (lowerMessage.includes('word') && (lowerMessage.includes('make') || lowerMessage.includes('create')));

  if (wantsFile) {
    if (userMemory.preferences.fileEditing) {
      try {
        const timestamp = Date.now();
        const fileName = `textfile_${timestamp}.txt`;
        
        let content = `# Text File Created by AI Assistant\n\nCreated on: ${new Date().toLocaleString()}\n\nThis file was created automatically based on your request.`;
        
        // Check if user specified content
        if (lowerMessage.includes('with the text') || lowerMessage.includes('containing') || lowerMessage.includes('saying')) {
          const textMatch = message.match(/with the text (.+)/i) || 
                           message.match(/containing (.+)/i) || 
                           message.match(/saying (.+)/i);
          if (textMatch) {
            content = textMatch[1];
          }
        }
        
        const result = await writeFile(fileName, content);
        
        // Track the created file
        createdFiles.push({
          name: fileName,
          path: result.path,
          content: content,
          created: new Date().toISOString()
        });
        
        return { 
          shouldExecute: true, 
          response: { 
            response: `✅ **Text file created successfully!**\n\n📄 **File:** ${fileName}\n📍 **Location:** ${result.path}\n\n**Content:**\n\`\`\`\n${content}\n\`\`\`\n\nYou can now edit this file or ask me to open it!`, 
            corrected: null, 
            original: null 
          } 
        };
      } catch (error) {
        return { 
          shouldExecute: true, 
          response: { 
            response: `❌ Failed to create text file: ${error.message}`, 
            corrected: null, 
            original: null 
          } 
        };
      }
    } else {
      return { 
        shouldExecute: true, 
        response: { 
          response: `⚠️ **File editing is disabled!**\n\nTo create files, enable file editing in Settings → Development Mode → File Editing`, 
          corrected: null, 
          original: null 
        } 
      };
    }
  }

  // Command execution
  const commandPatterns = [
    /run.*command/i,
    /execute.*command/i,
    /can you.*run/i,
    /help me.*run/i,
    /i need.*to run/i,
    /execute.*for me/i
  ];

  const wantsCommand = commandPatterns.some(pattern => pattern.test(message)) ||
                      (lowerMessage.includes('command') && (lowerMessage.includes('run') || lowerMessage.includes('execute')));

  if (wantsCommand) {
    if (userMemory.preferences.codeExecution) {
      const command = message.replace(/run command|execute command|can you run|help me run|i need to run|execute for me/gi, '').trim();
      if (command && isCommandAllowed(command)) {
        try {
          const result = await executeCommand(command);
          return { 
            shouldExecute: true, 
            response: { 
              response: `✅ **Command executed successfully!**\n\n\`\`\`bash\n${command}\n\`\`\`\n\n**Output:**\n\`\`\`\n${result}\n\`\`\``, 
              corrected: null, 
              original: null 
            } 
          };
        } catch (error) {
          return { 
            shouldExecute: true, 
            response: { 
              response: `❌ Command failed: ${error.message}`, 
              corrected: null, 
              original: null 
            } 
          };
        }
      } else {
        return { 
          shouldExecute: true, 
          response: { 
            response: `⚠️ **Command not allowed!**\n\nFor security reasons, only basic commands are allowed.`, 
            corrected: null, 
            original: null 
          } 
        };
      }
    } else {
      return { 
        shouldExecute: true, 
        response: { 
          response: `⚠️ **Code execution is disabled!**\n\nTo run commands, enable code execution in Settings → Development Mode → Code Execution`, 
          corrected: null, 
          original: null 
        } 
      };
    }
  }

  return { shouldExecute: false };
}

module.exports = {
  handleDevCommands
}; 