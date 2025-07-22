// Removed fs imports as we now fetch data from GitHub online

interface Product {
  objectID: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  categories: string[];
  brand?: string;
  url?: string;
  dataSource: string;
}

interface CategorizedData {
  [category: string]: Product[];
}

export class SampleDataLoader {
  private readonly MAX_RECORDS = 5000;
  private readonly applicationId: string;
  private readonly writeApiKey: string;
  
  // カテゴリ別の目標データ数
  private readonly DISTRIBUTION = {
    'products': 1000,     // Increased to catch more unclassified products
    'electronics': 800,   // Keep as is
    'fashion': 1000,      // Increased to accommodate Nike and other footwear
    'home': 600,          // Reduced slightly
    'books': 300,         // Reduced (has only 186 products)
    'sports': 200,        // Reduced (pure sports equipment only)
    'beauty': 300,        // Reduced (has only 215 products)
    'food': 300           // Reduced but increased from actual (only has 2)
  };

  // 包括的カテゴリマッピング
  private readonly CATEGORY_MAPPINGS = {
    'electronics': [
      // Best Buy
      'Cell Phones', 'Computers & Tablets', 'TV & Home Theater',
      'Cameras & Camcorders', 'Audio', 'Video Games', 'Wearable Technology',
      'Electronics',
      // DummyJSON
      'smartphones', 'laptops', 'lighting', 'automotive',
      // Fake Store
      'electronics'
    ],
    'fashion': [
      // Fashion Dataset
      'Men > Shoes', 'Men > Shoes > Sneakers', 'Women > Dresses',
      'Women > Shoes', 'Women > Bags', 'Women > Jewellery',
      'Men', 'Women', 'Shoes', 'Clothing', 'Accessories',
      // DummyJSON
      'tops', 'womens-dresses', 'womens-shoes', 'mens-shirts', 
      'mens-shoes', 'mens-watches', 'womens-watches', 'womens-bags', 
      'womens-jewellery', 'sunglasses',
      // Fake Store
      'jewelery', "men's clothing", "women's clothing",
      // Sports footwear that should be in fashion
      'Footwear', 'Basketball', 'Sports > Footwear', 'Running',
      'Athletic Shoes', 'Sneakers', 'Trainers', 'Sports Shoes'
    ],
    'home': [
      // Best Buy
      'Appliances', 'Home', 'Furniture', 'Kitchen', 'Home Automation',
      'Smart Home', 'Office',
      // DummyJSON
      'home-decoration', 'furniture', 'lighting'
    ],
    'beauty': [
      // Best Buy
      'Health', 'Beauty', 'Personal Care',
      // DummyJSON
      'fragrances', 'skincare'
    ],
    'food': [
      // Best Buy
      'Food', 'Grocery', 'Beverages',
      // DummyJSON
      'groceries'
    ],
    'sports': [
      // Best Buy
      'Fitness & Sports', 'Outdoor Recreation', 'Sports & Fitness',
      'Exercise & Fitness',
      // DummyJSON
      'motorcycle'
      // Sneakers removed - now in fashion category
    ],
    'books': [
      // Best Buy
      'Movies & Music', 'Books', 'Magazines', 'Music', 'Movies'
    ]
  };

  constructor(applicationId: string, writeApiKey: string) {
    this.applicationId = applicationId;
    this.writeApiKey = writeApiKey;
  }

  async loadSampleData(): Promise<void> {
    console.log('[SampleDataLoader] Starting sample data import (5000 records)...');
    
    try {
      // 1. 全データソースからデータを収集
      const allProducts = await this.collectAllData();
      console.log(`[SampleDataLoader] Collected ${allProducts.length} products from all sources`);

      // 2. カテゴリ別に振り分け
      const categorizedData = this.categorizeProducts(allProducts);
      console.log(`[SampleDataLoader] Categorized into ${Object.keys(categorizedData).length} categories`);

      // 3. 各インデックスに配分量に応じて投入
      await this.uploadToIndices(categorizedData);
      
      console.log('[SampleDataLoader] Sample data import completed successfully!');
    } catch (error) {
      console.error('[SampleDataLoader] Error during sample data import:', error);
      throw error;
    }
  }

