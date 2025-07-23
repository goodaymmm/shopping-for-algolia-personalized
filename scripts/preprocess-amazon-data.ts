import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
// import { parquetRead } from 'hyparquet'; // Skip ESCI for now due to import issues

interface AmazonProduct {
  parent_asin: string;
  title: string;
  price?: number;
  images?: Array<{ large: string; thumb?: string; variant?: string }>;
  store?: string;
  categories?: string[];
}

interface ESCIProduct {
  product_id: string;
  product_title: string;
  product_brand?: string;
  product_locale: string;
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

class AmazonDataPreprocessor {
  private readonly DATA_DIR = '/mnt/m/workContest/amazon-reviews-2023';
  private readonly OUTPUT_DIR = '/mnt/m/workContest/shopping-for-algolia-personalized/src/data';
  private readonly ESCI_DIR = '/mnt/m/workContest/esci-data-main/shopping_queries_dataset';
  
  // Category limits for optimization
  private readonly CATEGORY_LIMITS = {
    fashion: 3000,      // Shoes and clothing
    electronics: 2000,  // Electronics
    other: 2000         // Everything else
  };

  constructor() {
    // Ensure output directory exists
    if (!fs.existsSync(this.OUTPUT_DIR)) {
      fs.mkdirSync(this.OUTPUT_DIR, { recursive: true });
    }
  }

  async processData(): Promise<void> {
    console.log('[Preprocessor] Starting Amazon Reviews 2023 data processing...');
    
    try {
      // Load ESCI data for matching
      console.log('[Preprocessor] Loading ESCI data...');
      const esciProducts = await this.loadESCIData();
      console.log(`[Preprocessor] Loaded ${esciProducts.length} ESCI products`);

      // Process Amazon data categories
      const amazonProducts = await this.loadAmazonData();
      console.log(`[Preprocessor] Loaded ${amazonProducts.length} Amazon products`);

      // Match ESCI with Amazon data
      console.log('[Preprocessor] Matching ESCI with Amazon data...');
      const matchedProducts = this.matchProducts(esciProducts, amazonProducts);
      console.log(`[Preprocessor] Successfully matched ${matchedProducts.length} products`);

      // Categorize and optimize
      const optimizedProducts = this.optimizeProducts(matchedProducts);
      console.log(`[Preprocessor] Optimized to ${optimizedProducts.length} products`);

      // Write output files
      await this.writeOutputFiles(optimizedProducts);
      console.log('[Preprocessor] Processing completed successfully!');

    } catch (error) {
      console.error('[Preprocessor] Error during processing:', error);
      throw error;
    }
  }

  private async loadESCIData(): Promise<ESCIProduct[]> {
    // Skip ESCI data for now due to parquet import issues
    // Focus on Amazon Reviews 2023 data only
    console.log('[Preprocessor] Skipping ESCI data integration (parquet import issues)');
    console.log('[Preprocessor] Using Amazon Reviews 2023 data directly');
    return [];
  }

  private async loadAmazonData(): Promise<AmazonProduct[]> {
    const products: AmazonProduct[] = [];
    
    // Load Clothing, Shoes and Jewelry
    const fashionProducts = await this.loadAmazonCategory('meta_Clothing_Shoes_and_Jewelry.jsonl.gz');
    products.push(...fashionProducts);
    
    // Load Electronics
    const electronicsProducts = await this.loadAmazonCategory('meta_Electronics.jsonl.gz');
    products.push(...electronicsProducts);
    
    return products;
  }

  private async loadAmazonCategory(filename: string): Promise<AmazonProduct[]> {
    const filePath = path.join(this.DATA_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`[Preprocessor] Amazon file not found: ${filename}`);
      return [];
    }

    console.log(`[Preprocessor] Processing ${filename}...`);
    const products: AmazonProduct[] = [];
    
    const gunzip = zlib.createGunzip();
    const stream = createReadStream(filePath).pipe(gunzip);
    const rl = createInterface({ input: stream });

    let count = 0;
    const maxProducts = filename.includes('Clothing') ? 50000 : 30000; // Limit processing

    for await (const line of rl) {
      if (count >= maxProducts) break;
      
      try {
        const product = JSON.parse(line) as any;
        
        // Filter for quality products
        if (product.parent_asin && 
            product.title && 
            product.title.length > 10 &&
            product.images && product.images.length > 0) {
          
          products.push({
            parent_asin: product.parent_asin,
            title: product.title,
            price: product.price,
            images: product.images,
            store: product.store,
            categories: product.categories
          });
        }
        count++;
        
        if (count % 10000 === 0) {
          console.log(`[Preprocessor] Processed ${count} lines from ${filename}`);
        }
      } catch (err) {
        // Skip invalid JSON lines
        continue;
      }
    }
    
