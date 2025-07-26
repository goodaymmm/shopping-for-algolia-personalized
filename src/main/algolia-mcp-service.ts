import { Product } from '../shared/types';
import { AlgoliaMCPClient } from './algolia-mcp-client';

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

interface AlgoliaConfig {
  applicationId: string;
  apiKey: string;
  indexName: string;
}

export class AlgoliaMCPService {
  private config: AlgoliaConfig | null = null;
  private multiSearchConfig: MultiSearchConfig | null = null;
  private mcpClient: AlgoliaMCPClient;
  private initializedIndices = new Set<string>();

  constructor() {
    this.mcpClient = new AlgoliaMCPClient();
  }

  async initialize(config: AlgoliaConfig): Promise<boolean> {
    try {
      console.log('[AlgoliaMCP] Initializing with config:', {
        applicationId: config.applicationId,
        indexName: config.indexName,
        hasApiKey: !!config.apiKey
      });
      this.config = config;
      
      // Initialize MCP client
      await this.mcpClient.initialize(config.applicationId, config.apiKey);
      
      console.log('[AlgoliaMCP] Successfully initialized with MCP client');
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
      
      // Initialize MCP client if not already initialized
      if (!this.mcpClient.isConnected()) {
        await this.mcpClient.initialize(config.applicationId, config.apiKey);
      }
      
      console.log('[AlgoliaMCP] Successfully initialized multi-search');
      return true;
    } catch (error) {
      console.error('[AlgoliaMCP] Failed to initialize multi-search:', error);
      return false;
    }
  }

  // 通常の検索（MCP経由）
  async searchProducts(
    query: string, 
    indexName: string,
    additionalParams?: {
      hitsPerPage?: number;
      page?: number;
      facetFilters?: string[];
      numericFilters?: string[];
      filters?: string;
    }
  ): Promise<Product[]> {
    try {
      console.log('[AlgoliaMCP] Searching via MCP:', { query, indexName, additionalParams });
      
      const response = await this.mcpClient.searchSingleIndex({
        indexName,
        query,
        ...additionalParams
      });

      // Parse response and convert to Product[]
      if (response?.hits) {
        return response.hits.map((hit: any) => this.mapHitToProduct(hit, indexName));
      }

      return [];
    } catch (error) {
      console.error('[AlgoliaMCP] Search error:', error);
      return [];
    }
  }

  // 統合検索：複数のインデックスから並列検索（すべてMCP経由）
  async searchProductsMultiIndex(
    query: string, 
    categories?: string[],
    additionalParams?: {
      hitsPerPage?: number;
      page?: number;
      facetFilters?: string[];
      numericFilters?: string[];
      filters?: string;
    }
  ): Promise<Product[]> {
    console.log('[AlgoliaMCP] Starting multi-index search via MCP...');
    console.log('[AlgoliaMCP] Query:', query);
    console.log('[AlgoliaMCP] Categories:', categories);
    console.log('[AlgoliaMCP] Additional params:', additionalParams);
    
    if (!this.multiSearchConfig) {
      console.warn('[AlgoliaMCP] Multi-search not initialized');
      return this.config ? this.searchProducts(query, this.config.indexName, additionalParams) : [];
    }

    try {
      // カテゴリが指定されていない場合は全てのインデックスを検索
      const indicesToSearch = categories && categories.length > 0
        ? categories.map(cat => this.multiSearchConfig!.indexMappings[cat]).filter(idx => idx)
        : Object.values(this.multiSearchConfig.indexMappings);

      console.log('[AlgoliaMCP] Searching indices via MCP:', indicesToSearch);

      // 複数のMCP検索を並列実行
      const searchPromises = indicesToSearch.map(indexName => 
        this.searchProducts(query, indexName, additionalParams)
      );

      const results = await Promise.all(searchPromises);
      
      // 全ての結果を統合
      const allProducts: Product[] = [];
      results.forEach((products, index) => {
        console.log(`[AlgoliaMCP] Results from ${indicesToSearch[index]}: ${products.length} products`);
        allProducts.push(...products);
      });

      console.log('[AlgoliaMCP] Total products found:', allProducts.length);
      return allProducts;

    } catch (error) {
      console.error('[AlgoliaMCP] Multi-search error:', error);
      return [];
    }
  }

