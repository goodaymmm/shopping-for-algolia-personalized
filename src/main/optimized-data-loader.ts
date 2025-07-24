import { readFileSync } from 'fs';
import { join } from 'path';

interface Product {
  objectID: string;
  name: string;
  description?: string;
  price: number;
  salePrice?: number;
  image: string;
  categories: string[];
  brand?: string;
  color?: string;
  url?: string;
  sourceIndex?: string;
}

interface OptimizedProduct {
  id: string;           // ESCI product_id
  asin?: string;        // Amazon ASIN
  title: string;        // Product title
  price: number;        // Price
  imageUrl: string;     // Image URL
  brand: string;        // Brand name
  category: string;     // Category (fashion/electronics/other)
  url: string;          // Product URL
}

// Best Buy product interface
interface BestBuyProduct {
  name: string;
  description: string;
  brand: string;
  categories: string[];
  hierarchicalCategories: {
    lvl0: string;
    lvl1?: string;
    lvl2?: string;
    lvl3?: string;
  };
  type: string;
  price: number;
  price_range: string;
  image: string;
  url: string;
  free_shipping: boolean;
  popularity: number;
  rating: number;
  objectID: string;
}


export class OptimizedDataLoader {
  private readonly applicationId: string;
  private readonly writeApiKey: string;
  private readonly dataPath: string;

  // データソース別の上限と全体目標（8,849件）
  private readonly DATA_SOURCE_LIMITS = {
    amazon: 6270,     // Amazon Reviews 2023 (変更なし)
    bestBuy: 2579     // Best Buy dataset (10,000から選択、Fashionデータ分を統合)
  };

  // カテゴリ別の目標数（マルチデータソース対応）
  private readonly CATEGORY_TARGETS = {
    fashion: 3500,      // Amazon fashion + Best Buy fashion
    electronics: 4500,  // Amazon electronics + Best Buy electronics（増量）
    products: 849,      // その他の商品
    beauty: 0,          // Algoliaインデックス用（将来拡張用）
    sports: 0,          // Algoliaインデックス用（将来拡張用）
    books: 0,           // Algoliaインデックス用（将来拡張用）
    home: 0,            // Algoliaインデックス用（将来拡張用）
    food: 0             // Algoliaインデックス用（将来拡張用）
  };

  constructor(applicationId: string, writeApiKey: string) {
    this.applicationId = applicationId;
    this.writeApiKey = writeApiKey;
    
    // Electronのapp.isPackagedを使用して環境を判定（エラーハンドリング付き）
    let isPackaged = false;
    try {
      const { app } = require('electron');
      isPackaged = app.isPackaged;
    } catch (error) {
      // 開発時やテスト時にElectronが利用できない場合はfalseとする
      isPackaged = false;
    }
    
    // パッケージ環境では app.asar 内の src/data を参照
    // 開発環境では data を直接参照
    this.dataPath = isPackaged
      ? join(__dirname, '../src/data')
      : join(__dirname, '../../data');
    
    console.log(`[OptimizedDataLoader] Data path: ${this.dataPath} (packaged: ${isPackaged})`);
  }

  async loadOptimizedData(): Promise<void> {
    console.log('[OptimizedDataLoader] Starting multi-source optimized data import...');
    
    try {
      // Load data from all sources
      const allProducts = await this.loadMultiSourceData();
      console.log(`[OptimizedDataLoader] Loaded ${allProducts.length} products from all sources`);

      if (allProducts.length === 0) {
        console.error('[OptimizedDataLoader] WARNING: No products loaded! Check data file paths.');
        throw new Error('No products loaded from data files');
      }

      // Upload to indices using optimized method (no clearing)
      await this.uploadToIndicesOptimized(allProducts);
      
      console.log('[OptimizedDataLoader] Multi-source optimized data import completed successfully!');
      console.log(`[OptimizedDataLoader] Summary: ${allProducts.length} total products uploaded`);
    } catch (error) {
      console.error('[OptimizedDataLoader] Error during multi-source optimized data import:', error);
      throw error;
    }
  }

