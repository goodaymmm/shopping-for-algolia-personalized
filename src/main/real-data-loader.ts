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

interface BestBuyProduct {
  name: string;
  shortDescription: string;
  bestSellingRank: number;
  salePrice: number;
  manufacturer: string;
  url: string;
  image: string;
  customerReviewCount: number;
  objectID: string;
  categories: string[];
  type?: string;
}

interface EcommerceProduct {
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
  price: number;
  image: string;
  url: string;
  popularity: number;
  rating: number;
  objectID: string;
}

export class RealDataLoader {
  private readonly applicationId: string;
  private readonly writeApiKey: string;

  // データセット別の割り当て数
  private readonly DATASET_LIMITS = {
    bestBuy: 2500,
    ecommerce: 2000,
    amazonESCI: 2500
  };

  // カテゴリ別の目標数
  private readonly CATEGORY_TARGETS = {
    fashion: 1400,      // 20%
    electronics: 1400,  // 20%
    home: 1050,        // 15%
    beauty: 700,       // 10%
    sports: 700,       // 10%
    books: 700,        // 10%
    food: 350,         // 5%
    products: 700      // 10%
  };

  constructor(applicationId: string, writeApiKey: string) {
    this.applicationId = applicationId;
    this.writeApiKey = writeApiKey;
  }

  async loadRealData(): Promise<void> {
    console.log('[RealDataLoader] Starting real data import...');
    
    try {
      // Clear all indices first
      await this.clearAllIndices();
      
      // Load and process all datasets
      const allProducts = await this.loadAllDatasets();
      console.log(`[RealDataLoader] Loaded ${allProducts.length} total products from all datasets`);

      // Select and balance the best 7000 products
      const selectedProducts = this.selectBestProducts(allProducts, 7000);
      console.log(`[RealDataLoader] Selected ${selectedProducts.length} products for upload`);

      // Upload to indices
      await this.uploadToIndices(selectedProducts);
      
      console.log('[RealDataLoader] Real data import completed successfully!');
    } catch (error) {
      console.error('[RealDataLoader] Error during real data import:', error);
      throw error;
    }
  }

  private async loadAllDatasets(): Promise<Product[]> {
    const allProducts: Product[] = [];

    console.log('[RealDataLoader] Loading Best Buy dataset...');
    const bestBuyProducts = await this.loadBestBuyData();
    allProducts.push(...bestBuyProducts);

    console.log('[RealDataLoader] Loading ecommerce dataset...');
    const ecommerceProducts = await this.loadEcommerceData();
    allProducts.push(...ecommerceProducts);

    // Note: Amazon ESCI data requires parquet parsing which is complex
    // For now, we'll focus on Best Buy and ecommerce data which gives us 4500 products
    console.log('[RealDataLoader] Skipping Amazon ESCI data for now (parquet parsing required)');

    return allProducts;
  }

  private async loadBestBuyData(): Promise<Product[]> {
    try {
      const dataPath = '/mnt/m/workContest/Algolia_datasets-master/ecommerce/bestbuy_seo.json';
      const rawData = readFileSync(dataPath, 'utf-8');
      const bestBuyData: BestBuyProduct[] = JSON.parse(rawData);

      console.log(`[RealDataLoader] Found ${bestBuyData.length} Best Buy products`);

      // Filter and select best products
      const qualityProducts = bestBuyData
        .filter(product => {
          return product.salePrice && 
                 product.salePrice > 0 &&
                 product.image && 
                 product.url &&
                 product.name &&
                 product.bestSellingRank < 5000 && // Only top 5000 selling products
                 product.customerReviewCount > 10; // Products with at least 10 reviews
        })
        .sort((a, b) => {
          // Score based on selling rank (lower is better) and review count (higher is better)
          const scoreA = (5000 - a.bestSellingRank) + (a.customerReviewCount / 10);
          const scoreB = (5000 - b.bestSellingRank) + (b.customerReviewCount / 10);
          return scoreB - scoreA;
        })
        .slice(0, this.DATASET_LIMITS.bestBuy);

      console.log(`[RealDataLoader] Selected ${qualityProducts.length} quality Best Buy products`);

      // Convert to our Product interface
      return qualityProducts.map((product, index) => ({
        objectID: `bestbuy_${product.objectID}`,
        name: product.name,
        description: product.shortDescription,
        price: Math.round(product.salePrice),
        image: product.image,
        categories: this.categorizeBestBuyProduct(product),
        brand: product.manufacturer,
        url: product.url,
        sourceIndex: this.categorizeProduct({
          name: product.name,
          categories: product.categories || [],
          brand: product.manufacturer,
          type: product.type
        })
      }));
    } catch (error) {
      console.error('[RealDataLoader] Error loading Best Buy data:', error);
      return [];
    }
  }

