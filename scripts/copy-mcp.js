const fs = require('fs-extra');
const path = require('path');

console.log('Copying MCP server files...');

// Copy MCP server batch files to dist directory
const mcpFiles = ['mcp-server.bat', 'mcp-server.sh'];
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distMainDir = path.join(distDir, 'main');

// Ensure directories exist
fs.ensureDirSync(distDir);
fs.ensureDirSync(distMainDir);

// Copy each MCP file
mcpFiles.forEach(file => {
  const srcPath = path.join(rootDir, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(srcPath)) {
    try {
      fs.copySync(srcPath, destPath, { overwrite: true });
      console.log(`Copied ${file} to dist/`);
    } catch (error) {
      console.error(`Error copying ${file}:`, error);
    }
  } else {
    console.warn(`${file} not found at ${srcPath}`);
  }
});

// Copy mcp-standalone.js to dist/main
const mcpStandaloneSrc = path.join(rootDir, 'src', 'main', 'mcp-standalone.js');
const mcpStandaloneDest = path.join(distMainDir, 'mcp-standalone.js');

if (fs.existsSync(mcpStandaloneSrc)) {
  try {
    fs.copySync(mcpStandaloneSrc, mcpStandaloneDest, { overwrite: true });
    console.log('Copied mcp-standalone.js to dist/main/');
  } catch (error) {
    console.error('Error copying mcp-standalone.js:', error);
  }
} else {
  console.warn('mcp-standalone.js not found at', mcpStandaloneSrc);
}

// Copy mcp-server-simple.js to dist/main
const mcpSimpleSrc = path.join(rootDir, 'src', 'main', 'mcp-server-simple.js');
const mcpSimpleDest = path.join(distMainDir, 'mcp-server-simple.js');

if (fs.existsSync(mcpSimpleSrc)) {
  try {
    fs.copySync(mcpSimpleSrc, mcpSimpleDest, { overwrite: true });
    console.log('Copied mcp-server-simple.js to dist/main/');
  } catch (error) {
    console.error('Error copying mcp-server-simple.js:', error);
  }
} else {
  console.warn('mcp-server-simple.js not found at', mcpSimpleSrc);
}

console.log('MCP server files copy completed.');