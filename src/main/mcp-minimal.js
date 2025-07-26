#!/usr/bin/env node

// Minimal MCP Server for Shopping for Algolia Personalized
// This version uses the high-level McpServer API like the official examples

const fs = require('fs');
const path = require('path');
const os = require('os');

// File-based logging to avoid stdout/stderr conflicts
const logFile = path.join(os.tmpdir(), 'shopping-mcp-debug.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (e) {
    // Silently fail if we can't write logs
  }
}

// Log startup
log('=== MCP Minimal Server Starting ===');
log(`Node version: ${process.version}`);
log(`Platform: ${process.platform}`);
log(`Log file: ${logFile}`);

// Error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`);
  log(`Stack: ${error.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

async function startMinimalMCPServer() {
  try {
    log('Loading MCP SDK modules...');
    
    // Use relative paths to avoid module resolution issues
    const path = require('path');
    const baseDir = path.join(__dirname, '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
    log(`Base directory: ${baseDir}`);
    
    const { McpServer } = require(path.join(baseDir, 'server', 'mcp.js'));
    const { StdioServerTransport } = require(path.join(baseDir, 'server', 'stdio.js'));
    
    log('MCP SDK modules loaded successfully');
    
    // Create MCP server using high-level API
    const server = new McpServer({
      name: 'shopping-for-algolia-personalized',
      version: '1.0.6',
    });
    
    log('MCP server instance created');
    
    // Register tools using the high-level API
    server.registerTool(
      'get_personalization_summary',
      {
        description: 'Get summary of user\'s shopping personalization data',
        inputSchema: {},
      },
      async () => {
        log('Tool called: get_personalization_summary');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              totalProducts: 0,
              categoriesInterested: [],
              priceRange: { min: 0, max: 0 },
              lastActivityDate: 'No activity yet',
              favoriteCategories: []
            }, null, 2)
          }]
        };
      }
    );
    
    server.registerTool(
      'get_user_preferences',
      {
        description: 'Get user\'s shopping preferences and category interests',
        inputSchema: {},
      },
      async () => {
        log('Tool called: get_user_preferences');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              discoveryMode: 'disabled',
              categoryPreferences: {
                electronics: '25%',
                fashion: '25%',
                sports: '25%',
                home: '25%'
              },
              priceRange: {
                min: 0,
                max: 1000,
                sweetSpot: 200
              },
              confidenceLevel: '0%',
              totalInteractions: 0
            }, null, 2)
          }]
        };
      }
    );
    
    // Connect to transport
    log('Creating stdio transport...');
    const transport = new StdioServerTransport();
    
    log('Connecting server to transport...');
    await server.connect(transport);
    log('Server connected successfully');
    
    // Keep process alive
    log('Server is ready and listening');
    
    // Log to stderr like the official examples
    console.error('Shopping for Algolia MCP server running on stdio');
    
    // Log heartbeat every 30 seconds
    setInterval(() => {
      log(`Heartbeat - server alive at ${new Date().toISOString()}`);
    }, 30000);
    
  } catch (error) {
    log(`Fatal error: ${error.message}`);
    log(`Stack: ${error.stack}`);
    // Exit gracefully
    process.exit(1);
  }
}

// Start the server
log('Starting server...');
startMinimalMCPServer().catch((error) => {
  log(`Startup error: ${error.message}`);
  log(`Stack: ${error.stack}`);
  process.exit(1);
});