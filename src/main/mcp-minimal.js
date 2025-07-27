#!/usr/bin/env node

// Minimal MCP Server for Shopping for Algolia Personalized
// This version uses the high-level McpServer API like the official examples
// 
// Update 2025-07-27: Added fallback mode to handle better-sqlite3 compatibility issues
// The server will gracefully degrade if database modules cannot be loaded

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
    
    // Load database and personalization modules
    log('Loading database and personalization modules...');
    let DatabaseService, PersonalizationEngine;
    let dbError = null;
    
    try {
      // Try to load from dist/main first (production)
      const distPath = path.join(__dirname, '..', 'dist', 'main');
      if (fs.existsSync(path.join(distPath, 'database.js'))) {
        DatabaseService = require(path.join(distPath, 'database.js')).DatabaseService;
        PersonalizationEngine = require(path.join(distPath, 'personalization.js')).PersonalizationEngine;
        log('Loaded modules from dist/main');
      } else {
        // Fall back to lib directory (development/DXT)
        const libPath = path.join(__dirname, '..', 'lib');
        DatabaseService = require(path.join(libPath, 'database.js')).DatabaseService;
        PersonalizationEngine = require(path.join(libPath, 'personalization.js')).PersonalizationEngine;
        log('Loaded modules from lib');
      }
    } catch (error) {
      log(`Failed to load database/personalization modules: ${error.message}`);
      dbError = error;
      // Continue with limited functionality instead of throwing
    }
    
    // Initialize database and personalization with error handling
    let database = null;
    let personalization = null;
    
    if (DatabaseService && PersonalizationEngine && !dbError) {
      try {
        database = new DatabaseService(true); // Pass true for MCP mode
        database.initialize();
        personalization = new PersonalizationEngine(database);
        log('Database and personalization initialized');
      } catch (error) {
        log(`Failed to initialize database: ${error.message}`);
        log(`Stack: ${error.stack}`);
        // Continue with null database - tools will return mock data
      }
    } else {
      log('Running in fallback mode - database unavailable');
    }
    
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
        
        try {
          // Check if database is available
          if (!database || !personalization) {
            log('Database not available, returning fallback data');
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'Database temporarily unavailable',
                  message: 'The Shopping for Algolia app database is not accessible. Please ensure the app is installed and has been run at least once.',
                  helpText: 'To use this extension, install and run the Shopping for Algolia Personalized desktop application first.'
                }, null, 2)
              }]
            };
          }
          
          // Get real data from personalization engine
          const profile = await personalization.exportForClaudeDesktop();
          const savedProducts = database.getAllProducts();
          const settings = database.getUserSettings();
          
          // Calculate summary statistics
          const categoryCount = {};
          savedProducts.forEach(product => {
            product.categories?.forEach(cat => {
              categoryCount[cat] = (categoryCount[cat] || 0) + 1;
            });
          });
          
          const favoriteCategories = Object.entries(categoryCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([cat]) => cat);
          
          const prices = savedProducts.map(p => p.price).filter(p => p > 0);
          const priceRange = prices.length > 0 ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
          } : { min: 0, max: 0, avg: 0 };
          
          const lastActivity = database.getLastActivityDate();
          
          const summary = {
            totalProducts: savedProducts.length,
            categoriesInterested: profile.userProfile.categoryPreferences.map(c => c.category),
            priceRange,
            lastActivityDate: lastActivity || 'No activity yet',
            favoriteCategories,
            discoveryMode: settings?.discoveryPercentage || 0,
            confidenceLevel: `${Math.round(profile.insights.confidenceLevel * 100)}%`,
            totalInteractions: profile.insights.totalInteractions
          };
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(summary, null, 2)
            }]
          };
        } catch (error) {
          log(`Error in get_personalization_summary: ${error.message}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to retrieve personalization data',
                message: error.message
              }, null, 2)
            }]
          };
        }
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
        
        try {
          // Check if database is available
          if (!database || !personalization) {
            log('Database not available, returning fallback data');
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'Database temporarily unavailable',
                  message: 'The Shopping for Algolia app database is not accessible. Please ensure the app is installed and has been run at least once.',
                  helpText: 'To use this extension, install and run the Shopping for Algolia Personalized desktop application first.'
                }, null, 2)
              }]
            };
          }
          
          // Get real data from personalization engine
          const profile = await personalization.exportForClaudeDesktop();
          const settings = database.getUserSettings();
          
          // Convert category preferences to percentage format
          const categoryPreferences = {};
          const totalScore = profile.userProfile.categoryPreferences.reduce((sum, cat) => sum + cat.affinity, 0);
          
          profile.userProfile.categoryPreferences.forEach(cat => {
            const percentage = totalScore > 0 ? Math.round((cat.affinity / totalScore) * 100) : 0;
            categoryPreferences[cat.category] = `${percentage}%`;
          });
          
          // Calculate price range from saved products
          const savedProducts = database.getAllProducts();
          const prices = savedProducts.map(p => p.price).filter(p => p > 0);
          const priceRange = prices.length > 0 ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            sweetSpot: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
          } : {
            min: 0,
            max: 1000,
            sweetSpot: 200
          };
          
          const preferences = {
            discoveryMode: settings?.discoveryPercentage ? `${settings.discoveryPercentage}%` : 'disabled',
            categoryPreferences,
            brandAffinities: profile.userProfile.brandAffinities.slice(0, 5),
            priceRange,
            confidenceLevel: `${Math.round(profile.insights.confidenceLevel * 100)}%`,
            totalInteractions: profile.insights.totalInteractions,
            stylePreferences: profile.userProfile.stylePreferences,
            occasionHistory: profile.userProfile.occasionHistory
          };
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(preferences, null, 2)
            }]
          };
        } catch (error) {
          log(`Error in get_user_preferences: ${error.message}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to retrieve user preferences',
                message: error.message
              }, null, 2)
            }]
          };
        }
      }
    );
    
    // Add get_interaction_analytics tool
    server.registerTool(
      'get_interaction_analytics',
      {
        description: 'Get detailed analytics of user interactions with products',
        inputSchema: {},
      },
      async () => {
        log('Tool called: get_interaction_analytics');
        
        try {
          // Get interaction data from database
          const mlData = database.getMLTrainingData();
          const savedProducts = database.getAllProducts();
          const settings = database.getUserSettings();
          
          // Analyze interactions by category
          const categoryInteractions = {};
          const brandInteractions = {};
          const hourlyDistribution = Array(24).fill(0);
          
          mlData.forEach(event => {
            // Category analysis
            if (event.category) {
              if (!categoryInteractions[event.category]) {
                categoryInteractions[event.category] = {
                  clicks: 0,
                  saves: 0,
                  totalWeight: 0
                };
              }
              
              if (event.eventType === 'click') {
                categoryInteractions[event.category].clicks++;
              } else if (event.eventType === 'save') {
                categoryInteractions[event.category].saves++;
              }
              categoryInteractions[event.category].totalWeight += event.weight;
            }
            
            // Brand analysis
            if (event.brand) {
              if (!brandInteractions[event.brand]) {
                brandInteractions[event.brand] = {
                  clicks: 0,
                  saves: 0,
                  totalWeight: 0
                };
              }
              
              if (event.eventType === 'click') {
                brandInteractions[event.brand].clicks++;
              } else if (event.eventType === 'save') {
                brandInteractions[event.brand].saves++;
              }
              brandInteractions[event.brand].totalWeight += event.weight;
            }
            
            // Time distribution
            const hour = new Date(event.timestamp).getHours();
            hourlyDistribution[hour]++;
          });
          
          // Calculate engagement metrics
          const totalInteractions = mlData.length;
          const totalWeight = mlData.reduce((sum, event) => sum + event.weight, 0);
          const avgWeight = totalInteractions > 0 ? totalWeight / totalInteractions : 0;
          
          // Most active times
          const peakHours = hourlyDistribution
            .map((count, hour) => ({ hour, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(item => `${item.hour}:00-${item.hour + 1}:00`);
          
          const analytics = {
            summary: {
              totalInteractions,
              totalWeight: Math.round(totalWeight * 100) / 100,
              averageWeight: Math.round(avgWeight * 100) / 100,
              savedProducts: savedProducts.length,
              discoveryMode: settings?.discoveryPercentage || 0
            },
            categoryEngagement: Object.entries(categoryInteractions)
              .sort(([,a], [,b]) => b.totalWeight - a.totalWeight)
              .slice(0, 10)
              .map(([category, data]) => ({
                category,
                ...data,
                totalWeight: Math.round(data.totalWeight * 100) / 100
              })),
            brandEngagement: Object.entries(brandInteractions)
              .sort(([,a], [,b]) => b.totalWeight - a.totalWeight)
              .slice(0, 10)
              .map(([brand, data]) => ({
                brand,
                ...data,
                totalWeight: Math.round(data.totalWeight * 100) / 100
              })),
            timePatterns: {
              peakHours,
              hourlyDistribution
            }
          };
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(analytics, null, 2)
            }]
          };
        } catch (error) {
          log(`Error in get_interaction_analytics: ${error.message}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to retrieve interaction analytics',
                message: error.message
              }, null, 2)
            }]
          };
        }
      }
    );
    
    // Add suggest_products tool
    server.registerTool(
      'suggest_products',
      {
        description: 'Get personalized product suggestions based on user preferences and context',
        inputSchema: {
          type: 'object',
          properties: {
            context: {
              type: 'string',
              description: 'Shopping context or occasion (e.g., "casual wear", "work from home", "gift")'
            },
            budget: {
              type: 'number',
              description: 'Maximum budget for suggestions'
            },
            category: {
              type: 'string',
              description: 'Specific category to focus on (optional)'
            }
          }
        },
      },
      async (args) => {
        log('Tool called: suggest_products with args:', JSON.stringify(args));
        
        try {
          // Get user profile and preferences
          const profile = await personalization.exportForClaudeDesktop();
          const savedProducts = database.getAllProducts();
          
          // Build suggestions based on user preferences
          const suggestions = [];
          
          // Extract user's top categories and brands
          const topCategories = profile.userProfile.categoryPreferences
            .slice(0, 3)
            .map(c => c.category);
          
          const topBrands = profile.userProfile.brandAffinities
            .slice(0, 3)
            .map(b => b.brand);
          
          // Filter saved products based on context and budget
          let relevantProducts = savedProducts;
          
          if (args.budget) {
            relevantProducts = relevantProducts.filter(p => p.price <= args.budget);
          }
          
          if (args.category) {
            relevantProducts = relevantProducts.filter(p => 
              p.categories?.includes(args.category)
            );
          }
          
          // Score products based on personalization
          const scoredProducts = relevantProducts.map(product => {
            let score = 0;
            
            // Category match
            product.categories?.forEach(cat => {
              const categoryPref = profile.userProfile.categoryPreferences
                .find(c => c.category === cat);
              if (categoryPref) {
                score += categoryPref.affinity * 2;
              }
            });
            
            // Brand match
            const brandPref = profile.userProfile.brandAffinities
              .find(b => b.brand === product.brand);
            if (brandPref) {
              score += brandPref.affinity * 1.5;
            }
            
            // Price range match
            const avgPrice = savedProducts
              .map(p => p.price)
              .filter(p => p > 0)
              .reduce((a, b) => a + b, 0) / savedProducts.length;
            
            const priceDiff = Math.abs(product.price - avgPrice);
            const priceScore = Math.max(0, 1 - priceDiff / avgPrice);
            score += priceScore;
            
            return { product, score };
          });
          
          // Sort by score and take top suggestions
          const topSuggestions = scoredProducts
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(item => ({
              name: item.product.name,
              price: item.product.price,
              brand: item.product.brand,
              categories: item.product.categories,
              reason: server.generateReason(item.product, profile, args.context),
              matchScore: Math.round(item.score * 10) / 10
            }));
          
          // Generate general recommendations
          const recommendations = {
            personalizedSuggestions: topSuggestions,
            searchQueries: server.generateSearchQueries(profile, args),
            shoppingTips: server.generateShoppingTips(profile, args.context)
          };
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(recommendations, null, 2)
            }]
          };
        } catch (error) {
          log(`Error in suggest_products: ${error.message}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to generate product suggestions',
                message: error.message
              }, null, 2)
            }]
          };
        }
      }
    );
    
    // Helper methods for suggest_products
    server.generateReason = function(product, profile, context) {
      const reasons = [];
      
      // Check brand affinity
      const brandMatch = profile.userProfile.brandAffinities
        .find(b => b.brand === product.brand);
      if (brandMatch && brandMatch.affinity > 0.5) {
        reasons.push(`You frequently shop ${product.brand}`);
      }
      
      // Check category preference
      const categoryMatch = product.categories?.find(cat => 
        profile.userProfile.categoryPreferences
          .some(c => c.category === cat && c.affinity > 0.3)
      );
      if (categoryMatch) {
        reasons.push(`Matches your interest in ${categoryMatch}`);
      }
      
      // Context-based reasoning
      if (context && context.toLowerCase().includes('gift')) {
        reasons.push('Popular gift choice in your price range');
      }
      
      return reasons.length > 0 ? reasons.join('; ') : 'Matches your shopping patterns';
    };
    
    server.generateSearchQueries = function(profile, args) {
      const queries = [];
      
      // Top category + context
      if (profile.userProfile.categoryPreferences.length > 0) {
        const topCategory = profile.userProfile.categoryPreferences[0].category;
        if (args.context) {
          queries.push(`${args.context} ${topCategory}`);
        } else {
          queries.push(`best ${topCategory}`);
        }
      }
      
      // Top brand + budget
      if (profile.userProfile.brandAffinities.length > 0) {
        const topBrand = profile.userProfile.brandAffinities[0].brand;
        if (args.budget) {
          queries.push(`${topBrand} under $${args.budget}`);
        } else {
          queries.push(`${topBrand} new arrivals`);
        }
      }
      
      // Style-based query
      if (profile.userProfile.stylePreferences.length > 0) {
        queries.push(`${profile.userProfile.stylePreferences[0]} style`);
      }
      
      return queries.slice(0, 3);
    };
    
    server.generateShoppingTips = function(profile, context) {
      const tips = [];
      
      // Discovery mode tip
      const settings = database.getUserSettings();
      if (settings?.discoveryPercentage === 0) {
        tips.push('Enable Discovery Mode to find new brands and styles');
      }
      
      // Price range tip
      const savedProducts = database.getAllProducts();
      const avgPrice = savedProducts
        .map(p => p.price)
        .filter(p => p > 0)
        .reduce((a, b) => a + b, 0) / savedProducts.length;
      
      if (avgPrice > 0) {
        tips.push(`Your average purchase price is $${Math.round(avgPrice)}`);
      }
      
      // Category diversity tip
      if (profile.userProfile.categoryPreferences.length < 3) {
        tips.push('Explore more categories to improve recommendations');
      }
      
      return tips;
    };
    
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