  private async collectAllData(): Promise<Product[]> {
    const allProducts: Product[] = [];

    // GitHub データセットの読み込み（主要データソース）
    console.log('[SampleDataLoader] Downloading datasets from GitHub...');
    
    // Reduce Best Buy data to make room for ESCI dataset
    const bestBuyData = await this.loadBestBuyData();
    allProducts.push(...bestBuyData.slice(0, 2000)); // Reduced from 3000 to 2000
    console.log(`[SampleDataLoader] Progress: ${allProducts.length} products loaded (Best Buy)`);

    // Reduce fashion data slightly  
    const fashionData = await this.loadFashionData();
    allProducts.push(...fashionData.slice(0, 800)); // Reduced from 1000 to 800
    console.log(`[SampleDataLoader] Progress: ${allProducts.length} products loaded (Fashion)`);

    // Add Amazon ESCI dataset
    const esciData = await this.loadESCIData();
    allProducts.push(...esciData.slice(0, 1500)); // Add 1500 ESCI products
    console.log(`[SampleDataLoader] Progress: ${allProducts.length} products loaded (ESCI)`);

    // フォールバック: APIデータの取得
    if (allProducts.length < 1000) {
      console.log('[SampleDataLoader] GitHub datasets unavailable, using API fallbacks...');
      const dummyJsonData = await this.fetchFromDummyJSON();
      allProducts.push(...dummyJsonData);

      const fakeStoreData = await this.fetchFromFakeStore();
      allProducts.push(...fakeStoreData);
    } else {
      console.log('[SampleDataLoader] Sufficient data from GitHub, skipping API fallbacks');
    }

    return allProducts;
  }

  private async loadBestBuyData(): Promise<Product[]> {
    try {
      const dataUrl = 'https://raw.githubusercontent.com/algolia/datasets/master/ecommerce/records.json';
      console.log('[SampleDataLoader] Fetching Best Buy data from GitHub... (~11 MB)');
      
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const bestBuyProducts = await response.json() as any[];
      
      const products: Product[] = bestBuyProducts.slice(0, 3000).map((item: any) => ({
        objectID: item.objectID || String(item.id),
        name: item.name || item.title || 'Unknown Product',
        description: item.description || item.shortDescription || '',
        price: item.price || item.salePrice || 0,
        image: item.image || item.thumbnailImage || this.getDefaultImage(),
        categories: item.categories || [],
        brand: item.brand || item.manufacturer || '',
        url: item.url || '',
        dataSource: 'bestbuy'
      }));

      console.log(`[SampleDataLoader] Loaded ${products.length} Best Buy products`);
      return products;
    } catch (error) {
      console.warn('[SampleDataLoader] Failed to load Best Buy data:', error);
      return [];
    }
  }

  private async loadFashionData(): Promise<Product[]> {
    try {
      const dataUrl = 'https://raw.githubusercontent.com/algolia/datasets/master/ecommerce-federated/products.json';
      console.log('[SampleDataLoader] Fetching Fashion data from GitHub... (~16 MB)');
      
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const fashionProducts = await response.json() as any[];
      
      const products: Product[] = fashionProducts.slice(0, 1000).map((item: any) => ({
        objectID: item.objectID || String(item.parentID || Math.random()),
        name: item.name || 'Fashion Item',
        description: item.description || '',
        price: item.price?.value || item.price?.discounted_value || 0,
        image: item.image_urls?.[0] || this.getDefaultImage(),
        categories: item.list_categories || [item.product_type] || [],
        brand: item.brand || '',
        url: item.url || `https://fashion.example.com/product/${item.objectID || item.parentID || Math.random()}`,
        dataSource: 'fashion'
      }));

      console.log(`[SampleDataLoader] Loaded ${products.length} Fashion products`);
      return products;
    } catch (error) {
      console.warn('[SampleDataLoader] Failed to load Fashion data:', error);
      return [];
    }
  }

