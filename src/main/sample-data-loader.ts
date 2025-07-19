import { readFileSync } from 'fs';
import { join } from 'path';

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
    'products': 1000,
    'electronics': 1000,
    'fashion': 1000,
    'home': 500,
    'books': 300,
    'sports': 300,
    'beauty': 300,
    'food': 300
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
      'jewelery', "men's clothing", "women's clothing"
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
      'motorcycle',
      // スポーツシューズ関連
      'Sneakers'
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

    // ローカルデータの読み込み
    const bestBuyData = await this.loadBestBuyData();
    allProducts.push(...bestBuyData);

    const fashionData = await this.loadFashionData();
    allProducts.push(...fashionData);

    // APIデータの取得
    const dummyJsonData = await this.fetchFromDummyJSON();
    allProducts.push(...dummyJsonData);

    const fakeStoreData = await this.fetchFromFakeStore();
    allProducts.push(...fakeStoreData);

    return allProducts;
  }

  private async loadBestBuyData(): Promise<Product[]> {
    try {
      const dataPath = '/mnt/m/workContest/Algolia_datasets-master/ecommerce/records.json';
      console.log('[SampleDataLoader] Loading Best Buy data...');
      
      const rawData = readFileSync(dataPath, 'utf8');
      const bestBuyProducts = JSON.parse(rawData);
      
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
      const dataPath = '/mnt/m/workContest/Algolia_datasets-master/ecommerce-federated/products.json';
      console.log('[SampleDataLoader] Loading Fashion data...');
      
      const rawData = readFileSync(dataPath, 'utf8');
      const fashionProducts = JSON.parse(rawData);
      
      const products: Product[] = fashionProducts.slice(0, 1000).map((item: any) => ({
        objectID: item.objectID || String(item.parentID || Math.random()),
        name: item.name || 'Fashion Item',
        description: item.description || '',
        price: item.price?.value || item.price?.discounted_value || 0,
        image: item.image_urls?.[0] || this.getDefaultImage(),
        categories: item.list_categories || [item.product_type] || [],
        brand: item.brand || '',
        url: '',
        dataSource: 'fashion'
      }));

      console.log(`[SampleDataLoader] Loaded ${products.length} Fashion products`);
      return products;
    } catch (error) {
      console.warn('[SampleDataLoader] Failed to load Fashion data:', error);
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

    // カテゴリマッピングでマッチング
    for (const [targetCategory, keywords] of Object.entries(this.CATEGORY_MAPPINGS)) {
      if (keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase()) ||
        productCategories.some(cat => cat.includes(keyword.toLowerCase()))
      )) {
        return targetCategory;
      }
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