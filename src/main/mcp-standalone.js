#!/usr/bin/env node

// Standalone MCP Server Entry Point
// This runs completely independently from the Electron app

const path = require('path');
const { DatabaseService } = require('./database');
const { PersonalizationEngine } = require('./personalization');
const { ShoppingMCPServer } = require('./mcp-server');

async function startStandaloneMCPServer() {
  try {
    console.log('[MCP Standalone] Starting Shopping for Algolia MCP Server...');
    console.log('[MCP Standalone] Working directory:', process.cwd());
    
    // Initialize database in MCP mode
    const database = new DatabaseService(true);
    database.initialize();
    
    console.log('[MCP Standalone] Database initialized');
    
    // Initialize personalization engine
    const personalization = new PersonalizationEngine(database.database);
    
    console.log('[MCP Standalone] Personalization engine initialized');
    
    // Create and start MCP server
    const mcpServer = new ShoppingMCPServer(personalization);
    await mcpServer.start();
    
    console.log('[MCP Standalone] MCP Server started successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('[MCP Standalone] Shutting down...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('[MCP Standalone] Shutting down...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('[MCP Standalone] Failed to start MCP server:', error);
    console.error('[MCP Standalone] Stack trace:', error.stack);
    process.exit(1);
  }
}

// Start the server
startStandaloneMCPServer();