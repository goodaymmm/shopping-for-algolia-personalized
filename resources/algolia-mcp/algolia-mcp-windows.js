#!/usr/bin/env node
/**
 * Windows wrapper for Official Algolia MCP Server
 * This script launches the official Algolia MCP Server TypeScript source
 * using Node.js with experimental TypeScript support
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);

// Path to the official Algolia MCP Server entry point
const algoliaPath = path.join(__dirname, 'algolia-mcp-source', 'src', 'app.ts');

// Check if the official Algolia MCP Server source exists
if (!fs.existsSync(algoliaPath)) {
  console.error(`Error: Official Algolia MCP Server source not found at ${algoliaPath}`);
  console.error('Please ensure the official Algolia MCP Server source is copied during build.');
  process.exit(1);
}

// Check Node.js version (requires 22+)
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion < 22) {
  console.error(`Error: Node.js 22 or higher is required. Current version: ${nodeVersion}`);
  console.error('Please upgrade Node.js to version 22 or higher.');
  process.exit(1);
}

// Spawn the Node.js process with experimental TypeScript support
const nodeProcess = spawn('node', [
  '--experimental-strip-types',
  '--no-warnings=ExperimentalWarnings',
  algoliaPath,
  ...args
], {
  stdio: 'inherit',
  env: { ...process.env },
  cwd: path.join(__dirname, 'algolia-mcp-source')
});

// Handle process errors
nodeProcess.on('error', (error) => {
  console.error('Failed to start official Algolia MCP Server:', error);
  process.exit(1);
});

// Forward exit code
nodeProcess.on('exit', (code) => {
  process.exit(code || 0);
});