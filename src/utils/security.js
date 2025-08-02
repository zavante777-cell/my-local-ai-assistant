// Security utilities for My Agent Two
const path = require('path');

// Security: Allowed commands whitelist
const ALLOWED_COMMANDS = [
  'npm', 'node', 'git', 'echo', 'dir', 'ls', 'cat', 'type',
  'python', 'python3', 'pip', 'pip3', 'npm install', 'npm run',
  'cd', 'pwd', 'whoami', 'date', 'time', 'echo %PATH%'
];

// Security: Allowed file extensions for editing
const ALLOWED_FILE_EXTENSIONS = [
  '.js', '.ts', '.html', '.css', '.json', '.txt', '.md',
  '.py', '.java', '.cpp', '.c', '.h', '.xml', '.yaml', '.yml'
];

// Security: Check if command is allowed
function isCommandAllowed(command) {
  const lowerCommand = command.toLowerCase();
  return ALLOWED_COMMANDS.some(allowed => 
    lowerCommand.startsWith(allowed.toLowerCase())
  );
}

// Security: Check if file path is safe
function isFilePathSafe(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_FILE_EXTENSIONS.includes(ext) && 
         !filePath.includes('..') && 
         !filePath.includes('\\') &&
         (filePath.startsWith('./') || filePath.startsWith('src/') || !filePath.includes('/'));
}

module.exports = {
  isCommandAllowed,
  isFilePathSafe,
  ALLOWED_COMMANDS,
  ALLOWED_FILE_EXTENSIONS
}; 