  private async loadEcommerceData(): Promise<Product[]> {
    try {
      const dataPath = '/mnt/m/workContest/Algolia_datasets-master/ecommerce/records.json';
      const rawData = readFileSync(dataPath, 'utf-8');
      const ecommerceData: EcommerceProduct[] = JSON.parse(rawData);

      console.log(`[RealDataLoader] Found ${ecommerceData.length} ecommerce products`);

      // Filter and select best products
      const qualityProducts = ecommerceData
        .filter(product => {
          return product.price && 
                 product.price > 0 &&
                 product.image && 
                 product.url &&
                 product.name &&
                 product.rating >= 3 &&
                 product.popularity > 5000;
        })
        .sort((a, b) => {
          // Score based on popularity and rating
          const scoreA = a.popularity + (a.rating * 1000);
          const scoreB = b.popularity + (b.rating * 1000);
          return scoreB - scoreA;
        })
        .slice(0, this.DATASET_LIMITS.ecommerce);

      console.log(`[RealDataLoader] Selected ${qualityProducts.length} quality ecommerce products`);

      // Convert to our Product interface
      return qualityProducts.map((product, index) => ({
        objectID: `ecom_${product.objectID}`,
        name: product.name,
        description: product.description,
        price: Math.round(product.price),
        image: product.image,
        categories: this.categorizeEcommerceProduct(product),
        brand: product.brand,
        url: product.url,
        sourceIndex: this.categorizeProduct({
          name: product.name,
          categories: product.categories || [],
          brand: product.brand,
          hierarchicalCategories: product.hierarchicalCategories
        })
      }));
    } catch (error) {
      console.error('[RealDataLoader] Error loading ecommerce data:', error);
      return [];
    }
  }

  private categorizeBestBuyProduct(product: BestBuyProduct): string[] {
    const categories = [...(product.categories || [])];
    const name = product.name.toLowerCase();
    const type = product.type?.toLowerCase() || '';

    // Add inferred categories based on name and type
    if (name.includes('phone') || name.includes('tablet') || name.includes('laptop') || 
        name.includes('computer') || name.includes('tv') || name.includes('camera') ||
        type.includes('hardgood')) {
      categories.push('Electronics');
    }

    if (name.includes('software') || type.includes('software')) {
      categories.push('Software', 'Electronics');
    }

    if (name.includes('game') || name.includes('gaming')) {
      categories.push('Gaming', 'Electronics');
    }

    return categories.length > 0 ? categories : ['General'];
  }

  private categorizeEcommerceProduct(product: EcommerceProduct): string[] {
    const categories = [...product.categories];
    
    // Add hierarchical categories
    if (product.hierarchicalCategories) {
      if (product.hierarchicalCategories.lvl0) categories.push(product.hierarchicalCategories.lvl0);
      if (product.hierarchicalCategories.lvl1) categories.push(product.hierarchicalCategories.lvl1.split(' > ').pop() || '');
      if (product.hierarchicalCategories.lvl2) categories.push(product.hierarchicalCategories.lvl2.split(' > ').pop() || '');
    }

    return [...new Set(categories.filter(cat => cat.length > 0))];
  }