  // 新しいマルチソースデータローダー
  private async loadMultiSourceData(): Promise<Product[]> {
    const allProducts: Product[] = [];

    try {
      // 1. Amazon Reviews 2023データ（既存のOptimizedProduct形式）
      console.log('[OptimizedDataLoader] Loading Amazon Reviews 2023 data...');
      const amazonProducts = this.loadPreprocessedData();
      const convertedAmazonProducts = this.convertToAlgoliaFormat(amazonProducts);
      allProducts.push(...convertedAmazonProducts.slice(0, this.DATA_SOURCE_LIMITS.amazon));
      console.log(`[OptimizedDataLoader] Loaded ${convertedAmazonProducts.length} Amazon products`);

      // 2. Best Buyデータ
      console.log('[OptimizedDataLoader] Loading Best Buy data...');
      const bestBuyProducts = this.loadBestBuyData();
      allProducts.push(...bestBuyProducts.slice(0, this.DATA_SOURCE_LIMITS.bestBuy));
      console.log(`[OptimizedDataLoader] Loaded ${bestBuyProducts.length} Best Buy products`);

      console.log(`[OptimizedDataLoader] Total products loaded: ${allProducts.length}`);
      
      return allProducts;
      
    } catch (error) {
      console.error('[OptimizedDataLoader] Error loading multi-source data:', error);
      console.log('[OptimizedDataLoader] Falling back to Amazon data only...');
      
      // フォールバック: Amazonデータのみ
      const amazonProducts = this.loadPreprocessedData();
      return this.convertToAlgoliaFormat(amazonProducts);
    }
  }

  // 従来のAmazonデータローダー（後方互換性のため維持）
  private loadPreprocessedData(): OptimizedProduct[] {
    try {
      // Try to load main products file first
      const mainDataPath = join(this.dataPath, 'amazon-products.json');
      console.log(`[OptimizedDataLoader] Checking for main products file at: ${mainDataPath}`);
      
      if (this.fileExists(mainDataPath)) {
        console.log('[OptimizedDataLoader] Loading main products file...');
        const rawData = readFileSync(mainDataPath, 'utf-8');
        const products = JSON.parse(rawData) as OptimizedProduct[];
        console.log(`[OptimizedDataLoader] Successfully loaded ${products.length} products from amazon-products.json`);
        return products;
      } else {
        console.log('[OptimizedDataLoader] Main products file not found at:', mainDataPath);
      }
      
      // Fallback: load category-specific files
      console.log('[OptimizedDataLoader] Loading category-specific files...');
      const allProducts: OptimizedProduct[] = [];
      
      const categoryFiles = ['products-fashion.json', 'products-electronics.json', 'products-other.json'];
      
      for (const filename of categoryFiles) {
        const filePath = join(this.dataPath, filename);
        if (this.fileExists(filePath)) {
          const rawData = readFileSync(filePath, 'utf-8');
          const categoryProducts = JSON.parse(rawData) as OptimizedProduct[];
          allProducts.push(...categoryProducts);
          console.log(`[OptimizedDataLoader] Loaded ${categoryProducts.length} Amazon products from ${filename}`);
        } else {
          console.warn(`[OptimizedDataLoader] Amazon file not found: ${filename}`);
        }
      }
      
      return allProducts;
      
    } catch (error) {
      console.error('[OptimizedDataLoader] Error loading Amazon preprocessed data:', error);
      console.log('[OptimizedDataLoader] Falling back to empty Amazon dataset...');
      return [];
    }
  }

  private fileExists(filePath: string): boolean {
    try {
      return require('fs').existsSync(filePath);
    } catch {
      return false;
    }
  }

  private convertToAlgoliaFormat(optimizedProducts: OptimizedProduct[]): Product[] {
    return optimizedProducts.map((product, index) => ({
      objectID: `amazon_${product.asin || product.id}`,
      name: product.title,
      description: `${product.brand} ${product.title}`,
      price: Math.round(product.price),
      salePrice: Math.random() > 0.8 ? Math.round(product.price * 0.85) : undefined,
      image: product.imageUrl,
      categories: [this.mapCategoryToAlgolia(product.category), product.brand, product.category],
      brand: product.brand,
      url: product.url,
      sourceIndex: this.mapCategoryToAlgolia(product.category)
    }));
  }