  // インデックスの存在確認と作成（MCP経由）
  async ensureIndicesExist(): Promise<void> {
    if (!this.multiSearchConfig) {
      console.warn('[AlgoliaMCP] Multi-search config not initialized, skipping index creation');
      return;
    }

    try {
      // 既存のインデックスリストを取得（MCP経由）
      const existingIndices = await this.mcpClient.listIndices();
      const existingIndexNames = new Set(
        existingIndices?.items?.map((idx: any) => idx.name) || []
      );

      // 標準インデックスリストを取得
      const standardIndices = Object.values(this.multiSearchConfig.indexMappings);
      const uniqueIndices = [...new Set(standardIndices)]; // 重複を除去

      for (const indexName of uniqueIndices) {
        if (!existingIndexNames.has(indexName)) {
          console.log(`[AlgoliaMCP] Creating index '${indexName}' via MCP...`);
          
          try {
            // インデックスを作成（空のオブジェクトを保存して作成）
            await this.mcpClient.saveObject(indexName, {
              objectID: 'init',
              _temporary: true
            });
            
            // インデックスの設定（MCP経由）
            const indexSettings = {
              searchableAttributes: [
                'brand',
                'name',
                'description',
                'categories'
              ],
              attributesForFaceting: [
                'searchable(brand)',
                'searchable(categories)',
                'price'
              ],
              customRanking: ['desc(popularity)', 'desc(rating)'],
              highlightPreTag: '<mark>',
              highlightPostTag: '</mark>',
              queryType: 'prefixAll',
              removeWordsIfNoResults: 'allOptional',
              ignorePlurals: true,
              enablePersonalization: true
            };

            await this.mcpClient.setSettings(indexName, indexSettings);
            
            console.log(`[AlgoliaMCP] Successfully created and configured index '${indexName}'`);
            this.initializedIndices.add(indexName);
            
          } catch (error) {
            console.error(`[AlgoliaMCP] Failed to create index '${indexName}':`, error);
          }
        } else {
          console.log(`[AlgoliaMCP] Index '${indexName}' already exists`);
          this.initializedIndices.add(indexName);
        }
      }

      console.log('[AlgoliaMCP] All required indices are ready');
      
    } catch (error) {
      console.error('[AlgoliaMCP] Failed to ensure indices exist:', error);
    }
  }

  // データをインデックスにアップロード（MCP経由）
  async uploadDataToIndex(indexName: string, data: any[]): Promise<boolean> {
    try {
      console.log(`[AlgoliaMCP] Uploading ${data.length} items to ${indexName} via MCP...`);
      
      // バッチで処理（MCPの制限を考慮）
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        // 各オブジェクトを個別に保存（MCP APIの制限により）
        const savePromises = batch.map(item => 
          this.mcpClient.saveObject(indexName, item)
        );
        
        await Promise.all(savePromises);
        console.log(`[AlgoliaMCP] Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)}`);
      }
      
      console.log(`[AlgoliaMCP] Successfully uploaded all data to ${indexName}`);
      return true;
      
    } catch (error) {
      console.error(`[AlgoliaMCP] Failed to upload data to ${indexName}:`, error);
      return false;
    }
  }

  // Helper method to map Algolia hit to Product
  private mapHitToProduct(hit: any, indexName: string): Product {
    // URLのドメイン名を取得
    let domain = '';
    if (hit.url) {
      try {
        const url = new URL(hit.url);
        domain = url.hostname.replace('www.', '');
      } catch (e) {
        // 無効なURLの場合は空文字列
      }
    }

    return {
      id: hit.objectID,
      name: hit.name || 'Unknown Product',
      description: hit.description || '',
      price: hit.price || hit.salePrice || 0,
      image: hit.image || this.getDefaultProductImage(),
      categories: hit.categories || [],
      url: hit.url || '',
      brand: hit.brand || '',
      source: indexName,
      domain: domain
    };
  }

  private getDefaultProductImage(): string {
    // デフォルトの商品画像URLを返す
    return 'https://via.placeholder.com/300x300?text=No+Image';
  }

  // Cleanup method
  cleanup() {
    if (this.mcpClient) {
      this.mcpClient.cleanup();
    }
  }
}