    console.log(`[Preprocessor] Loaded ${products.length} valid products from ${filename}`);
    return products;
  }

  private matchProducts(esciProducts: ESCIProduct[], amazonProducts: AmazonProduct[]): OptimizedProduct[] {
    console.log('[Preprocessor] Converting Amazon products to optimized format...');
    const matched: OptimizedProduct[] = [];
    
    // Since we're skipping ESCI, use Amazon products directly
    for (let i = 0; i < amazonProducts.length; i++) {
      const amazon = amazonProducts[i];
      
      if (amazon.parent_asin && amazon.title && amazon.images && amazon.images.length > 0) {
        matched.push({
          id: amazon.parent_asin,
          asin: amazon.parent_asin,
          title: amazon.title,
          price: amazon.price || this.generatePrice(amazon.title),
          imageUrl: amazon.images[0].large,
          brand: amazon.store || this.extractBrandFromTitle(amazon.title) || 'Unknown',
          category: this.categorizeProduct(amazon.title, amazon.categories),
          url: `https://www.amazon.com/dp/${amazon.parent_asin}`
        });
      }
    }
    
    console.log(`[Preprocessor] Converted ${matched.length} Amazon products to optimized format`);
    return matched;
  }

  private createAmazonIndex(products: AmazonProduct[]): Map<string, AmazonProduct[]> {
    const index = new Map<string, AmazonProduct[]>();
    
    for (const product of products) {
      const words = this.extractKeywords(product.title);
      for (const word of words) {
        if (!index.has(word)) {
          index.set(word, []);
        }
        index.get(word)!.push(product);
      }
    }
    
    return index;
  }

  private findBestMatch(esci: ESCIProduct, amazonIndex: Map<string, AmazonProduct[]>): AmazonProduct | null {
    const esciWords = this.extractKeywords(esci.product_title);
    const candidateMap = new Map<string, number>();
    
    // Find potential matches
    for (const word of esciWords) {
      const matches = amazonIndex.get(word) || [];
      for (const match of matches) {
        const key = match.parent_asin;
        candidateMap.set(key, (candidateMap.get(key) || 0) + 1);
      }
    }
    
    // Find best match by word overlap
    let bestMatch: AmazonProduct | null = null;
    let bestScore = 0;
    
    for (const [asin, score] of candidateMap.entries()) {
      if (score > bestScore && score >= 2) { // Require at least 2 word matches
        const candidate = amazonIndex.get(esciWords[0])?.find(p => p.parent_asin === asin);
        if (candidate) {
          // Additional scoring based on brand match
          let finalScore = score;
          if (esci.product_brand && candidate.store && 
              esci.product_brand.toLowerCase() === candidate.store.toLowerCase()) {
            finalScore += 5;
          }
          
          if (finalScore > bestScore) {
            bestScore = finalScore;
            bestMatch = candidate;
          }
        }
      }
    }
    
    return bestMatch;
  }

