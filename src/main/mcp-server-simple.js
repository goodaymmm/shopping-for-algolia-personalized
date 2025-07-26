#!/usr/bin/env node

// Simplified MCP Server for Shopping for Algolia Personalized
// This version removes the AlgoliaMCPService dependency and focuses on personalization data only

const path = require('path');
const { DatabaseService } = require('./database');
const { PersonalizationEngine } = require('./personalization');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

async function startSimpleMCPServer() {
  try {
    console.error('[MCP Simple] Starting Shopping for Algolia MCP Server (Simplified)...');
    console.error('[MCP Simple] Node version:', process.version);
    console.error('[MCP Simple] Platform:', process.platform);
    console.error('[MCP Simple] Working directory:', process.cwd());
    console.error('[MCP Simple] Script path:', __filename);
    console.error('[MCP Simple] Process argv:', process.argv);
    
    // Initialize database in MCP mode
    console.error('[MCP Simple] Initializing database in MCP mode...');
    let database;
    let personalization;
    
    try {
      database = new DatabaseService(true);
      database.initialize();
      console.error('[MCP Simple] Database initialized successfully');
      
      // Initialize personalization engine
      console.error('[MCP Simple] Initializing personalization engine...');
      personalization = new PersonalizationEngine(database.database);
      console.error('[MCP Simple] Personalization engine initialized successfully');
    } catch (dbError) {
      console.error('[MCP Simple] Database initialization error:', dbError.message);
      console.error('[MCP Simple] Stack trace:', dbError.stack);
      // Continue with limited functionality
      console.error('[MCP Simple] Continuing with limited functionality...');
    }
    
    // Create MCP server
    const server = new Server(
      {
        name: 'shopping-for-algolia-personalized',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    // Setup tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
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
        ]
      };
    });
    
    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error('[MCP Simple] Handling tool call:', request.params.name);
      
      try {
        if (!personalization) {
          throw new Error('Database not initialized. Please check your Shopping for Algolia app installation.');
        }
        
        switch (request.params.name) {
          case 'get_personalization_summary':
            return await handlePersonalizationSummary(personalization);
          
          case 'get_user_preferences':
            return await handleUserPreferences(personalization);
          
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error('[MCP Simple] Tool error:', error);
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }]
        };
      }
    });
    
    // Connect to transport
    console.error('[MCP Simple] Connecting to stdio transport...');
    const transport = new StdioServerTransport();
    
    try {
      await server.connect(transport);
      console.error('[MCP Simple] Server connected successfully');
      console.error('[MCP Simple] Ready to handle requests');
      
      // Wait a bit to ensure initialization is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      console.error('[MCP Simple] Initialization complete');
      
      // Send initial response to keep connection alive
      console.error('[MCP Simple] MCP server is now ready and listening');
    } catch (connectError) {
      console.error('[MCP Simple] Failed to connect transport:', connectError.message);
      console.error('[MCP Simple] Stack trace:', connectError.stack);
      throw connectError;
    }
    
    // Keep process alive with stronger mechanisms
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
      // Log any stdin data for debugging
      if (data.trim()) {
        console.error('[MCP Simple] Received stdin data:', data.trim().substring(0, 100));
      }
    });
    
    // Handle stdin end
    process.stdin.on('end', () => {
      console.error('[MCP Simple] stdin ended, keeping process alive');
    });
    
    process.stdin.on('error', (err) => {
      console.error('[MCP Simple] stdin error:', err.message);
    });
    
    // Heartbeat to show server is alive
    const heartbeatInterval = setInterval(() => {
      console.error('[MCP Simple] Heartbeat - server is alive at', new Date().toISOString());
    }, 30000); // Every 30 seconds
    
    // Handle graceful shutdown
    const cleanup = () => {
      console.error('[MCP Simple] Cleaning up...');
      clearInterval(heartbeatInterval);
    };
    
    process.on('SIGINT', () => {
      console.error('[MCP Simple] Received SIGINT, shutting down...');
      cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('[MCP Simple] Received SIGTERM, shutting down...');
      cleanup();
      process.exit(0);
    });
    
    process.on('uncaughtException', (error) => {
      console.error('[MCP Simple] Uncaught exception:', error);
      console.error('[MCP Simple] Stack trace:', error.stack);
      cleanup();
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[MCP Simple] Unhandled rejection at:', promise, 'reason:', reason);
      cleanup();
      process.exit(1);
    });
    
  } catch (error) {
    console.error('[MCP Simple] Failed to start MCP server:', error);
    console.error('[MCP Simple] Stack trace:', error.stack);
    process.exit(1);
  }
}

