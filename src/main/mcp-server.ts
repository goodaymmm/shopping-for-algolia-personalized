import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { PersonalizationEngine } from './personalization';
import { AlgoliaMCPService } from './algolia-mcp-service';

export class ShoppingMCPServer {
  private server: Server;
  private personalization: PersonalizationEngine;
  private algoliaMCPService: AlgoliaMCPService;

  constructor(personalizationEngine: PersonalizationEngine) {
    this.personalization = personalizationEngine;
    this.algoliaMCPService = new AlgoliaMCPService();
    
    this.server = new Server(
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

    this.setupTools();
  }

  private setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'personalized_product_search',
            description: 'Search for products using personalized data from Shopping for AIgolia (Read-only, no ML accumulation)',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Product search query'
                },
                context: {
                  type: 'string',
                  description: 'Shopping context (casual, work, party, etc.)',
                  optional: true
                },
                budget_max: {
                  type: 'number',
                  description: 'Maximum budget',
                  optional: true
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_personalization_summary',
            description: 'Get summary of user\'s shopping personalization data',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'search_by_style',
            description: 'Search products based on user\'s style preferences',
            inputSchema: {
              type: 'object',
              properties: {
                style: {
                  type: 'string',
                  description: 'Style preference (casual, formal, sporty, etc.)'
                },
                occasion: {
                  type: 'string',
                  description: 'Occasion (work, party, casual, etc.)',
                  optional: true
                }
              },
              required: ['style']
            }
          }
        ] as Tool[]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'personalized_product_search':
          return await this.handlePersonalizedSearch(request.params.arguments);
        
        case 'get_personalization_summary':
          return await this.handlePersonalizationSummary();
        
        case 'search_by_style':
          return await this.handleStyleSearch(request.params.arguments);
        
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  private async handlePersonalizedSearch(args: any) {
    try {
      // Load user profile from ML data (read-only)
      const userProfile = await this.personalization.getUserProfile();
      
      if (userProfile.confidenceLevel < 0.1) {
        return {
          content: [{
            type: 'text',
            text: `No personalization data available yet. Please use the Shopping for AIgolia personalized app to build your preferences first.
            
You can still search, but results won't be personalized.`
          }]
        };
      }

      // Initialize Algolia MCP service
      await this.algoliaMCPService.initialize({
        applicationId: 'latency',
        apiKey: '6be0576ff61c053d5f9a3225e2a90f76',
        indexName: 'bestbuy'
      });

      // Create an optimized search query based on personalization
      const optimizedQuery = this.optimizeQueryWithPersonalization(
        args.query,
        args.context,
        userProfile
      );

      // Perform search (read-only, no ML data saving)
      const results = await this.algoliaMCPService.searchProducts(optimizedQuery, 'bestbuy');

      // Score and rerank results based on user profile
      const scoredResults = await Promise.all(
        results.slice(0, 10).map(async (product) => ({
          ...product,
          personalizedScore: await this.personalization.calculateProductScore(product, userProfile)
        }))
      );

      // Sort by personalized score
      scoredResults.sort((a, b) => b.personalizedScore - a.personalizedScore);

      return {
        content: [{
          type: 'text',
          text: this.formatPersonalizedResults(scoredResults, args.query, userProfile)
        }]
      };

    } catch (error) {
      console.error('Personalized search error:', error);
      return {
        content: [{
          type: 'text',
          text: `Sorry, there was an error with the personalized search: ${(error as Error).message}`
        }]
      };
    }
  }

  private async handlePersonalizationSummary() {
    try {
      const profile = await this.personalization.getUserProfile();
      
      if (profile.confidenceLevel < 0.1) {
        return {
          content: [{
            type: 'text',
            text: `# Your Shopping Personalization Profile

**Status**: No personalization data available yet.

To build your personalization profile:
1. Use the Shopping for AIgolia personalized app
2. Search for products and interact with results
3. Save products you like
4. Return here for personalized recommendations

The more you use the app, the better I can understand your preferences!`
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: this.formatPersonalizationSummary(profile)
        }]
      };

    } catch (error) {
      console.error('Personalization summary error:', error);
      return {
        content: [{
          type: 'text',
          text: `Error retrieving personalization data: ${(error as Error).message}`
        }]
      };
    }
  }

  private async handleStyleSearch(args: any) {
    try {
      const userProfile = await this.personalization.getUserProfile();
      
      // Build style-based search query
      let searchQuery = args.style;
      if (args.occasion) {
        searchQuery += ` ${args.occasion}`;
      }

      // Add user's preferred attributes if available
      if (userProfile.confidenceLevel > 0.3) {
        const topCategories = Object.entries(userProfile.categoryScores)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 2)
          .map(([category]) => category);
        
        if (topCategories.length > 0) {
          searchQuery += ` ${topCategories.join(' ')}`;
        }
      }

      // Initialize Algolia MCP service
      await this.algoliaMCPService.initialize({
        applicationId: 'latency',
        apiKey: '6be0576ff61c053d5f9a3225e2a90f76',
        indexName: 'bestbuy'
      });

      const results = await this.algoliaMCPService.searchProducts(searchQuery, 'bestbuy');
      
      return {
        content: [{
          type: 'text',
          text: this.formatStyleSearchResults(results, args.style, args.occasion)
        }]
      };

    } catch (error) {
      console.error('Style search error:', error);
      return {
        content: [{
          type: 'text',
          text: `Error with style search: ${(error as Error).message}`
        }]
      };
    }
  }

  private optimizeQueryWithPersonalization(
    query: string,
    context: string | undefined,
    userProfile: any
  ): string {
    let optimizedQuery = query;

    // Add context-based keywords
    if (context) {
      optimizedQuery += ` ${context}`;
    }

    // Add user's top categories if confidence is high enough
    if (userProfile.confidenceLevel > 0.3) {
      const topCategories = Object.entries(userProfile.categoryScores)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 2)
        .map(([category]) => category);
      
      if (topCategories.length > 0) {
        optimizedQuery += ` ${topCategories.join(' ')}`;
      }
    }

    return optimizedQuery;
  }

  private formatPersonalizedResults(results: any[], originalQuery: string, userProfile: any): string {
    const topCategories = Object.entries(userProfile.categoryScores)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([category]) => category);

    return `# Personalized Search Results for "${originalQuery}"

## Your Preferences Applied
- **Favorite Categories**: ${topCategories.join(', ') || 'Still learning'}
- **Budget Sweet Spot**: $${userProfile.pricePreference.sweetSpot}
- **Confidence Level**: ${(userProfile.confidenceLevel * 100).toFixed(0)}%

## Results (${results.length} products found)

${results.slice(0, 8).map((product, index) => `
**${index + 1}. ${product.name}**
- Price: $${product.price}
- Categories: ${product.categories?.join(', ') || 'N/A'}
- Personalized Score: ${(product.personalizedScore * 100).toFixed(0)}%
- ${product.url ? `[View Product](${product.url})` : 'No link available'}
`).join('')}

---
📊 **Personalization Info**: Based on ${userProfile.interactionHistory.totalSaves} saved items and ${userProfile.interactionHistory.totalClicks} product clicks from your Shopping for AIgolia app usage.

⚠️  **Note**: This is read-only access. To update your preferences:
- Use the Shopping for AIgolia personalized app
- Save more products you like
- Your preferences will automatically improve over time
`;
  }

  private formatPersonalizationSummary(profile: any): string {
    const topCategories = Object.entries(profile.categoryScores)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([category, score]) => `- ${category}: ${((score as number) * 100).toFixed(0)}%`);

    const topColors = Object.entries(profile.stylePreference.colors)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([color]) => color);

    const topOccasions = Object.entries(profile.stylePreference.occasions)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([occasion]) => occasion);

    return `# Your Shopping Personalization Profile

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
🚀 **Improve Your Profile**: Use the Shopping for AIgolia personalized app more to get better recommendations!

📈 **Data Source**: Shopping for AIgolia personalized (Local ML data)
🔒 **Privacy**: All data stored locally on your device
`;
  }

  private formatStyleSearchResults(results: any[], style: string, occasion?: string): string {
    return `# Style-Based Search Results

**Style**: ${style}${occasion ? `\n**Occasion**: ${occasion}` : ''}

## Found ${results.length} products

${results.slice(0, 10).map((product, index) => `
**${index + 1}. ${product.name}**
- Price: $${product.price}
- Categories: ${product.categories?.join(', ') || 'N/A'}
${product.url ? `- [View Product](${product.url})` : ''}
`).join('')}

---
💡 **Tip**: For more personalized results, use "personalized_product_search" instead!
`;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Shopping MCP Server started on stdio');
  }
}

// Export function to create and start server
export async function createMCPServer(personalizationEngine: PersonalizationEngine) {
  const server = new ShoppingMCPServer(personalizationEngine);
  await server.start();
  return server;
}