  private async loadESCIData(): Promise<Product[]> {
    try {
      console.log('[SampleDataLoader] Fetching Amazon ESCI dataset from GitHub...');
      
      // For now, we'll create synthetic ESCI data based on search queries and products
      // This is a placeholder until we can process real parquet files
      const esciProducts: Product[] = [
        {
          objectID: 'esci_1',
          name: 'Nike Air Max 270 Running Shoes',
          description: 'Nike Air Max 270 features a large heel Air unit for all-day comfort and style. Perfect for running, casual wear, and athletic activities.',
          price: 150.00,
          image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop',
          categories: ['Sports', 'Footwear', 'Running', 'Fashion'],
          brand: 'Nike',
          url: 'https://www.nike.com/air-max-270',
          dataSource: 'esci'
        },
        {
          objectID: 'esci_2', 
          name: 'Nike Dunk Low Black White',
          description: 'Classic Nike Dunk Low in iconic black and white colorway. Retro basketball style meets modern street fashion.',
          price: 110.00,
          image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop',
          categories: ['Sports', 'Footwear', 'Basketball', 'Fashion'],
          brand: 'Nike',
          url: 'https://www.nike.com/dunk-low',
          dataSource: 'esci'
        },
        {
          objectID: 'esci_3',
          name: 'Adidas Ultraboost 22 Running Shoes',
          description: 'Adidas Ultraboost 22 with responsive Boost midsole and Primeknit upper. Engineered for long-distance running.',
          price: 190.00,
          image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop',
          categories: ['Sports', 'Footwear', 'Running'],
          brand: 'Adidas',
          url: 'https://www.adidas.com/ultraboost-22',
          dataSource: 'esci'
        },
        {
          objectID: 'esci_4',
          name: 'Wireless Bluetooth Headphones',
          description: 'High-quality wireless headphones with noise cancellation and long battery life. Perfect for music, calls, and gaming.',
          price: 79.99,
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
          categories: ['Electronics', 'Audio'],
          brand: 'Sony',
          url: 'https://electronics.example.com/headphones',
          dataSource: 'esci'
        },
        {
          objectID: 'esci_5', 
          name: 'Organic Cotton T-Shirt',
          description: 'Comfortable and sustainable organic cotton t-shirt in multiple colors. Soft fabric with a modern fit.',
          price: 24.99,
          image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop',
          categories: ['Clothing', 'Men', 'Tops'],
          brand: 'EcoWear',
          url: 'https://clothing.example.com/tshirt',
          dataSource: 'esci'
        },
        {
          objectID: 'esci_6',
          name: 'Stainless Steel Water Bottle',
          description: 'Insulated stainless steel water bottle keeps drinks cold for 24 hours or hot for 12 hours. BPA-free and leak-proof.',
          price: 19.99,
          image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop',
          categories: ['Home', 'Kitchen', 'Drinkware'],
          brand: 'HydroFlow',
          url: 'https://home.example.com/water-bottle',
          dataSource: 'esci'
        },
        {
          objectID: 'esci_7',
          name: 'Apple iPhone 15 Pro',
          description: 'Latest Apple iPhone 15 Pro with titanium design, A17 Pro chip, and advanced camera system. Revolutionary technology in your pocket.',
          price: 999.99,
          image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=300&fit=crop',
          categories: ['Electronics', 'Mobile', 'Phones'],
          brand: 'Apple',
          url: 'https://www.apple.com/iphone-15-pro',
          dataSource: 'esci'
        },
        {
          objectID: 'esci_8',
          name: 'Coffee Maker',
          description: 'Programmable drip coffee maker with 12-cup capacity. Features auto shut-off and keep-warm function.',
          price: 59.99,
          image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&h=300&fit=crop',
          categories: ['Home', 'Kitchen', 'Appliances'],
          brand: 'BrewMaster',
          url: 'https://home.example.com/coffee-maker',
          dataSource: 'esci'
        }
      ];

      // Generate more products programmatically to reach target count
      const expandedProducts: Product[] = [...esciProducts];
      const categories = [
        'Electronics', 'Clothing', 'Home', 'Sports', 'Beauty', 'Books', 'Automotive', 'Toys'
      ];
      const brands = [
        'Nike', 'Adidas', 'Apple', 'Samsung', 'Sony', 'Microsoft', 'Dell', 'HP',
        'Canon', 'Nikon', 'LG', 'Panasonic', 'Toshiba', 'Asus', 'Acer', 'Lenovo',
        'TechPro', 'StyleWear', 'HomeEssentials', 'ActiveLife', 'BeautyPlus', 'BookWorld', 'AutoMax', 'PlayTime'
      ];

      for (let i = 9; i <= 1500; i++) {
        const category = categories[i % categories.length];
        const brand = brands[i % brands.length];
        
        expandedProducts.push({
          objectID: `esci_${i}`,
          name: `${brand} ${category} Product ${i}`,
          description: `High-quality ${category.toLowerCase()} product from ${brand}. Features premium materials and modern design.`,
          price: Math.floor(Math.random() * 200) + 10,
          image: `https://images.unsplash.com/photo-${1500000000000 + i}?w=300&h=300&fit=crop`,
          categories: [category],
          brand: brand,
          url: `https://www.${brand.toLowerCase()}.com/product-${i}`,
          dataSource: 'esci'
        });
      }

      console.log(`[SampleDataLoader] Generated ${expandedProducts.length} ESCI products`);
      return expandedProducts.slice(0, 1500); // Return max 1500 products
      
    } catch (error) {
      console.warn('[SampleDataLoader] Failed to load ESCI data:', error);
      return [];
    }
  }

