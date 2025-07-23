import { readFileSync } from 'fs';
import { join } from 'path';
import { parquetRead } from 'hyparquet';

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

interface ESCIProduct {
  product_id: string;
  product_title: string;
  product_description?: string;
  product_bullet_point?: string;
  product_brand?: string;
  product_color?: string;
  product_locale: string;
}

export class RealDataLoader {
  private readonly applicationId: string;
  private readonly writeApiKey: string;

  // データセット別の割り当て数
  private readonly DATASET_LIMITS = {
    bestBuy: 2000,
    ecommerce: 2000,
    amazonESCI: 3000
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

    console.log('[RealDataLoader] Loading Amazon ESCI dataset...');
    const esciProducts = await this.loadAmazonESCIData();
    allProducts.push(...esciProducts);

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

  private async loadAmazonESCIData(): Promise<Product[]> {
    try {
      const productsPath = '/mnt/m/workContest/esci-data-main/shopping_queries_dataset/shopping_queries_dataset_products.parquet';
      
      console.log('[RealDataLoader] Reading Amazon ESCI parquet file...');
      
      // Check if file exists
      const fs = require('fs');
      if (!fs.existsSync(productsPath)) {
        console.warn('[RealDataLoader] Amazon ESCI parquet file not found at:', productsPath);
        return [];
      }
      
      // Read parquet file using hyparquet
      const buffer = readFileSync(productsPath);
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      
      const products: ESCIProduct[] = [];
      await parquetRead({
        file: arrayBuffer,
        onComplete: (rows: any[]) => {
          // Filter for English products only
          const englishProducts = rows.filter((row: any) => 
            row.product_locale === 'us' && 
            row.product_title && 
            row.product_title.length > 0
          );
          
          console.log(`[RealDataLoader] Found ${englishProducts.length} English products in ESCI dataset`);
          
          // Convert to ESCIProduct interface
          englishProducts.forEach((row: any) => {
            products.push({
              product_id: row.product_id,
              product_title: row.product_title,
              product_description: row.product_description,
              product_bullet_point: row.product_bullet_point,
              product_brand: row.product_brand,
              product_color: row.product_color,
              product_locale: row.product_locale
            });
          });
        }
      });

      console.log(`[RealDataLoader] Loaded ${products.length} products from ESCI dataset`);

      // Filter and select best products
      const qualityProducts = products
        .filter(product => {
          // Must have title and brand
          return product.product_title && 
                 product.product_title.length > 10 &&
                 product.product_brand &&
                 product.product_brand.length > 0;
        })
        .slice(0, this.DATASET_LIMITS.amazonESCI);

      console.log(`[RealDataLoader] Selected ${qualityProducts.length} quality ESCI products`);

      // Convert to our Product interface
      return qualityProducts.map((product, index) => {
        // Generate a reasonable price based on product category
        const price = this.generatePriceForProduct(product.product_title);
        
        return {
          objectID: `esci_${product.product_id}`,
          name: product.product_title,
          description: product.product_description || product.product_bullet_point || '',
          price: price,
          salePrice: Math.random() > 0.8 ? Math.round(price * 0.85) : undefined,
          // Use a placeholder image since ESCI doesn't include images
          image: `https://picsum.photos/seed/${product.product_id}/400/400`,
          categories: this.categorizeESCIProduct(product),
          brand: product.product_brand,
          color: product.product_color,
          url: `https://www.amazon.com/dp/${product.product_id}`,
          sourceIndex: this.categorizeProduct({
            name: product.product_title,
            categories: [],
            brand: product.product_brand,
            type: ''
          })
        };
      });
    } catch (error) {
      console.error('[RealDataLoader] Error loading Amazon ESCI data:', error);
      return [];
    }
  }

  private generatePriceForProduct(title: string): number {
    const lowerTitle = title.toLowerCase();
    
    // Price ranges based on product type
    if (lowerTitle.includes('laptop') || lowerTitle.includes('computer')) return Math.round(Math.random() * 800 + 400);
    if (lowerTitle.includes('phone') || lowerTitle.includes('iphone')) return Math.round(Math.random() * 600 + 300);
    if (lowerTitle.includes('shoe') || lowerTitle.includes('sneaker')) return Math.round(Math.random() * 80 + 40);
    if (lowerTitle.includes('watch') || lowerTitle.includes('smartwatch')) return Math.round(Math.random() * 200 + 100);
    if (lowerTitle.includes('headphone') || lowerTitle.includes('earbuds')) return Math.round(Math.random() * 150 + 50);
    if (lowerTitle.includes('shirt') || lowerTitle.includes('pants')) return Math.round(Math.random() * 40 + 20);
    if (lowerTitle.includes('book')) return Math.round(Math.random() * 20 + 10);
    
    // Default price range
    return Math.round(Math.random() * 50 + 20);
  }

  private categorizeESCIProduct(product: ESCIProduct): string[] {
    const categories: string[] = [];
    const title = product.product_title.toLowerCase();
    const brand = (product.product_brand || '').toLowerCase();
    
    // Add brand as category
    if (product.product_brand) {
      categories.push(product.product_brand);
    }
    
    // Add color as category if present
    if (product.product_color) {
      categories.push(product.product_color);
    }
    
    // Infer categories from title
    if (title.includes('shoe') || title.includes('sneaker') || title.includes('boot')) {
      categories.push('Shoes', 'Footwear');
    }
    if (title.includes('shirt') || title.includes('jacket') || title.includes('dress')) {
      categories.push('Clothing', 'Apparel');
    }
    if (title.includes('phone') || title.includes('laptop') || title.includes('computer')) {
      categories.push('Electronics');
    }
    if (title.includes('book')) {
      categories.push('Books', 'Media');
    }
    if (title.includes('toy') || title.includes('game')) {
      categories.push('Toys', 'Games');
    }
    
    return categories.length > 0 ? categories : ['General'];
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

    // Fashion category - expanded shoe brand detection
    const shoeBrands = /nike|adidas|puma|vans|converse|under armour|reebok|new balance|asics|saucony|jordan|yeezy|balenciaga|gucci|louis vuitton|fila|champion|sketchers|timberland|dr\.? martens|ugg|crocs|birkenstock|salomon|merrell|columbia/i;
    
    if (name.match(/shoe|sneaker|boot|sandal|loafer|heel|pump|slipper|clog|moccasin|oxford|derby|clothing|shirt|pants|jacket|dress|fashion|apparel|dunk|air max|air force|jordan/) ||
        categories.some((cat: string) => cat.match(/fashion|clothing|shoe|footwear|apparel|accessories/)) ||
        brand.match(shoeBrands) ||
        hierarchical.match(/clothing|fashion|footwear/)) {
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
    
    // Log distribution summary
    console.log('[RealDataLoader] Product distribution by index:');
    Object.entries(productsByIndex).forEach(([index, prods]) => {
      console.log(`  ${index}: ${prods.length} products`);
    });
    
    // Upload to each index
    for (const [indexName, indexProducts] of Object.entries(productsByIndex)) {
      if (indexProducts.length > 0) {
        await this.uploadToAlgolia(indexName, indexProducts);
        console.log(`[RealDataLoader] ✓ Uploaded ${indexProducts.length} products to ${indexName} index`);
      }
    }
    
    // Final summary
    const totalUploaded = Object.values(productsByIndex).reduce((sum, prods) => sum + prods.length, 0);
    console.log(`[RealDataLoader] Upload complete! Total products uploaded: ${totalUploaded}`);
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