  private extractKeywords(title: string): string[] {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 10); // Limit keywords for efficiency
  }

  private categorizeProduct(title: string, categories?: string[]): string {
    const lowerTitle = title.toLowerCase();
    
    // Fashion category
    if (lowerTitle.match(/shoe|sneaker|boot|sandal|clothing|shirt|pants|jacket|dress|fashion|apparel|nike|adidas|puma|jordan/)) {
      return 'fashion';
    }
    
    // Electronics category
    if (lowerTitle.match(/phone|laptop|computer|tv|camera|headphone|tablet|gaming|electronics/)) {
      return 'electronics';
    }
    
    // Check Amazon categories if available
    if (categories && categories.length > 0) {
      const flatCategories = categories.join(' ').toLowerCase();
      if (flatCategories.includes('clothing') || flatCategories.includes('shoes') || flatCategories.includes('jewelry')) {
        return 'fashion';
      }
      if (flatCategories.includes('electronics') || flatCategories.includes('computer') || flatCategories.includes('phone')) {
        return 'electronics';
      }
    }
    
    return 'other';
  }

  private extractBrandFromTitle(title: string): string | null {
    const lowerTitle = title.toLowerCase();
    
    // Common brand patterns
    const brandPatterns = [
      /^(\w+)\s+/,  // First word is often the brand
      /\b(nike|adidas|puma|jordan|apple|samsung|sony|microsoft|dell|hp|lenovo|asus|acer|lg|panasonic|canon|nikon|bose|beats|amazon|google|facebook|meta|intel|amd|nvidia)\b/i
    ];
    
    for (const pattern of brandPatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      }
    }
    
    // Extract first word as potential brand if it's not a common word
    const firstWord = title.split(' ')[0];
    const commonWords = ['the', 'a', 'an', 'new', 'used', 'vintage', 'classic', 'modern', 'premium', 'deluxe'];
    
    if (firstWord && !commonWords.includes(firstWord.toLowerCase()) && firstWord.length > 2) {
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    }
    
    return null;
  }

  private generatePrice(title: string): number {
    const lowerTitle = title.toLowerCase();
    
    // Price estimation based on product type
    if (lowerTitle.includes('laptop') || lowerTitle.includes('computer')) return Math.round(Math.random() * 800 + 400);
    if (lowerTitle.includes('phone') || lowerTitle.includes('iphone')) return Math.round(Math.random() * 600 + 300);
    if (lowerTitle.includes('shoe') || lowerTitle.includes('sneaker')) return Math.round(Math.random() * 120 + 40);
    if (lowerTitle.includes('shirt') || lowerTitle.includes('jacket')) return Math.round(Math.random() * 80 + 20);
    
    return Math.round(Math.random() * 100 + 25);
  }

  private getPlaceholderImage(): string {
    return 'https://via.placeholder.com/400x400/f0f0f0/666666?text=Product+Image';
  }

  private optimizeProducts(products: OptimizedProduct[]): OptimizedProduct[] {
    // Group by category
    const byCategory = {
      fashion: products.filter(p => p.category === 'fashion'),
      electronics: products.filter(p => p.category === 'electronics'), 
      other: products.filter(p => p.category === 'other')
    };
    
    console.log(`[Preprocessor] Category distribution: Fashion: ${byCategory.fashion.length}, Electronics: ${byCategory.electronics.length}, Other: ${byCategory.other.length}`);
    
    // Apply limits and prioritize products with real Amazon data
    const optimized: OptimizedProduct[] = [];
    
    for (const [category, limit] of Object.entries(this.CATEGORY_LIMITS)) {
      const categoryProducts = byCategory[category as keyof typeof byCategory] || [];
      
      // Sort by priority: products with ASIN first, then by brand
      const sorted = categoryProducts.sort((a, b) => {
        if (a.asin && !b.asin) return -1;
        if (!a.asin && b.asin) return 1;
        return a.brand.localeCompare(b.brand);
      });
      
      optimized.push(...sorted.slice(0, limit));
    }
    
    return optimized;
  }

  private async writeOutputFiles(products: OptimizedProduct[]): Promise<void> {
    // Write main products file
    const productsFile = path.join(this.OUTPUT_DIR, 'amazon-products.json');
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
    
    // Create category-specific files for better organization
    const byCategory = {
      fashion: products.filter(p => p.category === 'fashion'),
      electronics: products.filter(p => p.category === 'electronics'),
      other: products.filter(p => p.category === 'other')
    };
    
    for (const [category, categoryProducts] of Object.entries(byCategory)) {
      const categoryFile = path.join(this.OUTPUT_DIR, `products-${category}.json`);
      fs.writeFileSync(categoryFile, JSON.stringify(categoryProducts, null, 2));
    }
    
    // Write summary statistics
    const stats = {
      totalProducts: products.length,
      withAmazonData: products.filter(p => p.asin).length,
      categories: {
        fashion: byCategory.fashion.length,
        electronics: byCategory.electronics.length,
        other: byCategory.other.length
      },
      averagePrice: Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length),
      generatedAt: new Date().toISOString()
    };
    
    const statsFile = path.join(this.OUTPUT_DIR, 'processing-stats.json');
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
    
    console.log('[Preprocessor] Output files written:');
    console.log(`  - amazon-products.json (${this.getFileSize(productsFile)})`);
    console.log(`  - products-fashion.json (${this.getFileSize(path.join(this.OUTPUT_DIR, 'products-fashion.json'))})`);
    console.log(`  - products-electronics.json (${this.getFileSize(path.join(this.OUTPUT_DIR, 'products-electronics.json'))})`);
    console.log(`  - products-other.json (${this.getFileSize(path.join(this.OUTPUT_DIR, 'products-other.json'))})`);
    console.log(`  - processing-stats.json (${this.getFileSize(statsFile)})`);
    console.log(`[Preprocessor] Statistics:`, stats);
  }

  private getFileSize(filePath: string): string {
    const stats = fs.statSync(filePath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    return `${sizeInMB}MB`;
  }
}

// Execute preprocessing
if (require.main === module) {
  const preprocessor = new AmazonDataPreprocessor();
  preprocessor.processData()
    .then(() => {
      console.log('[Preprocessor] Data preprocessing completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Preprocessor] Data preprocessing failed:', error);
      process.exit(1);
    });
}

export { AmazonDataPreprocessor };