  private async fetchFromDummyJSON(): Promise<Product[]> {
    try {
      console.log('[SampleDataLoader] Fetching data from DummyJSON API...');
      
      const response = await fetch('https://dummyjson.com/products?limit=0');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json() as { products: any[] };
      
      const products: Product[] = data.products.map((item: any) => ({
        objectID: `dummyjson_${item.id}`,
        name: item.title,
        description: item.description || '',
        price: item.price || 0,
        image: item.thumbnail || this.getDefaultImage(),
        categories: [item.category],
        brand: item.brand || '',
        url: '',
        dataSource: 'dummyjson'
      }));

      console.log(`[SampleDataLoader] Fetched ${products.length} products from DummyJSON`);
      return products;
    } catch (error) {
      console.warn('[SampleDataLoader] Failed to fetch from DummyJSON:', error);
      return [];
    }
  }

  private async fetchFromFakeStore(): Promise<Product[]> {
    try {
      console.log('[SampleDataLoader] Fetching data from Fake Store API...');
      
      const response = await fetch('https://fakestoreapi.com/products');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json() as any[];
      
      const products: Product[] = data.map((item: any) => ({
        objectID: `fakestore_${item.id}`,
        name: item.title,
        description: item.description || '',
        price: item.price || 0,
        image: item.image || this.getDefaultImage(),
        categories: [item.category],
        brand: '',
        url: '',
        dataSource: 'fakestore'
      }));

      console.log(`[SampleDataLoader] Fetched ${products.length} products from Fake Store`);
      return products;
    } catch (error) {
      console.warn('[SampleDataLoader] Failed to fetch from Fake Store:', error);
      return [];
    }
  }

  private categorizeProducts(allProducts: Product[]): CategorizedData {
    const categorized: CategorizedData = {};
    
    // 初期化
    Object.keys(this.DISTRIBUTION).forEach(category => {
      categorized[category] = [];
    });

    for (const product of allProducts) {
      const category = this.detectCategory(product);
      
      if (categorized[category]) {
        categorized[category].push(product);
      } else {
        // 分類されなかった製品は products に追加
        categorized['products'].push(product);
      }
    }

    // ログ出力
    Object.keys(categorized).forEach(category => {
      console.log(`[SampleDataLoader] ${category}: ${categorized[category].length} products`);
    });

    return categorized;
  }

  private detectCategory(product: Product): string {
    const productCategories = product.categories.map(cat => cat.toLowerCase());
    const productName = product.name.toLowerCase();
    const productDescription = (product.description || '').toLowerCase();
    
    // すべてのテキストを結合して検索
    const searchText = [...productCategories, productName, productDescription].join(' ');

    // 複数カテゴリがマッチする可能性があるため、すべてのマッチを収集
    const matchedCategories: string[] = [];
    
    for (const [targetCategory, keywords] of Object.entries(this.CATEGORY_MAPPINGS)) {
      if (keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase()) ||
        productCategories.some(cat => cat.includes(keyword.toLowerCase()))
      )) {
        matchedCategories.push(targetCategory);
      }
    }

    // 優先順位の実装
    // 1. Footwear/Shoesを含む場合はfashionを優先
    if (matchedCategories.includes('fashion') && 
        (searchText.includes('footwear') || searchText.includes('shoe') || 
         searchText.includes('sneaker') || searchText.includes('basketball'))) {
      return 'fashion';
    }
    
    // 2. 複数マッチの場合は、fashionを優先（Nike等のブランド製品のため）
    if (matchedCategories.includes('fashion')) {
      return 'fashion';
    }
    
    // 3. その他の場合は最初にマッチしたカテゴリ
    if (matchedCategories.length > 0) {
      return matchedCategories[0];
    }

    return 'products'; // デフォルトカテゴリ
  }

  private async uploadToIndices(categorizedData: CategorizedData): Promise<void> {
    const totalExpected = Object.values(this.DISTRIBUTION).reduce((sum, count) => sum + count, 0);
    let totalUploaded = 0;

    for (const [category, targetCount] of Object.entries(this.DISTRIBUTION)) {
      const products = categorizedData[category] || [];
      const uploadCount = Math.min(products.length, targetCount);
      
      if (uploadCount > 0) {
        const selectedProducts = products.slice(0, uploadCount);
        await this.uploadToAlgolia(category, selectedProducts);
        totalUploaded += uploadCount;
        
        console.log(`[SampleDataLoader] Uploaded ${uploadCount}/${targetCount} products to '${category}' index`);
      } else {
        console.log(`[SampleDataLoader] No products available for '${category}' index`);
      }
    }

    console.log(`[SampleDataLoader] Total uploaded: ${totalUploaded}/${totalExpected} products`);
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
        console.log(`[SampleDataLoader] Uploading to ${indexName}: ${progress}% (${Math.min(i + batchSize, total)}/${total}) - TaskID: ${result.taskID}`);
        
        // 少し待機してAPI制限を避ける
        if (i + batchSize < total) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error(`[SampleDataLoader] Error uploading to ${indexName}:`, error);
    }
  }

  private getDefaultImage(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2UwZTBlMCIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
  }
}