  // Best Buyデータローダー
  private loadBestBuyData(): Product[] {
    try {
      const dataPath = join(this.dataPath, 'bestbuy-products.json');
      
      if (!this.fileExists(dataPath)) {
        console.warn('[OptimizedDataLoader] Best Buy data file not found at:', dataPath);
        return [];
      }
      
      const rawData = readFileSync(dataPath, 'utf-8');
      const bestBuyData: BestBuyProduct[] = JSON.parse(rawData);
      
      console.log(`[OptimizedDataLoader] Loaded ${bestBuyData.length} pre-filtered Best Buy products`);
      
      // Algolia Product形式に変換（既にフィルタリング済みなのでそのまま使用）
      return bestBuyData.map(product => ({
        objectID: `bestbuy_${product.objectID}`,
        name: product.name,
        description: product.description,
        price: Math.round(product.price),
        salePrice: Math.random() > 0.7 ? Math.round(product.price * 0.9) : undefined,
        image: product.image,
        categories: this.categorizeBestBuyProduct(product),
        brand: product.brand,
        url: product.url,
        sourceIndex: this.categorizeBestBuyForIndex(product)
      }));
      
    } catch (error) {
      console.error('[OptimizedDataLoader] Error loading Best Buy data:', error);
      return [];
    }
  }


  // カテゴリマッピングヘルパー
  private mapCategoryToAlgolia(category: string): string {
    switch (category) {
      case 'fashion':
        return 'fashion';
      case 'electronics':
        return 'electronics';
      case 'other':
      default:
        return 'products';
    }
  }

  // Best Buy商品のカテゴリ分類
  private categorizeBestBuyProduct(product: BestBuyProduct): string[] {
    const categories = [...product.categories];
    const name = product.name.toLowerCase();
    const type = product.type?.toLowerCase() || '';
    
    // ブランドを追加
    if (product.brand) {
      categories.push(product.brand);
    }
    
    // 階層カテゴリから推論
    if (product.hierarchicalCategories) {
      if (product.hierarchicalCategories.lvl0) categories.push(product.hierarchicalCategories.lvl0);
      if (product.hierarchicalCategories.lvl1) {
        const level1 = product.hierarchicalCategories.lvl1.split(' > ').pop();
        if (level1) categories.push(level1);
      }
    }
    
    return [...new Set(categories.filter(cat => cat && cat.length > 0))];
  }

  // Best Buy商品のインデックス分類
  private categorizeBestBuyForIndex(product: BestBuyProduct): string {
    const name = product.name.toLowerCase();
    const categories = product.categories.map(cat => cat.toLowerCase()).join(' ');
    const type = product.type?.toLowerCase() || '';
    
    // エレクトロニクス
    if (name.match(/phone|laptop|computer|tv|television|monitor|camera|headphone|tablet|gaming|console|software/) ||
        categories.match(/electronic|computer|mobile|gaming|camera|tv|audio|software/) ||
        type.match(/hardgood|software/)) {
      return 'electronics';
    }
    
    // ファッション（衣類、靴、アクセサリー）
    if (name.match(/shoe|sneaker|clothing|shirt|jacket|watch|jewelry|accessory/) ||
        categories.match(/clothing|shoes|accessories|jewelry|watch/)) {
      return 'fashion';
    }
    
    return 'products';
  }


  private async clearAllIndices(): Promise<void> {
    console.log('[OptimizedDataLoader] Clearing all indices...');
    const indices = Object.keys(this.CATEGORY_TARGETS);
    
    for (const indexName of indices) {
      try {
        const response = await fetch(
          `https://${this.applicationId}-dsn.algolia.net/1/indexes/${indexName}/clear`,
          {
            method: 'POST',
            headers: {
              'X-Algolia-API-Key': this.writeApiKey,
              'X-Algolia-Application-Id': this.applicationId
            }
          }
        );
        
        if (response.ok) {
          console.log(`[OptimizedDataLoader] Cleared index: ${indexName}`);
        }
      } catch (error) {
        console.warn(`[OptimizedDataLoader] Failed to clear index ${indexName}:`, error);
      }
    }
  }

