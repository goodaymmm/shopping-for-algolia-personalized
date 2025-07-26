#!/usr/bin/env node

// Minimal MCP Server for Shopping for Algolia Personalized
// This version uses file-based logging and minimal dependencies

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
    
    const { Server } = require('@modelcontextprotocol/sdk/dist/cjs/server/index.js');
    const { StdioServerTransport } = require('@modelcontextprotocol/sdk/dist/cjs/server/stdio.js');
    const {
      CallToolRequestSchema,
      ListToolsRequestSchema,
      InitializeRequestSchema,
    } = require('@modelcontextprotocol/sdk/dist/cjs/types.js');
    
    log('MCP SDK modules loaded successfully');
    
    // Create MCP server
    const server = new Server(
      {
        name: 'shopping-for-algolia-personalized',
        version: '1.0.6',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    log('MCP server instance created');
    
    // Handle initialization
    server.setRequestHandler(InitializeRequestSchema, async (request) => {
      log(`Initialize request received: ${JSON.stringify(request.params)}`);
      const response = {
        protocolVersion: request.params.protocolVersion,
        capabilities: server.serverInfo.capabilities,
        serverInfo: server.serverInfo
      };
      log(`Sending initialize response: ${JSON.stringify(response)}`);
      return response;
    });
    
    // Setup tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('ListTools request received');
      const tools = [
        {
          name: 'get_personalization_summary',
          description: 'Get summary of user\'s shopping personalization data',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get_user_preferences',
          description: 'Get user\'s shopping preferences and category interests',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ];
      log(`Returning ${tools.length} tools`);
      return { tools };
    });
    
    // Handle tool calls with dummy data
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      log(`Tool call received: ${request.params.name}`);
      
      try {
        switch (request.params.name) {
          case 'get_personalization_summary':
            return {
              content: [{
                type: 'text',
                text: `# Your Shopping Personalization Profile

**Status**: Demo mode - using sample data

## Category Preferences
- Fashion: 80%
- Electronics: 60%
- Home: 40%

## Shopping Behavior
- **Budget Range**: $50 - $500
- **Sweet Spot**: $150

## Interaction History
- **Total Searches**: 10
- **Products Saved**: 5

---
Note: This is demo data from the minimal MCP server.`
              }]
            };
          
          case 'get_user_preferences':
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  categories: {
                    fashion: '80%',
                    electronics: '60%',
                    home: '40%'
                  },
                  priceRange: {
                    min: 50,
                    max: 500,
                    sweetSpot: 150
                  },
                  confidenceLevel: '0%',
                  totalInteractions: 15
                }, null, 2)
              }]
            };
          
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        log(`Tool error: ${error.message}`);
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }]
        };
      }
    });
    
    // Connect to transport
    log('Creating stdio transport...');
    const transport = new StdioServerTransport();
    
    log('Connecting server to transport...');
    await server.connect(transport);
    log('Server connected successfully');
    
    // Keep process alive
    log('Server is ready and listening');
    
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
startMinimalMCPServer().catch(e => {
  log(`Startup error: ${e.message}`);
  process.exit(1);
});