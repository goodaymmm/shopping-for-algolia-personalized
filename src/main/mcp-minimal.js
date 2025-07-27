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
            categoriesInterested: profile.userProfile?.categoryPreferences?.map(c => c.category) || [],
            priceRange,
            lastActivityDate: lastActivity || 'No activity yet',
            favoriteCategories,
            discoveryMode: settings?.discoveryPercentage || 0,
            confidenceLevel: profile.insights ? `${Math.round(profile.insights.confidenceLevel * 100)}%` : '0%',
            totalInteractions: profile.insights?.totalInteractions || 0
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
          
          // Ensure profile has expected structure
          if (!profile || !profile.userProfile) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'No personalization data available yet',
                  message: 'Start using the app to build your personalization profile'
                }, null, 2)
              }]
            };
          }
          
          // Convert category preferences to percentage format
          const categoryPreferences = {};
          const categories = profile.userProfile.categoryPreferences || [];
          const totalScore = categories.reduce((sum, cat) => sum + cat.affinity, 0);
          
          categories.forEach(cat => {
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
            brandAffinities: (profile.userProfile.brandAffinities || []).slice(0, 5),
            priceRange,
            confidenceLevel: profile.insights ? `${Math.round(profile.insights.confidenceLevel * 100)}%` : '0%',
            totalInteractions: profile.insights?.totalInteractions || 0,
            stylePreferences: profile.userProfile.stylePreferences || [],
            occasionHistory: profile.userProfile.occasionHistory || []
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
          
          // Check if profile exists
          if (!profile || !profile.userProfile) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'No personalization data available',
                  message: 'Save some products first to get personalized suggestions'
                }, null, 2)
              }]
            };
          }
          
          // Build suggestions based on user preferences
          const suggestions = [];
          
          // Extract user's top categories and brands
          const topCategories = (profile.userProfile.categoryPreferences || [])
            .slice(0, 3)
            .map(c => c.category);
          
          const topBrands = (profile.userProfile.brandAffinities || [])
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
    
    // Add get_saved_products tool
    server.registerTool(
      'get_saved_products',
      {
        description: 'Get all saved products with detailed information including price, categories, and structured data',
        inputSchema: {},
      },
      async () => {
        log('Tool called: get_saved_products');
        
        try {
          // Check if database is available
          if (!database) {
            log('Database not available, returning error');
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'Database temporarily unavailable',
                  message: 'The Shopping for Algolia app database is not accessible.'
                }, null, 2)
              }]
            };
          }
          
          // Get all saved products
          const products = database.getAllProducts();
          
          // Calculate price statistics
          const prices = products.map(p => p.price).filter(p => p > 0);
          const priceRange = prices.length > 0 ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            average: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
          } : { min: 0, max: 0, average: 0 };
          
          // Transform products for output
          const transformedProducts = products.map(product => {
            // Parse categories if they're stored as JSON string
            let categories = [];
            try {
              if (typeof product.category === 'string' && product.category.startsWith('[')) {
                categories = JSON.parse(product.category);
              } else if (Array.isArray(product.categories)) {
                categories = product.categories;
              } else if (product.category) {
                categories = [product.category];
              }
            } catch (e) {
              categories = [product.category || 'uncategorized'];
            }
            
            // Parse algolia_data for structured information
            let structuredData = {};
            try {
              if (product.algolia_data) {
                const algoliaData = JSON.parse(product.algolia_data);
                structuredData = {
                  id: algoliaData.id || product.product_id,
                  description: algoliaData.description || product.description,
                  imageUrl: algoliaData.image || product.image_url,
                  productUrl: algoliaData.url || product.url,
                  sourceIndex: algoliaData.sourceIndex || 'products',
                  originalData: algoliaData
                };
              } else {
                structuredData = {
                  id: product.product_id,
                  description: product.description,
                  imageUrl: product.image_url,
                  productUrl: product.url,
                  sourceIndex: 'products'
                };
              }
            } catch (e) {
              structuredData = {
                id: product.product_id,
                description: product.description,
                imageUrl: product.image_url,
                productUrl: product.url
              };
            }
            
            return {
              name: product.name || product.custom_name,
              price: product.price,
              categories: categories,
              brand: product.brand || 'Unknown',
              savedDate: product.created_at,
              structuredData: structuredData
            };
          });
          
          const result = {
            products: transformedProducts,
            totalCount: products.length,
            priceRange: priceRange
          };
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          log(`Error in get_saved_products: ${error.message}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to retrieve saved products',
                message: error.message
              }, null, 2)
            }]
          };
        }
      }
    );
    
    // Add get_product_comparisons tool
    server.registerTool(
      'get_product_comparisons',
      {
        description: 'Compare saved products within the same categories',
        inputSchema: {},
      },
      async () => {
        log('Tool called: get_product_comparisons');
        
        try {
          // Check if database is available
          if (!database) {
            log('Database not available, returning error');
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'Database temporarily unavailable',
                  message: 'The Shopping for Algolia app database is not accessible.'
                }, null, 2)
              }]
            };
          }
          
          // Get all saved products
          const products = database.getAllProducts();
          
          // Group products by category
          const categoryGroups = {};
          
          products.forEach(product => {
            // Parse categories
            let categories = [];
            try {
              if (typeof product.category === 'string' && product.category.startsWith('[')) {
                categories = JSON.parse(product.category);
              } else if (Array.isArray(product.categories)) {
                categories = product.categories;
              } else if (product.category) {
                categories = [product.category];
              }
            } catch (e) {
              categories = [product.category || 'uncategorized'];
            }
            
            // Add product to each category group
            categories.forEach(category => {
              if (!categoryGroups[category]) {
                categoryGroups[category] = [];
              }
              categoryGroups[category].push({
                name: product.name || product.custom_name,
                price: product.price,
                brand: product.brand || 'Unknown',
                savedDate: product.created_at
              });
            });
          });
          
          // Create comparisons for each category
          const comparisons = {};
          
          Object.entries(categoryGroups).forEach(([category, categoryProducts]) => {
            if (categoryProducts.length > 1) { // Only compare if there are multiple products
              const prices = categoryProducts.map(p => p.price).filter(p => p > 0);
              
              // Calculate price statistics
              const priceStats = prices.length > 0 ? {
                average: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
                median: Math.round(prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]),
                lowest: Math.min(...prices),
                highest: Math.max(...prices)
              } : null;
              
              // Calculate brand distribution
              const brandDistribution = {};
              categoryProducts.forEach(product => {
                const brand = product.brand;
                brandDistribution[brand] = (brandDistribution[brand] || 0) + 1;
              });
              
              comparisons[category] = {
                products: categoryProducts.sort((a, b) => a.price - b.price),
                priceStats: priceStats,
                brandDistribution: brandDistribution,
                productCount: categoryProducts.length
              };
            }
          });
          
          const result = {
            comparisons: comparisons,
            totalCategories: Object.keys(comparisons).length,
            totalProducts: products.length
          };
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          log(`Error in get_product_comparisons: ${error.message}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to generate product comparisons',
                message: error.message
              }, null, 2)
            }]
          };
        }
      }
    );
    
    // Add get_shopping_insights tool
    server.registerTool(
      'get_shopping_insights',
      {
        description: 'Get comprehensive shopping insights and analysis',
        inputSchema: {},
      },
      async () => {
        log('Tool called: get_shopping_insights');
        
        try {
          // Check if database is available
          if (!database || !personalization) {
            log('Database not available, returning error');
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'Database temporarily unavailable',
                  message: 'The Shopping for Algolia app database is not accessible.'
                }, null, 2)
              }]
            };
          }
          
          // Get all data sources
          const products = database.getAllProducts();
          const mlData = database.getMLTrainingData();
          const profile = await personalization.exportForClaudeDesktop();
          const settings = database.getUserSettings();
          
          // Calculate total spent
          const totalSpent = products.reduce((sum, p) => sum + (p.price || 0), 0);
          const averagePrice = products.length > 0 ? Math.round(totalSpent / products.length) : 0;
          
          // Analyze favorite categories
          const categoryCount = {};
          products.forEach(product => {
            let categories = [];
            try {
              if (typeof product.category === 'string' && product.category.startsWith('[')) {
                categories = JSON.parse(product.category);
              } else if (Array.isArray(product.categories)) {
                categories = product.categories;
              } else if (product.category) {
                categories = [product.category];
              }
            } catch (e) {
              categories = [product.category || 'uncategorized'];
            }
            categories.forEach(cat => {
              categoryCount[cat] = (categoryCount[cat] || 0) + 1;
            });
          });
          
          const favoriteCategories = Object.entries(categoryCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([cat]) => cat);
          
          // Analyze favorite brands
          const brandCount = {};
          products.forEach(product => {
            const brand = product.brand || 'Unknown';
            brandCount[brand] = (brandCount[brand] || 0) + 1;
          });
          
          const favoriteBrands = Object.entries(brandCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([brand]) => brand);
          
          // Determine price preference
          let pricePreference = 'balanced';
          if (averagePrice < 50) {
            pricePreference = 'budget-conscious';
          } else if (averagePrice > 200) {
            pricePreference = 'premium-focused';
          }
          
          // Analyze shopping patterns
          const shoppingPatterns = {
            mostActiveCategory: favoriteCategories[0] || 'none',
            priceRange: averagePrice < 50 ? 'under $50' : averagePrice < 100 ? '$50-$100' : averagePrice < 200 ? '$100-$200' : 'over $200',
            brandLoyalty: Object.keys(brandCount).length === 1 ? 'high' : Object.keys(brandCount).length <= 3 ? 'medium' : 'low',
            discoveryMode: settings?.discoveryPercentage > 20 ? 'explorer' : settings?.discoveryPercentage > 0 ? 'moderate' : 'conservative'
          };
          
          // Generate recommendations based on data
          const recommendations = [];
          
          if (favoriteCategories.length > 0) {
            recommendations.push(`Strong interest in ${favoriteCategories[0]} category`);
          }
          
          if (pricePreference === 'budget-conscious') {
            recommendations.push(`Price-conscious shopper (average: $${averagePrice})`);
          } else if (pricePreference === 'premium-focused') {
            recommendations.push(`Premium product preference (average: $${averagePrice})`);
          }
          
          if (shoppingPatterns.brandLoyalty === 'low') {
            recommendations.push('Enjoys exploring different brands');
          } else if (shoppingPatterns.brandLoyalty === 'high') {
            recommendations.push(`Strong brand loyalty to ${favoriteBrands[0]}`);
          }
          
          if (mlData.length > 10) {
            recommendations.push('Active user with rich interaction history');
          }
          
          const insights = {
            totalProducts: products.length,
            totalSpent: totalSpent,
            averagePrice: averagePrice,
            favoriteCategories: favoriteCategories,
            favoriteBrands: favoriteBrands,
            pricePreference: pricePreference,
            shoppingPatterns: shoppingPatterns,
            recommendations: recommendations,
            confidenceLevel: profile.insights?.confidenceLevel || 0,
            discoveryMode: settings?.discoveryPercentage || 0
          };
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ insights }, null, 2)
            }]
          };
        } catch (error) {
          log(`Error in get_shopping_insights: ${error.message}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to generate shopping insights',
                message: error.message
              }, null, 2)
            }]
          };
        }
      }
    );
    
    // Add search_products tool
    server.registerTool(
      'search_products',
      {
        description: 'Search for products using Algolia with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            },
            filters: {
              type: 'object',
              properties: {
                maxPrice: {
                  type: 'number',
                  description: 'Maximum price filter'
                },
                category: {
                  type: 'string',
                  description: 'Category filter'
                },
                brand: {
                  type: 'string',
                  description: 'Brand filter'
                }
              }
            }
          },
          required: ['query']
        },
      },
      async (args) => {
        log('Tool called: search_products with args:', JSON.stringify(args));
        
        try {
          // Note: This is a simplified implementation since we can't directly access AlgoliaMCPService from here
          // In a real implementation, this would need to communicate with the main process
          // For now, we'll return a message indicating how this feature would work
          
          const response = {
            message: 'Product search via MCP',
            note: 'This feature requires integration with the main Shopping app to perform Algolia searches.',
            suggestedUsage: 'Use the Shopping for Algolia app directly to search and save products, then use the MCP tools to analyze your saved products.',
            requestedQuery: args.query,
            requestedFilters: args.filters || {},
            alternativeTools: [
              'get_saved_products - View all your saved products',
              'get_product_comparisons - Compare products within categories',
              'suggest_products - Get personalized product suggestions'
            ]
          };
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error) {
          log(`Error in search_products: ${error.message}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to search products',
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