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

export class OptimizedDataLoader {
  private readonly applicationId: string;
  private readonly writeApiKey: string;
  private readonly dataPath: string;

  // カテゴリ別の目標数（前処理で作成されたデータ構成に合わせる）
  private readonly CATEGORY_TARGETS = {
    fashion: 3000,      // 40%
    electronics: 2000,  // 30%
    other: 2000,        // 30%
    beauty: 0,          // Algoliaインデックス用（空）
    sports: 0,          // Algoliaインデックス用（空）
    books: 0,           // Algoliaインデックス用（空）
    home: 0,            // Algoliaインデックス用（空）
    food: 0,            // Algoliaインデックス用（空）
    products: 0         // Algoliaインデックス用（空）
  };

  constructor(applicationId: string, writeApiKey: string) {
    this.applicationId = applicationId;
    this.writeApiKey = writeApiKey;
    this.dataPath = join(__dirname, '..', 'data');
  }

  async loadOptimizedData(): Promise<void> {
    console.log('[OptimizedDataLoader] Starting optimized data import...');
    
    try {
      // Clear all indices first
      await this.clearAllIndices();
      
      // Load preprocessed data
      const allProducts = this.loadPreprocessedData();
      console.log(`[OptimizedDataLoader] Loaded ${allProducts.length} preprocessed products`);

      // Convert to Algolia format
      const algoliaProducts = this.convertToAlgoliaFormat(allProducts);
      console.log(`[OptimizedDataLoader] Converted ${algoliaProducts.length} products for Algolia`);

      // Upload to indices
      await this.uploadToIndices(algoliaProducts);
      
      console.log('[OptimizedDataLoader] Optimized data import completed successfully!');
    } catch (error) {
      console.error('[OptimizedDataLoader] Error during optimized data import:', error);
      throw error;
    }
  }

  private loadPreprocessedData(): OptimizedProduct[] {
    try {
      // Try to load main products file first
      const mainDataPath = join(this.dataPath, 'amazon-products.json');
      
      if (this.fileExists(mainDataPath)) {
        console.log('[OptimizedDataLoader] Loading main products file...');
        const rawData = readFileSync(mainDataPath, 'utf-8');
        return JSON.parse(rawData) as OptimizedProduct[];
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
          console.log(`[OptimizedDataLoader] Loaded ${categoryProducts.length} products from ${filename}`);
        } else {
          console.warn(`[OptimizedDataLoader] File not found: ${filename}`);
        }
      }
      
      return allProducts;
      
    } catch (error) {
      console.error('[OptimizedDataLoader] Error loading preprocessed data:', error);
      console.log('[OptimizedDataLoader] Falling back to empty dataset...');
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
      objectID: product.asin || product.id,
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