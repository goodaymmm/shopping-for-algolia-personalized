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
// OptimizedDataLoader is imported dynamically when needed

interface AlgoliaConfig {
  applicationId: string;
  apiKey: string;
  indexName: string;
}

// 統合検索用のカテゴリ別インデックスマッピング
interface CategoryIndexMapping {
  [category: string]: string;
}

// 統合検索用の設定
interface MultiSearchConfig {
  applicationId: string;
  apiKey: string;
  writeApiKey?: string;
  indexMappings: CategoryIndexMapping;
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

interface AlgoliaMCPMultiSearchResult {
  results: AlgoliaMCPSearchResult[];
}

export class AlgoliaMCPService {
  private server: Server;
  private ajv: Ajv;
  private config: AlgoliaConfig | null = null;
  private multiSearchConfig: MultiSearchConfig | null = null;
  private initializedIndices = new Set<string>();

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

  async initializeMultiSearch(config: MultiSearchConfig): Promise<boolean> {
    try {
      console.log('[AlgoliaMCP] Initializing multi-search with config:', {
        applicationId: config.applicationId,
        indexMappings: Object.keys(config.indexMappings),
        hasApiKey: !!config.apiKey
      });
      this.multiSearchConfig = config;
      console.log('[AlgoliaMCP] Successfully initialized multi-search');
      return true;
    } catch (error) {
      console.error('[AlgoliaMCP] Failed to initialize multi-search:', error);
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
      // MCPに合わせたリクエスト形式に修正
      const searchRequest = {
        indexName: params.indexName,
        query: params.query,
        hitsPerPage: params.hitsPerPage || 20,
        page: params.page || 0,
        attributesToRetrieve: params.attributesToRetrieve || [
          'name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'
        ],
        filters: params.filters
      };

      // 複数クエリ対応のエンドポイントを使用
      const requestBody = {
        requests: [searchRequest]
      };

      console.log('[AlgoliaMCP] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(
        `https://${this.config.applicationId}-dsn.algolia.net/1/indexes/*/queries`,
        {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': this.config.apiKey,
            'X-Algolia-Application-Id': this.config.applicationId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      console.log('[AlgoliaMCP] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AlgoliaMCP] API error response:', errorText);
        throw new Error(`Algolia API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as AlgoliaMCPMultiSearchResult;
      console.log('[AlgoliaMCP] Raw response:', JSON.stringify(data, null, 2));
      
      // 複数クエリレスポンスの最初の結果を取得
      const searchResult = data.results?.[0];
      
      if (!searchResult) {
        console.warn('[AlgoliaMCP] No search result in response');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ hits: [], nbHits: 0 }, null, 2)
            }
          ]
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(searchResult, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('[AlgoliaMCP] Search error:', error);
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
      
      const data = JSON.parse(resultText);
      console.log('[AlgoliaMCP] Parsed data:', data);
      
      // 複数クエリレスポンスの場合、最初の結果を取得
      const searchData = data.results ? data.results[0] : data;
      console.log('[AlgoliaMCP] Search data:', {
        hits: searchData.hits?.length || 0,
        nbHits: searchData.nbHits,
        processingTimeMS: searchData.processingTimeMS
      });

      const products = searchData.hits.map((hit: any) => ({
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

  // 統合検索：複数のインデックスから並列検索
  async searchProductsMultiIndex(
    query: string, 
    categories?: string[],
    additionalParams?: {
      hitsPerPage?: number;
      filters?: string;
      attributesToRetrieve?: string[];
      searchType?: 'exact' | 'fuzzy' | 'brand';
    }
  ): Promise<Product[]> {
    console.log('[AlgoliaMCP] Starting multi-index search...');
    console.log('[AlgoliaMCP] Query:', query);
    console.log('[AlgoliaMCP] Categories:', categories);
    console.log('[AlgoliaMCP] Params:', additionalParams);
    
    if (!this.multiSearchConfig) {
      console.warn('[AlgoliaMCP] Multi-search not initialized, falling back to single index');
      return this.config ? this.searchProducts(query, this.config.indexName, additionalParams) : [];
    }

    try {
      // カテゴリが指定されていない場合は全てのインデックスを検索
      const indicesToSearch = categories && categories.length > 0
        ? categories.map(cat => this.multiSearchConfig!.indexMappings[cat]).filter(idx => idx)
        : Object.values(this.multiSearchConfig.indexMappings);

      console.log('[AlgoliaMCP] Searching indices:', indicesToSearch);

      // 複数インデックスの検索リクエストを作成
      const searchRequests = indicesToSearch.map(indexName => {
        const baseRequest = {
          indexName,
          query,
          hitsPerPage: additionalParams?.hitsPerPage || 20,
          page: 0,
          attributesToRetrieve: additionalParams?.attributesToRetrieve || [
            'name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'
          ],
          filters: additionalParams?.filters
        };

        // 検索タイプに応じて設定を追加
        const searchType = additionalParams?.searchType || 'fuzzy';
        
        if (searchType === 'exact') {
          // 完全一致検索設定
          return {
            ...baseRequest,
            typoTolerance: 'min',
            minWordSizefor1Typo: 10,
            minWordSizefor2Typos: 12
          };
        } else if (searchType === 'brand') {
          // ブランド検索設定
          const brandKeywords = ['Nike', 'Adidas', 'Apple', 'Samsung', 'Sony', 'Microsoft', 'Dell', 'HP'];
          const isBrandQuery = brandKeywords.some(brand => 
            query.toLowerCase().includes(brand.toLowerCase())
          );
          
          return {
            ...baseRequest,
            typoTolerance: isBrandQuery ? 'min' : 'strict',
            minWordSizefor1Typo: 8,
            minWordSizefor2Typos: 10
          };
        }
        
        // デフォルトのfuzzy検索
        return baseRequest;
      });

      const requestBody = {
        requests: searchRequests
      };

      console.log('[AlgoliaMCP] Multi-search request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(
        `https://${this.multiSearchConfig.applicationId}-dsn.algolia.net/1/indexes/*/queries`,
        {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': this.multiSearchConfig.apiKey,
            'X-Algolia-Application-Id': this.multiSearchConfig.applicationId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      console.log('[AlgoliaMCP] Multi-search response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AlgoliaMCP] Multi-search API error response:', errorText);
        throw new Error(`Algolia multi-search API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as AlgoliaMCPMultiSearchResult;
      console.log('[AlgoliaMCP] Multi-search raw response:', JSON.stringify(data, null, 2));

      // 全ての結果を統合
      const allProducts: Product[] = [];
      
      data.results.forEach((result, index) => {
        const indexName = indicesToSearch[index];
        console.log(`[AlgoliaMCP] Processing results from ${indexName}:`, {
          hits: result.hits?.length || 0,
          nbHits: result.nbHits,
          processingTimeMS: result.processingTimeMS
        });

        const products = result.hits.map((hit: any) => ({
          id: hit.objectID,
          name: hit.name || 'Unknown Product',
          description: hit.description || '',
          price: hit.price || hit.salePrice || 0,
          image: hit.image || this.getDefaultProductImage(),
          categories: hit.categories || [],
          url: hit.url || '',
          sourceIndex: indexName // 検索元インデックスを追加
        }));

        allProducts.push(...products);
      });

      console.log('[AlgoliaMCP] Multi-search returning', allProducts.length, 'products from', data.results.length, 'indices');
      return allProducts;

    } catch (error) {
      console.error('[AlgoliaMCP] Multi-search error:', error);
      console.error('[AlgoliaMCP] Multi-search error details:', {
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

  // 標準インデックスの自動作成
  async ensureIndicesExist(): Promise<void> {
    if (!this.multiSearchConfig) {
      console.warn('[AlgoliaMCP] Multi-search config not initialized, skipping index creation');
      return;
    }

    if (!this.multiSearchConfig.writeApiKey) {
      console.warn('[AlgoliaMCP] Write API Key not available, skipping index creation');
      return;
    }

    // Check if indices are already initialized (only skip if we don't have write access)
    const configKey = `${this.multiSearchConfig.applicationId}-${this.multiSearchConfig.writeApiKey.substring(0, 8)}`;
    if (this.initializedIndices.has(configKey) && !this.multiSearchConfig.writeApiKey) {
      console.log('[AlgoliaMCP] Indices already initialized and no write API key available, skipping creation');
      return;
    }
    
    if (this.initializedIndices.has(configKey)) {
      console.log('[AlgoliaMCP] Indices marked as initialized, but checking if data needs to be loaded...');
    }

    console.log('[AlgoliaMCP] Checking and creating standard indices with Write API Key...');
    
    try {
      // 標準インデックスリストを取得
      const standardIndices = Object.values(this.multiSearchConfig.indexMappings);
      const uniqueIndices = [...new Set(standardIndices)]; // 重複を除去

      for (const indexName of uniqueIndices) {
        try {
          console.log(`[AlgoliaMCP] Ensuring index '${indexName}' exists...`);
          
          // インデックスの設定を作成（ブランド検索最適化）
          const indexSettings = {
            searchableAttributes: [
              'brand',           // ブランド名を最優先
              'name', 
              'description', 
              'categories'
            ],
            attributesForFaceting: ['categories', 'brand'],
            customRanking: ['desc(price)'],
            attributesToHighlight: ['name', 'description', 'brand'],
            attributesToSnippet: ['description:20'],
            typoTolerance: 'min',  // タイポ許容を最小化
            minWordSizefor1Typo: 8,
            minWordSizefor2Typos: 10,
            disableTypoToleranceOnAttributes: ['brand'], // ブランド属性ではタイポ許容を無効
            exactOnSingleWordQuery: 'word'  // 単一単語クエリでは完全一致を優先
          };

          const response = await fetch(
            `https://${this.multiSearchConfig.applicationId}-dsn.algolia.net/1/indexes/${indexName}/settings`,
            {
              method: 'PUT',
              headers: {
                'X-Algolia-API-Key': this.multiSearchConfig.writeApiKey!,
                'X-Algolia-Application-Id': this.multiSearchConfig.applicationId,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(indexSettings)
            }
          );

          if (response.ok) {
            const result = await response.json() as { taskID?: number };
            console.log(`[AlgoliaMCP] Index '${indexName}' created successfully. TaskID:`, result.taskID);
          } else {
            const errorText = await response.text();
            console.warn(`[AlgoliaMCP] Failed to create index '${indexName}':`, response.status, errorText);
          }
        } catch (error) {
          console.warn(`[AlgoliaMCP] Error ensuring index '${indexName}':`, error);
        }
      }

      console.log('[AlgoliaMCP] Standard indices setup completed');
      
      // Mark indices as initialized
      this.initializedIndices.add(configKey);
      
      // サンプルデータの投入
      await this.loadSampleDataIfNeeded();
    } catch (error) {
      console.error('[AlgoliaMCP] Error during index creation:', error);
    }
  }

  // 初回のみサンプルデータを投入
  private async loadSampleDataIfNeeded(): Promise<void> {
    try {
      // productsインデックスでデータの存在を確認
      const response = await fetch(
        `https://${this.multiSearchConfig!.applicationId}-dsn.algolia.net/1/indexes/products/search`,
        {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': this.multiSearchConfig!.apiKey,
            'X-Algolia-Application-Id': this.multiSearchConfig!.applicationId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: '',
            hitsPerPage: 1
          })
        }
      );

      if (response.ok) {
        const searchResult = await response.json() as { nbHits: number };
        if (searchResult.nbHits > 0) {
          console.log('[AlgoliaMCP] Data already exists in index, skipping import');
          return;
        }
        console.log('[AlgoliaMCP] Index is empty (nbHits: 0), proceeding with data import...');
      } else {
        console.log('[AlgoliaMCP] Failed to check index status, proceeding with data import...');
      }

      // データが存在しない場合、最適化されたデータを投入
      console.log('[AlgoliaMCP] No data found, starting optimized data import...');
      const { OptimizedDataLoader } = require('./optimized-data-loader');
      const dataLoader = new OptimizedDataLoader(
        this.multiSearchConfig!.applicationId,
        this.multiSearchConfig!.writeApiKey!
      );
      
      await dataLoader.loadOptimizedData();
      console.log('[AlgoliaMCP] Optimized data import completed');
    } catch (error) {
      console.error('[AlgoliaMCP] Error during sample data loading:', error);
      // エラーが発生してもアプリケーションは継続
    }
  }

  async connect(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async close(): Promise<void> {
    await this.server.close();
  }
}