#!/usr/bin/env node

// Standalone MCP Server Entry Point
// This runs completely independently from the Electron app

const path = require('path');
const { DatabaseService } = require('./database');
const { PersonalizationEngine } = require('./personalization');
const { ShoppingMCPServer } = require('./mcp-server');

async function startStandaloneMCPServer() {
  try {
    console.error('[MCP Standalone] Starting Shopping for Algolia MCP Server...');
    console.error('[MCP Standalone] Node version:', process.version);
    console.error('[MCP Standalone] Platform:', process.platform);
    console.error('[MCP Standalone] Working directory:', process.cwd());
    console.error('[MCP Standalone] Script location:', __filename);
    console.error('[MCP Standalone] __dirname:', __dirname);
    
    // Initialize database in MCP mode
    console.error('[MCP Standalone] Initializing database in MCP mode...');
    const database = new DatabaseService(true);
    database.initialize();
    
    console.error('[MCP Standalone] Database initialized successfully');
    
    // Initialize personalization engine
    console.error('[MCP Standalone] Initializing personalization engine...');
    const personalization = new PersonalizationEngine(database.database);
    
    console.error('[MCP Standalone] Personalization engine initialized successfully');
    
    // Create and start MCP server
    console.error('[MCP Standalone] Creating MCP server...');
    const mcpServer = new ShoppingMCPServer(personalization);
    
    console.error('[MCP Standalone] Starting MCP server...');
    await mcpServer.start();
    
    console.error('[MCP Standalone] MCP Server started successfully');
    
    // Keep process alive - the server is now listening
    console.error('[MCP Standalone] Server is running and waiting for connections...');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.error('[MCP Standalone] Received SIGINT, shutting down...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('[MCP Standalone] Received SIGTERM, shutting down...');
      process.exit(0);
    });
    
    process.on('uncaughtException', (error) => {
      console.error('[MCP Standalone] Uncaught exception:', error);
      console.error('[MCP Standalone] Stack trace:', error.stack);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[MCP Standalone] Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('[MCP Standalone] Failed to start MCP server:', error);
    console.error('[MCP Standalone] Stack trace:', error.stack);
    console.error('[MCP Standalone] Error details:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

// Start the server
startStandaloneMCPServer();