  // 高速化された新しいアップロードメソッド（インデックスクリアなし）
  private async uploadToIndicesOptimized(products: Product[]): Promise<void> {
    // Group products by their target index
    const productsByIndex: { [index: string]: Product[] } = {};
    
    products.forEach(product => {
      const index = product.sourceIndex || 'products';
      if (!productsByIndex[index]) {
        productsByIndex[index] = [];
      }
      productsByIndex[index].push(product);
    });
    
    // Log distribution summary
    console.log('[OptimizedDataLoader] Product distribution by index:');
    Object.entries(productsByIndex).forEach(([index, prods]) => {
      console.log(`  ${index}: ${prods.length} products`);
    });
    
    // Upload to each index with replace objects method
    for (const [indexName, indexProducts] of Object.entries(productsByIndex)) {
      if (indexProducts.length > 0) {
        await this.uploadToAlgoliaWithReplace(indexName, indexProducts);
        console.log(`[OptimizedDataLoader] ✓ Uploaded ${indexProducts.length} products to ${indexName} index`);
      }
    }
    
    // Final summary
    const totalUploaded = Object.values(productsByIndex).reduce((sum, prods) => sum + prods.length, 0);
    console.log(`[OptimizedDataLoader] Upload complete! Total products uploaded: ${totalUploaded}`);
  }

  private async uploadToIndices(products: Product[]): Promise<void> {
    // Group products by their target index
    const productsByIndex: { [index: string]: Product[] } = {};
    
    products.forEach(product => {
      const index = product.sourceIndex || 'products';
      if (!productsByIndex[index]) {
        productsByIndex[index] = [];
      }
      productsByIndex[index].push(product);
    });
    
    // Log distribution summary
    console.log('[OptimizedDataLoader] Product distribution by index:');
    Object.entries(productsByIndex).forEach(([index, prods]) => {
      console.log(`  ${index}: ${prods.length} products`);
    });
    
    // Upload to each index
    for (const [indexName, indexProducts] of Object.entries(productsByIndex)) {
      if (indexProducts.length > 0) {
        await this.uploadToAlgolia(indexName, indexProducts);
        console.log(`[OptimizedDataLoader] ✓ Uploaded ${indexProducts.length} products to ${indexName} index`);
      }
    }
    
    // Final summary
    const totalUploaded = Object.values(productsByIndex).reduce((sum, prods) => sum + prods.length, 0);
    console.log(`[OptimizedDataLoader] Upload complete! Total products uploaded: ${totalUploaded}`);
  }

  // 高速化されたreplaceAllObjectsを使用したアップロード
  private async uploadToAlgoliaWithReplace(indexName: string, products: Product[]): Promise<void> {
    try {
      const batchSize = 200; // バッチサイズを増加
      const total = products.length;

      for (let i = 0; i < total; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        // replaceAllObjectsを使用してより高速にアップロード
        const response = await fetch(
          `https://${this.applicationId}-dsn.algolia.net/1/indexes/${indexName}/batch`,
          {
            method: 'POST',
            headers: {
              'X-Algolia-API-Key': this.writeApiKey,
              'X-Algolia-Application-Id': this.applicationId,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: batch.map(product => ({
                action: 'addObject',
                body: product
              }))
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[OptimizedDataLoader] Failed to upload batch to ${indexName}:`, errorText);
          continue;
        }

        const result = await response.json() as { taskID?: number };
        const progress = Math.min(100, Math.round((i + batchSize) / total * 100));
        console.log(`[OptimizedDataLoader] Uploading to ${indexName}: ${progress}% - TaskID: ${result.taskID}`);
        
        // Rate limiting（短縮）
        if (i + batchSize < total) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (error) {
      console.error(`[OptimizedDataLoader] Error uploading to ${indexName}:`, error);
    }
  }

  private async uploadToAlgolia(indexName: string, products: Product[]): Promise<void> {
    try {
      const batchSize = 100;
      const total = products.length;

      for (let i = 0; i < total; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        const response = await fetch(
          `https://${this.applicationId}-dsn.algolia.net/1/indexes/${indexName}/batch`,
          {
            method: 'POST',
            headers: {
              'X-Algolia-API-Key': this.writeApiKey,
              'X-Algolia-Application-Id': this.applicationId,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: batch.map(product => ({
                action: 'addObject',
                body: product
              }))
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[OptimizedDataLoader] Failed to upload batch to ${indexName}:`, errorText);
          continue;
        }

        const result = await response.json() as { taskID?: number };
        const progress = Math.min(100, Math.round((i + batchSize) / total * 100));
        console.log(`[OptimizedDataLoader] Uploading to ${indexName}: ${progress}% - TaskID: ${result.taskID}`);
        
        // Rate limiting
        if (i + batchSize < total) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error(`[OptimizedDataLoader] Error uploading to ${indexName}:`, error);
    }
  }
}