async function handlePersonalizationSummary(personalization) {
  try {
    const profile = await personalization.getUserProfile();
    
    if (profile.confidenceLevel < 0.1) {
      return {
        content: [{
          type: 'text',
          text: `# Your Shopping Personalization Profile

**Status**: No personalization data available yet.

To build your personalization profile:
1. Use the Shopping for Algolia personalized app
2. Search for products and interact with results
3. Save products you like
4. Return here for personalized recommendations

The more you use the app, the better I can understand your preferences!`
        }]
      };
    }
    
    const topCategories = Object.entries(profile.categoryScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, score]) => `- ${category}: ${(score * 100).toFixed(0)}%`);
    
    const topColors = Object.entries(profile.stylePreference.colors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([color]) => color);
    
    const topOccasions = Object.entries(profile.stylePreference.occasions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([occasion]) => occasion);
    
    return {
      content: [{
        type: 'text',
        text: `# Your Shopping Personalization Profile

## Category Preferences
${topCategories.length > 0 ? topCategories.join('\n') : 'Still building preferences...'}

## Style Profile
- **Preferred Colors**: ${topColors.join(', ') || 'Still learning'}
- **Common Occasions**: ${topOccasions.join(', ') || 'Still learning'}

## Shopping Behavior
- **Budget Range**: $${profile.pricePreference.min} - $${profile.pricePreference.max}
- **Sweet Spot**: $${profile.pricePreference.sweetSpot}
- **Price Flexibility**: ${(profile.pricePreference.flexibility * 100).toFixed(0)}%

## Interaction History
- **Total Searches**: ${profile.interactionHistory.totalSearches}
- **Products Saved**: ${profile.interactionHistory.totalSaves}
- **Links Clicked**: ${profile.interactionHistory.totalClicks}
- **Products Viewed**: ${profile.interactionHistory.totalViews}

## Data Quality
- **Confidence Level**: ${(profile.confidenceLevel * 100).toFixed(1)}%
- **Last Updated**: ${profile.lastUpdated.toLocaleDateString()}

---
🚀 **Improve Your Profile**: Use the Shopping for Algolia personalized app more to get better recommendations!

📈 **Data Source**: Shopping for Algolia personalized (Local ML data)
🔒 **Privacy**: All data stored locally on your device`
      }]
    };
    
  } catch (error) {
    console.error('[MCP Simple] Personalization summary error:', error);
    return {
      content: [{
        type: 'text',
        text: `Error retrieving personalization data: ${error.message}`
      }]
    };
  }
}

async function handleUserPreferences(personalization) {
  try {
    const profile = await personalization.getUserProfile();
    
    if (profile.confidenceLevel < 0.1) {
      return {
        content: [{
          type: 'text',
          text: 'No preference data available. Please use the Shopping for Algolia app to build your profile.'
        }]
      };
    }
    
    const categoryInterests = Object.entries(profile.categoryScores)
      .sort(([,a], [,b]) => b - a)
      .reduce((acc, [cat, score]) => {
        acc[cat] = (score * 100).toFixed(1) + '%';
        return acc;
      }, {});
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          categories: categoryInterests,
          priceRange: {
            min: profile.pricePreference.min,
            max: profile.pricePreference.max,
            sweetSpot: profile.pricePreference.sweetSpot
          },
          confidenceLevel: (profile.confidenceLevel * 100).toFixed(1) + '%',
          totalInteractions: profile.interactionHistory.totalSaves + profile.interactionHistory.totalClicks
        }, null, 2)
      }]
    };
    
  } catch (error) {
    console.error('[MCP Simple] User preferences error:', error);
    return {
      content: [{
        type: 'text',
        text: `Error retrieving preferences: ${error.message}`
      }]
    };
  }
}

// Start the server
startSimpleMCPServer();