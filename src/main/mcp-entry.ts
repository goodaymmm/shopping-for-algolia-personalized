// MCP Server Entry Point
// This file is specifically for running as an MCP server without Electron

import { DatabaseService } from './database';
import { PersonalizationEngine } from './personalization';
import { ShoppingMCPServer } from './mcp-server';

async function startMCPServer() {
  try {
    console.log('[MCP] Starting Shopping for Algolia MCP Server...');
    
    // Initialize database in MCP mode
    const database = new DatabaseService(true);
    database.initialize();
    
    // Initialize personalization engine
    const personalization = new PersonalizationEngine(database.database);
    
    // Create and start MCP server
    const mcpServer = new ShoppingMCPServer(personalization);
    await mcpServer.start();
    
  } catch (error) {
    console.error('[MCP] Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Start the server
startMCPServer();