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

interface CategorizedData {
  [category: string]: Product[];
}

export class SampleDataLoader {
  private readonly applicationId: string;
  private readonly writeApiKey: string;
  
  // Popular shoe brands with their iconic models
  private readonly SHOE_BRANDS = {
    'Nike': ['Air Max 90', 'Air Force 1', 'Dunk Low', 'Blazer Mid', 'Air Jordan 1', 'React Vision', 'Air Max 270'],
    'Adidas': ['Ultra Boost', 'Stan Smith', 'Superstar', 'NMD R1', 'Yeezy Boost 350', 'Forum Low', 'Gazelle'],
    'New Balance': ['574', '990v5', '550', '327', '2002R'],
    'Puma': ['Suede Classic', 'RS-X³', 'Clyde', 'Future Rider'],
    'Vans': ['Old Skool', 'Sk8-Hi', 'Authentic', 'Era'],
    'Converse': ['Chuck Taylor All Star', 'Chuck 70', 'One Star'],
    'Reebok': ['Club C', 'Classic Leather', 'Instapump Fury'],
    'Under Armour': ['Curry 8', 'HOVR Phantom', 'Charged Rogue'],
    'ASICS': ['Gel-Kayano', 'Gel-Lyte III', 'GT-2000'],
    'Saucony': ['Jazz Original', 'Shadow 5000', 'Kinvara']
  };

  // Fixed category quotas optimized for search quality
  private readonly CATEGORY_QUOTAS = {
    fashion: 1500,    // Primary category for shoes and apparel
    electronics: 1000,
    products: 1000,   // General products
    sports: 500,      // Sports equipment and athletic wear
    home: 400,
    beauty: 300,
    books: 200,
    food: 100
  };

  constructor(applicationId: string, writeApiKey: string) {
    this.applicationId = applicationId;
    this.writeApiKey = writeApiKey;
  }

  async loadSampleData(): Promise<void> {
    console.log('[SampleDataLoader] Starting optimized sample data import...');
    
    try {
      // Clear all indices first
      await this.clearAllIndices();
      
      // Generate optimized dataset with brand focus
      const products = await this.generateOptimizedDataset();
      console.log(`[SampleDataLoader] Generated ${products.length} optimized products`);

      // Upload to indices
      await this.uploadToIndices(products);
      
      console.log('[SampleDataLoader] Sample data import completed successfully!');
    } catch (error) {
      console.error('[SampleDataLoader] Error during sample data import:', error);
      throw error;
    }
  }