  private categorizeProduct(product: any): string {
    const name = (product.name || '').toLowerCase();
    const categories = (product.categories || []).map((cat: string) => cat.toLowerCase());
    const brand = (product.brand || '').toLowerCase();
    const type = (product.type || '').toLowerCase();
    const hierarchical = product.hierarchicalCategories?.lvl0?.toLowerCase() || '';

    // Fashion category
    if (name.match(/shoe|sneaker|boot|sandal|clothing|shirt|pants|jacket|dress|fashion|apparel/) ||
        categories.some((cat: string) => cat.match(/fashion|clothing|shoe|apparel|accessories/)) ||
        brand.match(/nike|adidas|puma|vans|converse|under armour|reebok/) ||
        hierarchical.includes('clothing')) {
      return 'fashion';
    }

    // Electronics category
    if (name.match(/phone|laptop|computer|tv|television|monitor|camera|headphone|tablet|gaming|console/) ||
        categories.some((cat: string) => cat.match(/electronic|computer|mobile|gaming|camera|tv|audio/)) ||
        type.includes('hardgood') ||
        hierarchical.match(/electronic|computer|mobile/)) {
      return 'electronics';
    }

    // Home category
    if (name.match(/furniture|kitchen|home|garden|decor|bed|chair|table|lamp|storage/) ||
        categories.some((cat: string) => cat.match(/home|furniture|kitchen|garden|decor/)) ||
        hierarchical.match(/home|furniture|kitchen/)) {
      return 'home';
    }

    // Beauty category
    if (name.match(/beauty|cosmetic|skincare|makeup|perfume|health|personal care/) ||
        categories.some((cat: string) => cat.match(/beauty|cosmetic|health|personal/)) ||
        hierarchical.includes('beauty')) {
      return 'beauty';
    }

    // Sports category
    if (name.match(/sport|fitness|gym|outdoor|bike|camping|yoga|exercise|athletic/) ||
        categories.some((cat: string) => cat.match(/sport|fitness|outdoor|athletic|exercise/)) ||
        hierarchical.match(/sport|fitness|outdoor/)) {
      return 'sports';
    }

    // Books category
    if (name.match(/book|novel|magazine|media|movie|music|dvd|blu-ray/) ||
        categories.some((cat: string) => cat.match(/book|media|movie|music|entertainment/)) ||
        type.includes('book') ||
        hierarchical.includes('media')) {
      return 'books';
    }

    // Food category
    if (name.match(/food|snack|drink|coffee|tea|grocery|kitchen appliance/) ||
        categories.some((cat: string) => cat.match(/food|grocery|kitchen|beverage/)) ||
        hierarchical.includes('food')) {
      return 'food';
    }

    return 'products';
  }

  private selectBestProducts(allProducts: Product[], targetCount: number): Product[] {
    // Group products by category
    const productsByCategory: { [key: string]: Product[] } = {};
    
    for (const product of allProducts) {
      const category = product.sourceIndex || 'products';
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(product);
    }

    console.log('[RealDataLoader] Products by category:');
    Object.entries(productsByCategory).forEach(([category, products]) => {
      console.log(`  ${category}: ${products.length} products`);
    });

    const selectedProducts: Product[] = [];

    // Select products according to target distribution
    for (const [category, targetCount] of Object.entries(this.CATEGORY_TARGETS)) {
      const availableProducts = productsByCategory[category] || [];
      const selectCount = Math.min(targetCount, availableProducts.length);
      
      // Take the first N products (they're already sorted by quality)
      const selected = availableProducts.slice(0, selectCount);
      selectedProducts.push(...selected);
      
      console.log(`[RealDataLoader] Selected ${selected.length}/${targetCount} products for ${category}`);
    }

    // If we haven't reached the target count, fill with remaining products
    const remainingSlots = targetCount - selectedProducts.length;
    if (remainingSlots > 0) {
      const usedIds = new Set(selectedProducts.map(p => p.objectID));
      const remainingProducts = allProducts
        .filter(p => !usedIds.has(p.objectID))
        .slice(0, remainingSlots);
      
      selectedProducts.push(...remainingProducts);
      console.log(`[RealDataLoader] Added ${remainingProducts.length} additional products to reach target`);
    }

    return selectedProducts.slice(0, targetCount);
  }

  private async clearAllIndices(): Promise<void> {
    console.log('[RealDataLoader] Clearing all indices...');
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
          console.log(`[RealDataLoader] Cleared index: ${indexName}`);
        }
      } catch (error) {
        console.warn(`[RealDataLoader] Failed to clear index ${indexName}:`, error);
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
    
    // Upload to each index
    for (const [indexName, indexProducts] of Object.entries(productsByIndex)) {
      if (indexProducts.length > 0) {
        await this.uploadToAlgolia(indexName, indexProducts);
        console.log(`[RealDataLoader] Uploaded ${indexProducts.length} products to ${indexName}`);
      }
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
          console.error(`[RealDataLoader] Failed to upload batch to ${indexName}:`, errorText);
          continue;
        }

        const result = await response.json() as { taskID?: number };
        const progress = Math.min(100, Math.round((i + batchSize) / total * 100));
        console.log(`[RealDataLoader] Uploading to ${indexName}: ${progress}% - TaskID: ${result.taskID}`);
        
        // Rate limiting
        if (i + batchSize < total) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error(`[RealDataLoader] Error uploading to ${indexName}:`, error);
    }
  }
}