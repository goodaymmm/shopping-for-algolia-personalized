import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import Ajv from 'ajv';
import { Product } from '../shared/types';

interface AlgoliaConfig {
  applicationId: string;
  apiKey: string;
  indexName: string;
}

interface AlgoliaMCPSearchResult {
  hits: Array<{
    objectID: string;
    name?: string;
    description?: string;
    price?: number;
    salePrice?: number;
    image?: string;
    categories?: string[];
    url?: string;
    [key: string]: unknown;
  }>;
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  exhaustiveTypo: boolean;
  exhaustive: {
    nbHits: boolean;
    typo: boolean;
  };
  query: string;
  params: string;
  processingTimeMS: number;
}

export class AlgoliaMCPService {
  private server: Server;
  private ajv: Ajv;
  private config: AlgoliaConfig | null = null;

  constructor() {
    this.ajv = new Ajv();
    this.server = new Server(
      {
        name: 'algolia-mcp-service',
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

  async initialize(config: AlgoliaConfig): Promise<boolean> {
    try {
      console.log('[AlgoliaMCP] Initializing with config:', {
        applicationId: config.applicationId,
        indexName: config.indexName,
        hasApiKey: !!config.apiKey
      });
      this.config = config;
      console.log('[AlgoliaMCP] Successfully initialized');
      return true;
    } catch (error) {
      console.error('[AlgoliaMCP] Failed to initialize:', error);
      return false;
    }
  }

  private setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'searchForHits',
            description: 'Search for products in Algolia index',
            inputSchema: {
              type: 'object',
              properties: {
                indexName: {
                  type: 'string',
                  description: 'Name of the Algolia index to search'
                },
                query: {
                  type: 'string',
                  description: 'Search query'
                },
                hitsPerPage: {
                  type: 'number',
                  description: 'Number of hits per page',
                  default: 20
                },
                page: {
                  type: 'number',
                  description: 'Page number',
                  default: 0
                },
                attributesToRetrieve: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Attributes to retrieve'
                },
                filters: {
                  type: 'string',
                  description: 'Filters to apply'
                }
              },
              required: ['indexName', 'query']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'searchForHits':
          return await this.handleSearchForHits(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleSearchForHits(args: unknown): Promise<CallToolResult> {
    if (!this.config) {
      throw new Error('Algolia MCP service not initialized');
    }

    const params = args as {
      indexName: string;
      query: string;
      hitsPerPage?: number;
      page?: number;
      attributesToRetrieve?: string[];
      filters?: string;
    };

    try {
      const searchParams = {
        query: params.query,
        hitsPerPage: params.hitsPerPage || 20,
        page: params.page || 0,
        attributesToRetrieve: params.attributesToRetrieve || [
          'name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'
        ],
        filters: params.filters
      };

      const response = await fetch(
        `https://${this.config.applicationId}-dsn.algolia.net/1/indexes/${params.indexName}/query`,
        {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': this.config.apiKey,
            'X-Algolia-Application-Id': this.config.applicationId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(searchParams)
        }
      );

      if (!response.ok) {
        throw new Error(`Algolia API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as AlgoliaMCPSearchResult;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('Algolia MCP search error:', error);
      throw error;
    }
  }

  async searchProducts(query: string, indexName: string, additionalParams?: {
    hitsPerPage?: number;
    filters?: string;
    attributesToRetrieve?: string[];
  }): Promise<Product[]> {
    console.log('[AlgoliaMCP] Starting search...');
    console.log('[AlgoliaMCP] Query:', query);
    console.log('[AlgoliaMCP] Index:', indexName);
    console.log('[AlgoliaMCP] Params:', additionalParams);
    
    if (!this.config) {
      const error = 'Algolia MCP service not initialized';
      console.error('[AlgoliaMCP]', error);
      throw new Error(error);
    }

    try {
      console.log('[AlgoliaMCP] Calling handleSearchForHits...');
      const searchResult = await this.handleSearchForHits({
        indexName,
        query,
        hitsPerPage: additionalParams?.hitsPerPage || 20,
        attributesToRetrieve: additionalParams?.attributesToRetrieve || [
          'name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'
        ],
        filters: additionalParams?.filters
      });

      console.log('[AlgoliaMCP] Search result received');
      const resultText = searchResult.content[0].text as string;
      console.log('[AlgoliaMCP] Result text length:', resultText.length);
      
      const data = JSON.parse(resultText) as AlgoliaMCPSearchResult;
      console.log('[AlgoliaMCP] Parsed data:', {
        hits: data.hits?.length || 0,
        nbHits: data.nbHits,
        processingTimeMS: data.processingTimeMS
      });

      const products = data.hits.map(hit => ({
        id: hit.objectID,
        name: hit.name || 'Unknown Product',
        description: hit.description || '',
        price: hit.price || hit.salePrice || 0,
        image: hit.image || this.getDefaultProductImage(),
        categories: hit.categories || [],
        url: hit.url || ''
      }));
      
      console.log('[AlgoliaMCP] Returning', products.length, 'products');
      return products;
    } catch (error) {
      console.error('[AlgoliaMCP] Product search error:', error);
      console.error('[AlgoliaMCP] Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
      return [];
    }
  }

  private getDefaultProductImage(): string {
    // Default product image as base64 encoded SVG
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2UwZTBlMCIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
  }

  async connect(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async close(): Promise<void> {
    await this.server.close();
  }
}