  private async clearAllIndices(): Promise<void> {
    console.log('[SampleDataLoader] Clearing all indices...');
    const indices = Object.keys(this.CATEGORY_QUOTAS);
    
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
          console.log(`[SampleDataLoader] Cleared index: ${indexName}`);
        }
      } catch (error) {
        console.warn(`[SampleDataLoader] Failed to clear index ${indexName}:`, error);
      }
    }
  }

  private async generateOptimizedDataset(): Promise<Product[]> {
    const allProducts: Product[] = [];
    
    // 1. Generate brand shoes (1500 products)
    console.log('[SampleDataLoader] Generating brand shoes...');
    const shoes = this.generateBrandShoes();
    allProducts.push(...shoes);
    
    // 2. Generate electronics (1000 products)
    console.log('[SampleDataLoader] Generating electronics...');
    const electronics = this.generateElectronics();
    allProducts.push(...electronics);
    
    // 3. Generate other categories
    console.log('[SampleDataLoader] Generating other categories...');
    const others = await this.generateOtherCategories();
    allProducts.push(...others);
    
    // Shuffle for variety
    return this.shuffleArray(allProducts).slice(0, 5000);
  }

  private generateBrandShoes(): Product[] {
    const shoes: Product[] = [];
    const colors = ['Black', 'White', 'Black/White', 'Red', 'Blue', 'Grey', 'Navy', 'Green'];
    let productId = 1;
    
    Object.entries(this.SHOE_BRANDS).forEach(([brand, models]) => {
      models.forEach(model => {
        // Generate multiple colorways for each model
        const numColorways = Math.min(3, colors.length);
        for (let i = 0; i < numColorways; i++) {
          const color = colors[i];
          const basePrice = this.getShoePrice(brand);
          const price = Math.round(basePrice + (Math.random() * 30 - 15)); // ±$15 variation
          
          shoes.push({
            objectID: `shoe_${productId++}`,
            name: `${brand} ${model} - ${color}`,
            description: `${brand} ${model} athletic shoes in ${color} colorway. Premium comfort and style for everyday wear and sports activities.`,
            price: price,
            salePrice: Math.random() > 0.7 ? Math.round(price * 0.85) : undefined,
            image: `https://picsum.photos/seed/${brand}-${model}-${color}/400/400`,
            categories: ['Shoes', 'Footwear', 'Fashion', brand, 'Athletic'],
            brand: brand,
            color: color,
            url: `https://shopping.example.com/shoes/${brand.toLowerCase()}/${model.toLowerCase().replace(/\s+/g, '-')}`,
            sourceIndex: 'fashion'
          });
        }
      });
    });
    
    return shoes;
  }

  private getShoePrice(brand: string): number {
    // Price ranges optimized for "under $100" searches
    const priceRanges: { [key: string]: number } = {
      'Nike': 85,
      'Adidas': 80,
      'New Balance': 90,
      'Puma': 70,
      'Vans': 65,
      'Converse': 60,
      'Reebok': 75,
      'Under Armour': 85,
      'ASICS': 95,
      'Saucony': 85
    };
    
    return priceRanges[brand] || 75;
  }

  private generateElectronics(): Product[] {
    const electronics: Product[] = [];
    const brands = ['Apple', 'Samsung', 'Sony', 'Microsoft', 'Dell', 'HP', 'Lenovo', 'ASUS', 'LG', 'Bose'];
    const categories = [
      { name: 'Smartphones', price: 699 },
      { name: 'Laptops', price: 999 },
      { name: 'Headphones', price: 199 },
      { name: 'Tablets', price: 499 },
      { name: 'Smartwatches', price: 299 },
      { name: 'Cameras', price: 599 },
      { name: 'Gaming Consoles', price: 399 },
      { name: 'Monitors', price: 299 }
    ];
    
    let productId = 1000;
    
    brands.forEach(brand => {
      categories.forEach(category => {
        const basePrice = category.price;
        const price = Math.round(basePrice + (Math.random() * 200 - 100));
        
        electronics.push({
          objectID: `elec_${productId++}`,
          name: `${brand} ${category.name} Pro`,
          description: `Latest ${brand} ${category.name.toLowerCase()} with advanced features and premium build quality.`,
          price: price,
          salePrice: Math.random() > 0.8 ? Math.round(price * 0.9) : undefined,
          image: `https://picsum.photos/seed/${brand}-${category.name}/400/400`,
          categories: ['Electronics', category.name, brand],
          brand: brand,
          url: `https://shopping.example.com/electronics/${brand.toLowerCase()}`,
          sourceIndex: 'electronics'
        });
      });
    });
    
    return electronics;
  }

  private async generateOtherCategories(): Promise<Product[]> {
    const products: Product[] = [];
    
    // Home products
    const homeProducts = this.generateCategoryProducts('home', 400, [
      'Furniture', 'Kitchen', 'Bedding', 'Decor', 'Storage'
    ], ['IKEA', 'West Elm', 'Crate & Barrel', 'Wayfair']);
    
    // Beauty products
    const beautyProducts = this.generateCategoryProducts('beauty', 300, [
      'Skincare', 'Makeup', 'Fragrance', 'Hair Care'
    ], ['Sephora', 'MAC', 'Clinique', 'Olay']);
    
    // Books
    const bookProducts = this.generateCategoryProducts('books', 200, [
      'Fiction', 'Non-Fiction', 'Biography', 'Science'
    ], ['Penguin', 'HarperCollins', 'Random House']);
    
    // Sports equipment
    const sportsProducts = this.generateCategoryProducts('sports', 500, [
      'Fitness Equipment', 'Yoga', 'Running Gear', 'Team Sports'
    ], ['Nike', 'Adidas', 'Wilson', 'Spalding']);
    
    // Food
    const foodProducts = this.generateCategoryProducts('food', 100, [
      'Snacks', 'Beverages', 'Organic', 'Gourmet'
    ], ['Whole Foods', 'Trader Joe\'s', 'Organic Valley']);
    
    // General products
    const generalProducts = this.generateCategoryProducts('products', 1000, [
      'Accessories', 'Tools', 'Office Supplies', 'Pet Supplies', 'Toys'
    ], ['Generic', 'AmazonBasics', 'Store Brand']);
    
    products.push(
      ...homeProducts,
      ...beautyProducts,
      ...bookProducts,
      ...sportsProducts,
      ...foodProducts,
      ...generalProducts
    );
    
    return products;
  }

  private generateCategoryProducts(
    category: string,
    count: number,
    subcategories: string[],
    brands: string[]
  ): Product[] {
    const products: Product[] = [];
    let productId = category.charCodeAt(0) * 1000;
    
    for (let i = 0; i < count; i++) {
      const subcategory = subcategories[i % subcategories.length];
      const brand = brands[i % brands.length];
      const price = Math.round(Math.random() * 150 + 10);
      
      products.push({
        objectID: `${category}_${productId++}`,
        name: `${brand} ${subcategory} Item ${i + 1}`,
        description: `High-quality ${subcategory.toLowerCase()} product from ${brand}. Great value and performance.`,
        price: price,
        salePrice: Math.random() > 0.8 ? Math.round(price * 0.85) : undefined,
        image: `https://picsum.photos/seed/${category}-${i}/400/400`,
        categories: [this.capitalizeCategory(category), subcategory],
        brand: brand,
        url: `https://shopping.example.com/${category}/${productId}`,
        sourceIndex: category
      });
    }
    
    return products;
  }

  private capitalizeCategory(category: string): string {
    const categoryNames: { [key: string]: string } = {
      'electronics': 'Electronics',
      'fashion': 'Fashion',
      'home': 'Home & Garden',
      'beauty': 'Beauty & Personal Care',
      'books': 'Books & Media',
      'sports': 'Sports & Outdoors',
      'food': 'Food & Beverages',
      'products': 'General'
    };
    
    return categoryNames[category] || category;
  }

  private async uploadToIndices(products: Product[]): Promise<void> {
    // Group products by their target index
    const productsByIndex: { [index: string]: Product[] } = {};
    
    products.forEach(product => {
      const index = this.determineIndex(product);
      if (!productsByIndex[index]) {
        productsByIndex[index] = [];
      }
      productsByIndex[index].push(product);
    });
    
    // Upload to each index respecting quotas
    for (const [indexName, quota] of Object.entries(this.CATEGORY_QUOTAS)) {
      const indexProducts = productsByIndex[indexName] || [];
      const uploadCount = Math.min(indexProducts.length, quota);
      
      if (uploadCount > 0) {
        await this.uploadToAlgolia(indexName, indexProducts.slice(0, uploadCount));
        console.log(`[SampleDataLoader] Uploaded ${uploadCount} products to ${indexName}`);
      }
    }
  }

  private determineIndex(product: Product): string {
    // Use sourceIndex if specified
    if (product.sourceIndex) {
      return product.sourceIndex;
    }
    
    // Determine based on categories
    const categories = product.categories.map(c => c.toLowerCase());
    
    if (categories.some(c => c.includes('shoe') || c.includes('footwear'))) {
      // Shoes go to both fashion and sports
      return Math.random() > 0.7 ? 'sports' : 'fashion';
    }
    
    if (categories.some(c => c.includes('electronic') || c.includes('phone') || c.includes('laptop'))) {
      return 'electronics';
    }
    
    if (categories.some(c => c.includes('beauty') || c.includes('skincare'))) {
      return 'beauty';
    }
    
    if (categories.some(c => c.includes('home') || c.includes('furniture'))) {
      return 'home';
    }
    
    if (categories.some(c => c.includes('book') || c.includes('media'))) {
      return 'books';
    }
    
    if (categories.some(c => c.includes('sport') || c.includes('fitness'))) {
      return 'sports';
    }
    
    if (categories.some(c => c.includes('food') || c.includes('beverage'))) {
      return 'food';
    }
    
    return 'products';
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
          console.error(`[SampleDataLoader] Failed to upload batch to ${indexName}:`, errorText);
          continue;
        }

        const result = await response.json() as { taskID?: number };
        const progress = Math.min(100, Math.round((i + batchSize) / total * 100));
        console.log(`[SampleDataLoader] Uploading to ${indexName}: ${progress}% - TaskID: ${result.taskID}`);
        
        // Rate limiting
        if (i + batchSize < total) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error(`[SampleDataLoader] Error uploading to ${indexName}:`, error);
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}