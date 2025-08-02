// File operations for My Agent Two
const fs = require('fs');
const { exec } = require('child_process');
const { isCommandAllowed, isFilePathSafe } = require('./security');

// Execute terminal command safely
async function executeCommand(command) {
  if (!isCommandAllowed(command)) {
    throw new Error(`Command not allowed: ${command}`);
  }
  
  return new Promise((resolve, reject) => {
    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${error.message}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Read file safely
async function readFile(filePath) {
  if (!isFilePathSafe(filePath)) {
    throw new Error(`File path not allowed: ${filePath}`);
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { content, path: filePath };
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

// Write file safely
async function writeFile(filePath, content) {
  if (!isFilePathSafe(filePath)) {
    throw new Error(`File path not allowed: ${filePath}`);
  }
  
  try {
    // Create backup
    const backupPath = `${filePath}.backup.${Date.now()}`;
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, backupPath };
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
}

module.exports = {
  executeCommand,
  readFile,
  writeFile
}; 