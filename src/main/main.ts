import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { DatabaseService } from './database'
import { PersonalizationEngine, MLTrainingEvent } from './personalization'
import { GeminiService, ImageAnalysis } from './gemini-service'
import { AlgoliaMCPService } from './algolia-mcp-service'
import { Logger } from './logger'
import { copyFileSync, existsSync } from 'fs'
import { SearchSession, IPCSearchResult } from '../shared/types'
import { NaturalLanguageParser, ParsedConstraints } from './natural-language-parser'

class MainApplication {
  private mainWindow: BrowserWindow | null = null
  private database: DatabaseService
  private personalization: PersonalizationEngine
  private geminiService: GeminiService
  private algoliaMCPService: AlgoliaMCPService
  private logger: Logger
  private nlpParser: NaturalLanguageParser
  private searchResultCache: Map<string, { 
    timestamp: number, 
    result: IPCSearchResult, 
    originalQuery: string,
    imageAnalysis?: ImageAnalysis 
  }> = new Map()
  private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.logger = Logger.getInstance()
    this.nlpParser = new NaturalLanguageParser()
    this.database = new DatabaseService()
    this.personalization = new PersonalizationEngine(this.database.database)
    this.geminiService = new GeminiService()
    this.algoliaMCPService = new AlgoliaMCPService()
    this.setupApp()
    this.setupIPC()
  }

  private setupApp() {
    app.whenReady().then(() => {
      this.logger.initialize()
      this.logger.info('Main', 'Application starting up')
      this.createWindow()
      this.database.initialize()
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit()
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow()
      }
    })
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      autoHideMenuBar: true,  // PRODUCTION: Hide menu bar
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173')
      // this.mainWindow.webContents.openDevTools()  // PRODUCTION: DevTools disabled
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
      // デバッグ用（必要時にコメントを外す）
      // this.mainWindow.webContents.openDevTools()  // PRODUCTION: Enable only for debugging
    }
  }

  private getDefaultProductImage(): string {
    // Base64 encoded default product image (gray box with "No Image" text)
    // This is a small gray square that serves as a placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2UwZTBlMCIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+'
  }

  private setupIPC() {
    // Search products using Algolia
    ipcMain.handle('search-products', async (event, query: string, imageData?: string, discoveryPercentage?: number): Promise<IPCSearchResult> => {
      const searchStartTime = Date.now();
      console.log('[Search] Starting product search...');
      console.log('[Search] Query:', query);
      console.log('[Search] Has image data:', !!imageData);
      
      try {
        // Check if this is a follow-up query (e.g., "Can you find one for under $200?")
        const isFollowUpQuery = !imageData && (
          query.toLowerCase().includes('under') || 
          query.toLowerCase().includes('less than') ||
          query.toLowerCase().includes('cheaper') ||
          query.toLowerCase().includes('for under') ||
          query.toLowerCase().includes('more than') ||
          query.toLowerCase().includes('over') ||
          query.toLowerCase().includes('between') ||
          query.toLowerCase().includes('can you find') ||
          query.toLowerCase().includes('show me') ||
          query.toLowerCase().includes('filter') ||
          query.toLowerCase().includes('in black') ||
          query.toLowerCase().includes('in white') ||
          query.toLowerCase().includes('in red') ||
          query.toLowerCase().includes('in blue')
        );

        // Clean up expired cache entries
        const now = Date.now();
        for (const [key, value] of this.searchResultCache.entries()) {
          if (now - value.timestamp > this.CACHE_EXPIRY_MS) {
            this.searchResultCache.delete(key);
          }
        }

        // If this is a follow-up query and we have cached results, filter them instead of searching again
        if (isFollowUpQuery && this.searchResultCache.size > 0) {
          console.log('[Search] Follow-up query detected, checking cache...');
          
          // Get the most recent cached result
          const latestCachedResult = Array.from(this.searchResultCache.values())
            .sort((a, b) => b.timestamp - a.timestamp)[0];
          
          if (latestCachedResult && now - latestCachedResult.timestamp < this.CACHE_EXPIRY_MS) {
            console.log('[Search] Using cached results for follow-up filtering');
            
            // Parse the new constraints from the follow-up query
            const followUpConstraints = this.nlpParser.parse(query);
            console.log('[Search] Follow-up constraints:', followUpConstraints);
            
            // Apply the new constraints to the cached products
            let filteredProducts = [...latestCachedResult.result.products];
            
            // Apply price filter
            if (followUpConstraints?.priceRange) {
              const { min, max } = followUpConstraints.priceRange;
              console.log(`[Search] Applying price filter: $${min || 0} - $${max || '∞'} to ${filteredProducts.length} products`);
              
              const beforeFilter = filteredProducts.length;
              filteredProducts = filteredProducts.filter(product => {
                const price = (product as any).salePrice || product.price;
                const passFilter = (min === undefined || price >= min) && (max === undefined || price <= max);
                
                if (!passFilter && filteredProducts.length <= 10) {
                  // Log why products are being filtered out (for first 10)
                  console.log(`[Search] Product filtered out: "${product.name}" - price: $${price} (range: $${min || 0}-$${max || '∞'})`);
                }
                
                return passFilter;
              });
              console.log(`[Search] Price filter result: ${beforeFilter} → ${filteredProducts.length} products (${beforeFilter - filteredProducts.length} filtered out)`);
            }
            
            // Apply color filter
            if (followUpConstraints?.colors && followUpConstraints.colors.length > 0) {
              const colors = followUpConstraints.colors.map(c => c.toLowerCase());
              filteredProducts = filteredProducts.filter(product => {
                const productText = `${product.name} ${product.description || ''}`.toLowerCase();
                return colors.some(color => productText.includes(color));
              });
              console.log(`[Search] Applied color filter: ${colors.join(', ')}, remaining: ${filteredProducts.length}`);
            }
            
            // Create the filtered result
            const filteredResult: IPCSearchResult = {
              products: filteredProducts,
              totalResultsBeforeFilter: latestCachedResult.result.products.length,
              totalResultsAfterFilter: filteredProducts.length,
              imageAnalysis: latestCachedResult.result.imageAnalysis,
              constraints: {
                ...latestCachedResult.result.constraints,
                ...followUpConstraints,
                applied: true
              },
              filteringDetails: {
                priceFiltered: latestCachedResult.result.products.length - filteredProducts.length,
                filteredOut: latestCachedResult.result.products.length - filteredProducts.length
              }
            };
            
            console.log('[Search] Returning filtered cached results:', filteredProducts.length, 'products');
            return filteredResult;
          }
        }

        let searchQuery = query;
        let imageAnalysis: ImageAnalysis | undefined = undefined;
        let searchConstraints: ParsedConstraints | undefined;

        // Parse natural language constraints from query (for both image and text searches)
        searchConstraints = this.nlpParser.parse(query);
        console.log('[Search] Parsed constraints:', searchConstraints);

        // If image data is provided, analyze it with Gemini API
        if (imageData) {
          console.log('[Search] Processing image data...');
          try {
            // Initialize Gemini service with API key if available
            const apiKeysArray = await this.database.getAPIKeys();
            console.log('[Search] Retrieved API keys, count:', apiKeysArray.length);
            
            const geminiKey = apiKeysArray.find(key => key.provider === 'gemini')?.encrypted_key;
            console.log('[Search] Gemini key available:', !!geminiKey);
            
            if (geminiKey) {
              console.log('[Search] Initializing Gemini service...');
              await this.geminiService.initialize(geminiKey);
              
              // Analyze the image with progress tracking
              console.log('[Search] Analyzing image with Gemini...');
              imageAnalysis = await this.geminiService.analyzeImage(imageData, query, (status, progress) => {
                // Send progress updates to renderer
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                  this.mainWindow.webContents.send('image-analysis-progress', { status, progress });
                }
                console.log(`[Search] Analysis progress: ${status} (${progress}%)`);
              });
              
              // Combine image keywords with original query for better matching
              const originalQuery = searchQuery;
              const imageKeywords = imageAnalysis.searchKeywords.join(' ');
              
              // Preserve original query if it contains constraints or specific details
              if (originalQuery && (
                originalQuery.toLowerCase().includes('under') || 
                originalQuery.toLowerCase().includes('less than') ||
                originalQuery.toLowerCase().includes('over') ||
                originalQuery.toLowerCase().includes('more than') ||
                originalQuery.toLowerCase().includes('similar') ||
                originalQuery.toLowerCase().includes('like') ||
                searchConstraints?.priceRange ||
                searchConstraints?.colors?.length ||
                searchConstraints?.styles?.length
              )) {
                // Combine image analysis with original query constraints
                searchQuery = `${imageKeywords} ${originalQuery}`;
                console.log('[Search] Combined image keywords with original query:', searchQuery);
              } else {
                // Use only image keywords if no constraints in original query
                searchQuery = imageKeywords;
                console.log('[Search] Using image keywords for search:', searchQuery);
              }
              console.log('[Search] Original query preserved for constraints:', originalQuery);
              console.log('[Search] Natural language constraints will be applied after search');
            } else {
              console.warn('[Search] Gemini API key not available, skipping image analysis');
            }
          } catch (error) {
            console.warn('[Search] Gemini image analysis failed, continuing with text search:', error);
          }
        } else {
          // For text-only searches, extract product keywords and clean the query
          console.log('[Search] Processing text-only search');
          console.log('[Search] Product keywords found:', searchConstraints?.productKeywords);
          
          if (searchConstraints?.productKeywords && searchConstraints.productKeywords.length > 0) {
            // Use extracted product keywords as the primary search query
            searchQuery = searchConstraints.productKeywords.join(' ');
            console.log('[Search] Using extracted product keywords:', searchQuery);
          } else {
            // Clean the query by removing constraint terms
            searchQuery = this.nlpParser.cleanQuery(query, searchConstraints || {});
            console.log('[Search] No product keywords found, using cleaned query:', searchQuery);
          }
        }

        // 標準インデックス構成の定義
        const STANDARD_INDICES = {
          all: 'products',        // 全商品（デフォルト・フォールバック）
          electronics: 'electronics',  // 電子機器
          fashion: 'fashion',           // ファッション
          books: 'books',               // 書籍
          home: 'home',                 // ホーム用品
          sports: 'sports',             // スポーツ用品
          beauty: 'beauty',             // 美容・コスメ
          food: 'food'                  // 食品
        };

        // ユーザーのAlgolia APIキーを取得
        console.log('[Search] Getting user Algolia API keys...');
        const apiKeysArray = await this.database.getAPIKeys();
        const algoliaAppId = apiKeysArray.find(key => key.provider === 'algoliaAppId')?.encrypted_key;
        const algoliaApiKey = apiKeysArray.find(key => key.provider === 'algoliaSearchKey')?.encrypted_key;
        const algoliaWriteKey = apiKeysArray.find(key => key.provider === 'algoliaWriteKey')?.encrypted_key;
        
        let actualAppId, actualApiKey;
        
        
        if (!algoliaAppId || !algoliaApiKey || !algoliaWriteKey) {
          console.error('[Search] User Algolia API keys not found or incomplete.');
          console.error('[Search] Please configure all Algolia API keys in Settings.');
          // API keys are required - return error
          const error = 'Algolia API keys are not configured. Please go to Settings and add your Algolia Application ID, Search API Key, and Write API Key.';
          return {
            products: [],
            imageAnalysis: undefined
          };
        } else {
          console.log('[Search] Using user-configured Algolia API keys.');
          actualAppId = algoliaAppId;
          actualApiKey = algoliaApiKey;
        }

        // 統合検索用の設定（標準インデックスを使用）
        const indexMappings = STANDARD_INDICES;
        
        const multiSearchConfig = {
          applicationId: actualAppId,
          apiKey: actualApiKey,
          writeApiKey: algoliaWriteKey,
          indexMappings: indexMappings
        };
        
        console.log('[Search] Initializing Algolia multi-search service with user API keys...');
        await this.algoliaMCPService.initializeMultiSearch(multiSearchConfig);

        // インデックス自動作成
        console.log('[Search] Ensuring standard indices exist...');
        await this.algoliaMCPService.ensureIndicesExist();

        // カテゴリの推論（Gemini解析結果またはキーワードから）
        let inferredCategories: string[] = [];
        if (imageAnalysis?.category) {
          // Gemini APIがカテゴリを判定している場合
          const category = imageAnalysis.category.toLowerCase();
          if (category in STANDARD_INDICES) {
            inferredCategories.push(category);
          }
        }

        // キーワードからもカテゴリを推論
        const queryLower = searchQuery.toLowerCase();
        if (queryLower.includes('nike') || queryLower.includes('shoe') || queryLower.includes('sneaker') || queryLower.includes('fashion') || queryLower.includes('clothing')) {
          inferredCategories.push('fashion');
        }
        if (queryLower.includes('phone') || queryLower.includes('laptop') || queryLower.includes('tv') || queryLower.includes('electronics') || queryLower.includes('computer')) {
          inferredCategories.push('electronics');
        }
        if (queryLower.includes('book') || queryLower.includes('novel') || queryLower.includes('magazine')) {
          inferredCategories.push('books');
        }
        if (queryLower.includes('furniture') || queryLower.includes('home') || queryLower.includes('kitchen') || queryLower.includes('decor')) {
          inferredCategories.push('home');
        }
        if (queryLower.includes('sport') || queryLower.includes('fitness') || queryLower.includes('gym') || queryLower.includes('exercise')) {
          inferredCategories.push('sports');
        }
        if (queryLower.includes('beauty') || queryLower.includes('cosmetic') || queryLower.includes('makeup') || queryLower.includes('skincare')) {
          inferredCategories.push('beauty');
        }
        if (queryLower.includes('food') || queryLower.includes('snack') || queryLower.includes('drink') || queryLower.includes('grocery')) {
          inferredCategories.push('food');
        }

        console.log('[Search] Inferred categories:', inferredCategories);

        // パーソナライゼーション：カテゴリ別興味度に基づく優先順位付け
        console.log('[Search] Applying personalization to category selection...');
        const categoryInterests = await this.database.getCategoryInterests();
        console.log('[Search] User category interests:', categoryInterests);

        // 興味度に基づいてカテゴリを並び替え
        if (inferredCategories.length > 1 && Object.keys(categoryInterests).length > 0) {
          inferredCategories.sort((a, b) => (categoryInterests[b] || 0) - (categoryInterests[a] || 0));
          console.log('[Search] Reordered categories by interest:', inferredCategories);
        }

        // パーソナライゼーション：過去の検索パターンからクエリ拡張
        const searchPatterns = await this.database.getSearchPatterns(10);
        const relatedPatterns = searchPatterns.filter(pattern => {
          // クエリまたはカテゴリの類似性でフィルタ
          return inferredCategories.includes(pattern.category) || 
                 pattern.keywords.some(keyword => searchQuery.toLowerCase().includes(keyword.toLowerCase()));
        });

        if (relatedPatterns.length > 0) {
          console.log('[Search] Found', relatedPatterns.length, 'related search patterns');
          
          // 最も頻度の高いパターンから追加キーワードを取得
          const additionalKeywords: string[] = [];
          relatedPatterns.slice(0, 2).forEach(pattern => {
            pattern.keywords.forEach(keyword => {
              if (!searchQuery.toLowerCase().includes(keyword.toLowerCase()) && additionalKeywords.length < 3) {
                additionalKeywords.push(keyword);
              }
            });
          });

          if (additionalKeywords.length > 0) {
            const originalQuery = searchQuery;
            searchQuery = searchQuery + ' ' + additionalKeywords.join(' ');
            console.log('[Search] Enhanced query with personalization:', originalQuery, '->', searchQuery);
          }
        }

        // Function to send feedback to renderer
        const sendFeedback = (message: string) => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('search-feedback', message);
          }
          console.log('[Search Feedback]', message);
        };

        // 統合検索の実行 - ブランド検出機能付き
        console.log('[Search] Performing multi-index search with query:', searchQuery);
        
        // Detect brands for initial search optimization
        const commonBrands = [
          'Nike', 'Adidas', 'Apple', 'Samsung', 'Sony', 'Microsoft', 'Dell', 'HP', 
          'Canon', 'Nikon', 'LG', 'Panasonic', 'Toshiba', 'Asus', 'Acer', 'Lenovo',
          'Intel', 'AMD', 'Nvidia', 'Google', 'Amazon', 'Facebook', 'Tesla', 'BMW',
          'Mercedes', 'Audi', 'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Puma', 'Reebok',
          'New Balance', 'Converse', 'Vans', 'Under Armour', 'Jordan', 'Yeezy'
        ];
        
        const detectedBrands = commonBrands.filter(brand => 
          searchQuery.toLowerCase().includes(brand.toLowerCase())
        );
        const isBrandQuery = detectedBrands.length > 0;
        
        console.log('[Search] Brand detection:', { detectedBrands, isBrandQuery });
        
        let products = await this.algoliaMCPService.searchProductsMultiIndex(
          searchQuery,
          inferredCategories.length > 0 ? inferredCategories : undefined, // カテゴリ指定がない場合は全インデックス検索
          {
            hitsPerPage: 20,
            attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'],
            searchType: isBrandQuery ? 'brand' : 'fuzzy' // ブランド検索では厳密マッチング
          }
        );

        console.log('[Search] Algolia search results:', products ? products.length : 0, 'products');
        
        // Special handling for image analysis searches that return 0 results
        if ((!products || products.length === 0) && imageAnalysis && imageAnalysis.searchKeywords.length > 0) {
          console.log('[Search] Image analysis query returned 0 results, implementing progressive simplification...');
          
          const originalKeywords = imageAnalysis.searchKeywords;
          console.log('[Search] Original image keywords:', originalKeywords);
          
          // Strategy: Progressive query simplification
          // 1. Try with just brand + category (if available)
          const brandKeyword = originalKeywords.find(keyword => 
            commonBrands.some(brand => keyword.toLowerCase() === brand.toLowerCase())
          );
          
          if (brandKeyword) {
            // Extract category/type keywords (common product types)
            const typeKeywords = ['shoes', 'sneakers', 'shirt', 'pants', 'jacket', 'bag', 'watch', 'phone', 'laptop', 'headphones'];
            const categoryKeyword = originalKeywords.find(keyword => 
              typeKeywords.some(type => keyword.toLowerCase().includes(type.toLowerCase()))
            );
            
            const simplifiedQuery = categoryKeyword ? `${brandKeyword} ${categoryKeyword}` : brandKeyword;
            console.log('[Search] Trying simplified brand + category query:', simplifiedQuery);
            sendFeedback(`Simplifying search to: "${simplifiedQuery}"...`);
            
            products = await this.algoliaMCPService.searchProductsMultiIndex(
              simplifiedQuery,
              inferredCategories.length > 0 ? inferredCategories : undefined,
              {
                hitsPerPage: 20,
                attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'],
                searchType: 'fuzzy'
              }
            );
            
            console.log('[Search] Simplified brand search results:', products ? products.length : 0, 'products');
          }
          
          // 2. If still no results, try with just the first 2-3 keywords
          if ((!products || products.length === 0) && originalKeywords.length > 3) {
            const reducedQuery = originalKeywords.slice(0, 3).join(' ');
            console.log('[Search] Trying with first 3 keywords:', reducedQuery);
            sendFeedback(`Reducing to key terms: "${reducedQuery}"...`);
            
            products = await this.algoliaMCPService.searchProductsMultiIndex(
              reducedQuery,
              inferredCategories.length > 0 ? inferredCategories : undefined,
              {
                hitsPerPage: 20,
                attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'],
                searchType: 'fuzzy'
              }
            );
            
            console.log('[Search] Reduced keywords search results:', products ? products.length : 0, 'products');
          }
          
          // 3. If still no results, try removing specific model names/numbers
          if ((!products || products.length === 0)) {
            // Remove patterns like "3ST.004" or model numbers
            const withoutModels = originalKeywords.filter(keyword => 
              !keyword.match(/^[A-Z0-9]+\.?[0-9]+$/i) && // Model numbers like "3ST.004"
              !keyword.match(/^[0-9]+$/) // Pure numbers
            );
            
            if (withoutModels.length > 0 && withoutModels.length < originalKeywords.length) {
              const genericQuery = withoutModels.join(' ');
              console.log('[Search] Trying without model numbers:', genericQuery);
              sendFeedback(`Searching without model numbers: "${genericQuery}"...`);
              
              products = await this.algoliaMCPService.searchProductsMultiIndex(
                genericQuery,
                inferredCategories.length > 0 ? inferredCategories : undefined,
                {
                  hitsPerPage: 20,
                  attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'],
                  searchType: 'fuzzy'
                }
              );
              
              console.log('[Search] Generic search results:', products ? products.length : 0, 'products');
            }
          }
        }
        
        // Implement improved multi-stage search strategy if no results found
        if (!products || products.length === 0) {
          console.log('[Search] No products found with original query, attempting multi-stage search...');
          
          // Use the same searchQuery that was already constructed
          const fallbackSearchQuery = imageAnalysis?.searchKeywords.join(' ') || query;
          
          if (isBrandQuery) {
            console.log('[Search] Brand-focused query detected:', detectedBrands);
            sendFeedback(`Searching for ${detectedBrands.join(' ')} products with exact matching...`);
            
            // Strategy 1: Brand exact match search (already tried in initial search, so try with stricter settings)
            products = await this.algoliaMCPService.searchProductsMultiIndex(
              fallbackSearchQuery,
              inferredCategories.length > 0 ? inferredCategories : undefined,
              {
                hitsPerPage: 20,
                attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'],
                searchType: 'exact'
              }
            );
            
            console.log('[Search] Brand exact search results:', products ? products.length : 0, 'products');
            
            // Strategy 2: Try with brand filter if no results
            if ((!products || products.length === 0) && detectedBrands.length > 0) {
              const brandFilters = detectedBrands.map(brand => `brand:"${brand}"`).join(' OR ');
              sendFeedback(`Trying brand filter search: ${detectedBrands.join(' or ')}...`);
              
              products = await this.algoliaMCPService.searchProductsMultiIndex(
                query,
                inferredCategories.length > 0 ? inferredCategories : undefined,
                {
                  hitsPerPage: 20,
                  attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'],
                  filters: brandFilters,
                  searchType: 'exact'
                }
              );
              
              console.log('[Search] Brand filter search results:', products ? products.length : 0, 'products');
            }
          }
          
          // If we have image analysis keywords, try fallback searches
          if (imageAnalysis && imageAnalysis.searchKeywords.length > 0 && (!products || products.length === 0)) {
            const originalKeywords = imageAnalysis.searchKeywords.join(' ');
            sendFeedback(`Trying broader search with "${originalKeywords}"...`);
            
            // Strategy 3: Try with brand names preserved but as boost terms
            const allKeywords = [...imageAnalysis.searchKeywords];
            if (!isBrandQuery || products.length === 0) {
              const preservedBrandQuery = allKeywords.join(' ') + ' ' + query;
              sendFeedback(`Searching with preserved brand terms: "${allKeywords.join(' ')}"...`);
              
              products = await this.algoliaMCPService.searchProductsMultiIndex(
                preservedBrandQuery,
                inferredCategories.length > 0 ? inferredCategories : undefined,
                {
                  hitsPerPage: 20,
                  attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'],
                  searchType: 'fuzzy'
                }
              );
              
              console.log('[Search] Preserved brand search results:', products ? products.length : 0, 'products');
            }
          }
          
          // Strategy 4: Category-only search
          if ((!products || products.length === 0) && imageAnalysis?.category && imageAnalysis.category !== 'general') {
            sendFeedback(`Switching to category search: "${imageAnalysis.category}"...`);
            
            products = await this.algoliaMCPService.searchProductsMultiIndex(
              query, // Use original user query
              [imageAnalysis.category],
              {
                hitsPerPage: 20,
                attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'],
                searchType: 'fuzzy'
              }
            );
            
            console.log('[Search] Category-only search results:', products ? products.length : 0, 'products');
          }
          
          // Strategy 5: Synonym expansion (only for non-brand keywords)
          if ((!products || products.length === 0) && imageAnalysis?.searchKeywords && imageAnalysis.searchKeywords.length > 0) {
            // Filter out brand names for synonym search
            const genericKeywords = imageAnalysis.searchKeywords.filter(keyword => 
              !commonBrands.some(brand => keyword.toLowerCase().includes(brand.toLowerCase()))
            );
            
            if (genericKeywords.length > 0) {
              const synonymMap: Record<string, string[]> = {
                'shoes': ['footwear', 'sneakers', 'boots', 'sandals'],
                'sneakers': ['shoes', 'trainers', 'athletic shoes'],
                'black': ['dark', 'noir'],
                'white': ['light', 'cream', 'ivory'],
                'low': ['short', 'minimal'],
                'high': ['tall', 'elevated'],
                'dunk': ['basketball', 'sport', 'athletic']
              };
              
              const expandedKeywords = [...genericKeywords];
              // Add brand names back if this was a brand query
              if (isBrandQuery) {
                expandedKeywords.push(...detectedBrands);
              }
              
              genericKeywords.forEach(keyword => {
                const synonyms = synonymMap[keyword.toLowerCase()];
                if (synonyms) {
                  expandedKeywords.push(...synonyms.slice(0, 2)); // Add max 2 synonyms per word
                }
              });
              
              const synonymQuery = expandedKeywords.join(' ') + ' ' + query;
              sendFeedback(`Trying with related terms: "${expandedKeywords.slice(0, 5).join(' ')}"...`);
              
              products = await this.algoliaMCPService.searchProductsMultiIndex(
                synonymQuery,
                inferredCategories.length > 0 ? inferredCategories : undefined,
                {
                  hitsPerPage: 20,
                  attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'],
                  searchType: 'fuzzy'
                }
              );
              
              console.log('[Search] Synonym search results:', products ? products.length : 0, 'products');
            }
          }
          
          // Strategy 6: Final fallback - all indices search (last resort)
          if (!products || products.length === 0) {
            sendFeedback(`Searching all categories for "${query}"...`);
            
            products = await this.algoliaMCPService.searchProductsMultiIndex(
              query,
              undefined, // Search all indices
              {
                hitsPerPage: 20,
                attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID'],
                searchType: 'fuzzy'
              }
            );
            
            console.log('[Search] All-categories search results:', products ? products.length : 0, 'products');
          }
          
          if (!products || products.length === 0) {
            if (imageAnalysis) {
              console.log('[Search] No products found after all fallback attempts with image analysis');
              sendFeedback(`Image analysis successful (found: ${imageAnalysis.searchKeywords.join(', ')}), but no matching products in our catalog. The fashion index may need more products.`);
            } else {
              console.log('[Search] No products found after all fallback attempts, returning empty array');
              sendFeedback('Sorry, no products found matching your search.');
            }
            return { 
              products: [], 
              imageAnalysis: imageAnalysis ? {
                keywords: imageAnalysis.searchKeywords,
                category: imageAnalysis.category,
                searchQuery: imageAnalysis.searchKeywords.join(' ')
              } : undefined
            };
          } else {
            sendFeedback(`Found ${products.length} products.`);
          }
        }

        // Debug: Log first product structure
        if (products && products.length > 0) {
          console.log('[Search] First product data structure:', JSON.stringify(products[0], null, 2));
        }

        // Filter out products with broken or invalid image URLs and invalid product URLs
        console.log('[Search] Filtering products with invalid images and URLs...');
        const validProducts = products.filter((product: any) => {
          // Check if image URL is valid
          if (!product.image || 
              product.image === '' || 
              product.image === '#' ||
              product.image.includes('placeholder') ||
              product.image.includes('default') ||
              product.image === 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2UwZTBlMCIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+') {
            return false;
          }
          
          // Check if product URL is valid
          if (!product.url || 
              product.url === '' || 
              product.url === '#' ||
              product.url === 'undefined' ||
              product.url === 'null') {
            return false;
          }
          
          // Check for common invalid URL patterns
          const invalidPatterns = [
            /^https?:\/\/(localhost|127\.0\.0\.1)/,  // localhost URLs
            /\.(tmp|temp)$/i,                        // temporary file extensions
            /\/temp\//i,                             // temp directories
          ];
          
          // Check both image and URL for invalid patterns
          const hasInvalidImage = invalidPatterns.some(pattern => pattern.test(product.image));
          const hasInvalidUrl = invalidPatterns.some(pattern => pattern.test(product.url));
          
          return !hasInvalidImage && !hasInvalidUrl;
        });
        
        console.log(`[Search] Filtered ${products.length - validProducts.length} products with invalid images/URLs, ${validProducts.length} remain`);
        products = validProducts;

        // Apply constraint filtering if we have parsed constraints
        let preFilterCount = products.length;
        let filteringDetails: { priceFiltered?: number; colorFiltered?: number; genderFiltered?: number; filteredOut?: number } = {};
        
        if (searchConstraints && products.length > 0) {
          console.log('[Search] Applying constraint filters...');
          console.log('[Search] Constraints:', JSON.stringify(searchConstraints, null, 2));
          
          const constraintFilteredProducts = products.filter((product: any) => {
            // Price filtering
            if (searchConstraints.priceRange) {
              const price = product.salePrice || product.price;
              const priceMax = searchConstraints.priceRange.max;
              
              if (searchConstraints.priceRange.min !== undefined && price < searchConstraints.priceRange.min) {
                console.log(`[Search] Product ${product.name} filtered out: price $${price} < min $${searchConstraints.priceRange.min}`);
                return false;
              }
              if (priceMax !== undefined && price > priceMax) {
                console.log(`[Search] Product ${product.name} filtered out: price $${price} > max $${priceMax}`);
                return false;
              }
            }

            // Color filtering (check in product name and description)
            if (searchConstraints.colors && searchConstraints.colors.length > 0) {
              const productText = `${product.name} ${product.description || ''}`.toLowerCase();
              const hasMatchingColor = searchConstraints.colors.some(color => 
                productText.includes(color.toLowerCase())
              );
              if (!hasMatchingColor) {
                return false;
              }
            }

            // Gender filtering
            if (searchConstraints.gender) {
              const productText = `${product.name} ${product.description || ''} ${(product.categories || []).join(' ')}`.toLowerCase();
              const genderTerms = {
                men: ["men's", "mens", "men", "male"],
                women: ["women's", "womens", "women", "female", "ladies"],
                unisex: ["unisex", "unisex"]
              };
              const hasGenderMatch = genderTerms[searchConstraints.gender].some(term => 
                productText.includes(term)
              );
              if (!hasGenderMatch) {
                return false;
              }
            }

            // Style filtering
            if (searchConstraints.styles && searchConstraints.styles.length > 0) {
              const productText = `${product.name} ${product.description || ''}`.toLowerCase();
              const hasMatchingStyle = searchConstraints.styles.some(style => 
                productText.includes(style.toLowerCase())
              );
              // Styles are more flexible, so only filter if no match and it's a specific style
              if (!hasMatchingStyle && !searchConstraints.styles.includes('similar style')) {
                return false;
              }
            }

            return true;
          });

          console.log(`[Search] Constraint filtering: ${products.length} -> ${constraintFilteredProducts.length} products`);
          if (searchConstraints.priceRange) {
            console.log(`[Search] Price range applied: $${searchConstraints.priceRange.min || 0} - $${searchConstraints.priceRange.max || '∞'}`);
            console.log(`[Search] Filtered out ${products.length - constraintFilteredProducts.length} products due to price constraints`);
          }
          
          // Store the pre-filter count for reporting
          const postFilterCount = constraintFilteredProducts.length;
          filteringDetails.filteredOut = preFilterCount - postFilterCount;
          
          // Log some sample products that passed the filter
          if (constraintFilteredProducts.length > 0) {
            console.log('[Search] Sample products that passed filters:');
            constraintFilteredProducts.slice(0, 3).forEach((p: any) => {
              console.log(`  - ${p.name}: $${p.salePrice || p.price}`);
            });
          }
          
          products = constraintFilteredProducts;
        }

        // Apply personalization scoring if we have ML data
        console.log('[Search] Checking user profile for personalization...');
        const userProfile = await this.personalization.getUserProfile();
        console.log('[Search] User profile confidence level:', userProfile.confidenceLevel);
        console.log('[Search] User profile category scores:', JSON.stringify(userProfile.categoryScores));
        console.log('[Search] User profile price preference:', JSON.stringify(userProfile.pricePreference));
        
        if (userProfile.confidenceLevel > 0.1) {
          console.log('[Search] Applying personalization scoring...');
          // Score each product based on user preferences
          const scoredProducts = await Promise.all(
            products.map(async (product: any) => ({
              ...product,
              personalizedScore: await this.personalization.calculateProductScore(product, userProfile)
            }))
          );

          // Sort by personalized score
          products = scoredProducts.sort((a, b) => b.personalizedScore - a.personalizedScore);
          console.log('[Search] Applied personalization scoring to', products.length, 'products');
        
        // Log top 5 products after scoring
        console.log('[Search] Top 5 products after ML scoring:');
        products.slice(0, 5).forEach((p, i) => {
          console.log(`  ${i+1}. ${p.name} - Score: ${(p as any).personalizedScore?.toFixed(3) || 'N/A'}, Price: $${p.price}`);
        });
        } else {
          console.log('[Search] Skipping personalization (insufficient confidence)');
        }

        // Note: Discovery Mode is now applied after creating the search result

        // Track search interaction for ML learning
        if (imageAnalysis) {
          console.log('[Search] Tracking search interaction for ML learning...');
          await this.personalization.trackUserInteraction({
            eventType: 'search',
            productId: products[0]?.id || 'unknown',
            timestamp: Date.now(),
            context: {
              searchQuery: query,
              imageFeatures: imageAnalysis
            },
            weight: 0.2,
            source: 'standalone-app'
          });
        }

        // 検索ログの記録（ML学習とパーソナライゼーション用）
        const responseTime = Date.now() - searchStartTime;
        console.log('[Search] Recording search log for ML learning...');
        
        try {
          await this.database.logSearch({
            searchQuery: query,
            inferredCategories: inferredCategories,
            searchResultsCount: products.length,
            responseTimeMs: responseTime,
            geminiKeywords: imageAnalysis?.searchKeywords,
            geminiCategory: imageAnalysis?.category,
            imageProvided: !!imageData
          });
        } catch (logError) {
          console.warn('[Search] Failed to log search, continuing:', logError);
        }

        // Create search session metadata
        const searchSession: SearchSession = {
          sessionId: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          searchQuery: query,
          searchType: imageData ? (imageAnalysis ? 'mixed' : 'image') : 'text',
          timestamp: new Date(),
          imageAnalysisKeywords: imageAnalysis?.searchKeywords,
          resultCount: products.length
        };

        // Attach search session metadata to all products
        const productsWithSession = products.map((product: any) => ({
          ...product,
          searchSession
        }));

        // Create initial search result
        let searchResult: IPCSearchResult = {
          products: productsWithSession,
          totalResultsBeforeFilter: preFilterCount,
          totalResultsAfterFilter: productsWithSession.length,
          imageAnalysis: imageAnalysis ? {
            keywords: imageAnalysis.searchKeywords,
            category: imageAnalysis.category,
            searchQuery: imageAnalysis.searchKeywords.join(' ')
          } : undefined,
          constraints: searchConstraints ? {
            priceRange: searchConstraints.priceRange,
            colors: searchConstraints.colors,
            styles: searchConstraints.styles,
            gender: searchConstraints.gender,
            applied: true
          } : undefined,
          filteringDetails: filteringDetails
        };

        console.log('[Search] Initial result:', productsWithSession.length, 'products');
        
        // Apply Discovery Mode if enabled
        if (discoveryPercentage && discoveryPercentage > 0 && productsWithSession.length > 0) {
          console.log(`[Search] Applying Discovery Mode with ${discoveryPercentage}% discovery products`);
          const productsAfterDiscovery = await this.applyDiscoveryMode(
            productsWithSession, 
            searchQuery, 
            inferredCategories, 
            discoveryPercentage
          );
          console.log(`[Search] After Discovery Mode: ${productsAfterDiscovery.length} total products`);
          
          // Update search result with Discovery products
          searchResult.products = productsAfterDiscovery;
          searchResult.totalResultsAfterFilter = productsAfterDiscovery.length;
        }
        
        // Cache the final search result (including Discovery products) for follow-up queries
        const cacheKey = `search_${Date.now()}`;
        this.searchResultCache.set(cacheKey, {
          timestamp: Date.now(),
          result: searchResult,
          originalQuery: query,
          imageAnalysis: imageAnalysis || undefined
        });
        console.log('[Search] Cached search result with key:', cacheKey, 'with', searchResult.products.length, 'products');
        
        return searchResult;

      } catch (error) {
        console.error('[Search] Product search error:', error);
        console.error('[Search] Error details:', {
          message: (error as Error).message,
          stack: (error as Error).stack,
          name: (error as Error).name
        });
        return { products: [], imageAnalysis: undefined };
      }
    })

    // Save product to database
    ipcMain.handle('save-product', async (event, product) => {
      try {
        const result = await this.database.saveProduct(product)
        
        // MLトラッキングを追加
        if (result.lastInsertRowid) {
          await this.personalization.trackUserInteraction({
            eventType: 'save',
            productId: product.id,
            timestamp: Date.now(),
            context: { 
              category: product.category || product.categories?.[0],
              price: product.price 
            },
            weight: 1.0,
            source: 'standalone-app'
          })
          console.log(`[ML] Tracked save event for product: ${product.name} (ID: ${product.id})`);
        }
        
        return { success: true, id: result.lastInsertRowid }
      } catch (error) {
        console.error('Save product error:', error)
        const errorMessage = (error as Error).message
        // Provide user-friendly error messages
        if (errorMessage.includes('Product already saved')) {
          return { success: false, error: 'This product is already in your database' }
        }
        return { success: false, error: errorMessage }
      }
    })

    // Get products from database
    ipcMain.handle('get-products', async () => {
      try {
        return await this.database.getProducts()
      } catch (error) {
        console.error('Get products error:', error)
        return []
      }
    })

    // Remove product from database
    ipcMain.handle('remove-product', async (event, productId: string) => {
      try {
        await this.database.removeProduct(productId)
        return { success: true }
      } catch (error) {
        console.error('Remove product error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Get chat history
    ipcMain.handle('get-chat-history', async () => {
      try {
        return await this.database.getChatHistory()
      } catch (error) {
        console.error('Get chat history error:', error)
        return []
      }
    })

    // Save chat session
    ipcMain.handle('save-chat', async (event, sessionData, message) => {
      try {
        const result = await this.database.saveChat(sessionData, message)
        return { success: true, sessionId: result.sessionId }
      } catch (error) {
        console.error('Save chat error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Discovery settings
    ipcMain.handle('save-discovery-setting', async (event, percentage: 0 | 5 | 10) => {
      try {
        await this.database.saveDiscoverySetting(percentage)
        return { success: true }
      } catch (error) {
        console.error('Save discovery setting error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('get-discovery-setting', async () => {
      try {
        return await this.database.getDiscoverySetting()
      } catch (error) {
        console.error('Get discovery setting error:', error)
        return 0
      }
    })

    // Open external URL in default browser
    ipcMain.handle('open-external', async (event, url: string) => {
      try {
        await shell.openExternal(url)
        return { success: true }
      } catch (error) {
        console.error('Open external error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Update product
    ipcMain.handle('update-product', async (event, productId: string, updates: { customName?: string; tags?: string }) => {
      try {
        await this.database.updateProduct(productId, updates)
        return { success: true }
      } catch (error) {
        console.error('Update product error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Get app version
    ipcMain.handle('get-app-version', async () => {
      return app.getVersion()
    })

    // Get database path
    ipcMain.handle('get-database-path', async () => {
      try {
        const path = join(app.getPath('userData'), 'shopping-data.db')
        return { success: true, path }
      } catch (error) {
        console.error('Get database path error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Change database path
    ipcMain.handle('change-database-path', async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          title: 'Select New Database Location',
          properties: ['openDirectory'],
          buttonLabel: 'Select Folder'
        })

        if (result.canceled || !result.filePaths[0]) {
          return { success: false, message: 'No directory selected' }
        }

        const currentDbPath = join(app.getPath('userData'), 'shopping-data.db')
        const newDbPath = join(result.filePaths[0], 'shopping-data.db')

        // Check if source database exists
        if (!existsSync(currentDbPath)) {
          return { success: false, message: 'Current database not found' }
        }

        // Copy database to new location
        try {
          copyFileSync(currentDbPath, newDbPath)
          
          // Reinitialize database service with new path
          // Note: This would require modifying DatabaseService to accept custom path
          // For now, we'll just copy and inform user to restart
          
          return { 
            success: true, 
            newPath: newDbPath,
            message: 'Database copied successfully. Please restart the application to use the new database location.'
          }
        } catch (copyError) {
          console.error('Database copy error:', copyError)
          return { success: false, message: `Failed to copy database: ${(copyError as Error).message}` }
        }
      } catch (error) {
        console.error('Change database path error:', error)
        return { success: false, message: (error as Error).message }
      }
    })

    // Reset database (clear all data)
    ipcMain.handle('reset-database', async () => {
      try {
        this.database.resetDatabase()
        return { success: true, message: 'Database reset successfully' }
      } catch (error) {
        console.error('Reset database error:', error)
        return { success: false, message: (error as Error).message }
      }
    })

    // Reset ML training data only
    ipcMain.handle('reset-ml-data', async () => {
      try {
        this.database.resetMLData()
        return { success: true, message: 'ML training data cleared successfully' }
      } catch (error) {
        console.error('Reset ML data error:', error)
        return { success: false, message: (error as Error).message }
      }
    })

    // Get API keys (returns masked keys for security)
    ipcMain.handle('get-api-keys', async () => {
      try {
        const keys = await this.database.getAPIKeys()
        
        // Return masked keys for display
        const maskedKeys: Record<string, string> = {}
        keys.forEach(key => {
          // Show only first 4 and last 4 characters
          const value = key.encrypted_key
          if (value.length > 8) {
            maskedKeys[key.provider] = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
          } else {
            maskedKeys[key.provider] = '****'
          }
        })
        
        return { success: true, keys: maskedKeys }
      } catch (error) {
        console.error('Get API keys error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Save API keys (Gemini and Algolia)
    ipcMain.handle('save-api-keys', async (event, apiKeys: Record<string, string>) => {
      try {
        console.log('[Main] Saving API keys:', Object.keys(apiKeys));
        let savedKeys = [];
        let hasAllAlgoliaKeys = false;
        
        // Save Gemini API key
        if (apiKeys.gemini && apiKeys.gemini.trim()) {
          console.log('[Main] Saving Gemini API key...');
          await this.database.saveAPIKey('gemini', apiKeys.gemini)
          console.log('[Main] Gemini API key saved successfully');
          savedKeys.push('Gemini');
        }
        
        // Save Algolia Application ID
        if (apiKeys.algoliaAppId && apiKeys.algoliaAppId.trim()) {
          console.log('[Main] Saving Algolia Application ID...');
          await this.database.saveAPIKey('algoliaAppId', apiKeys.algoliaAppId)
          console.log('[Main] Algolia Application ID saved successfully');
          savedKeys.push('Algolia App ID');
        }
        
        // Save Algolia Search API Key
        if (apiKeys.algoliaSearchKey && apiKeys.algoliaSearchKey.trim()) {
          console.log('[Main] Saving Algolia Search API Key...');
          await this.database.saveAPIKey('algoliaSearchKey', apiKeys.algoliaSearchKey)
          console.log('[Main] Algolia Search API Key saved successfully');
          savedKeys.push('Algolia Search Key');
        }
        
        // Save Algolia Write API Key
        if (apiKeys.algoliaWriteKey && apiKeys.algoliaWriteKey.trim()) {
          console.log('[Main] Saving Algolia Write API Key...');
          await this.database.saveAPIKey('algoliaWriteKey', apiKeys.algoliaWriteKey)
          console.log('[Main] Algolia Write API Key saved successfully');
          savedKeys.push('Algolia Write Key');
        }
        
        if (savedKeys.length === 0) {
          console.log('[Main] No API keys provided or all keys are empty');
          return { success: false, error: 'No valid API keys provided' }
        }
        
        // Check if all Algolia keys are now present
        const allKeys = await this.database.getAPIKeys();
        const keyMap = new Map(allKeys.map(k => [k.provider, k.encrypted_key]));
        
        hasAllAlgoliaKeys = 
          keyMap.has('algoliaAppId') && 
          keyMap.has('algoliaSearchKey') && 
          keyMap.has('algoliaWriteKey');
        
        const message = `API keys saved successfully: ${savedKeys.join(', ')}`;
        console.log('[Main]', message);
        
        // If all Algolia keys are present, trigger automatic data upload
        if (hasAllAlgoliaKeys) {
          console.log('[Main] All Algolia keys detected, initiating automatic data upload...');
          
          // Send notification to renderer that upload is starting
          if (this.mainWindow) {
            this.mainWindow.webContents.send('algolia-upload-status', {
              status: 'starting',
              message: 'Starting Algolia data upload...'
            });
          }
          
          // Trigger data upload in background
          this.initializeAlgoliaAndUploadData()
            .then(() => {
              console.log('[Main] Automatic data upload completed successfully');
              if (this.mainWindow) {
                this.mainWindow.webContents.send('algolia-upload-status', {
                  status: 'completed',
                  message: 'Algolia data upload completed successfully!'
                });
              }
            })
            .catch((error) => {
              console.error('[Main] Automatic data upload failed:', error);
              if (this.mainWindow) {
                this.mainWindow.webContents.send('algolia-upload-status', {
                  status: 'error',
                  message: `Data upload failed: ${error.message}`
                });
              }
            });
        }
        
        return { success: true, message }
      } catch (error) {
        console.error('[Main] Save API keys error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Cleanup duplicate API keys
    ipcMain.handle('cleanup-api-keys', async (event, provider?: string) => {
      try {
        console.log('[Main] Starting API key cleanup for provider:', provider || 'all');
        await this.database.cleanupDuplicateAPIKeys(provider);
        return { success: true, message: 'API key cleanup completed successfully' }
      } catch (error) {
        console.error('[Main] Cleanup API keys error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Delete a specific API key
    ipcMain.handle('delete-api-key', async (event, provider: string) => {
      try {
        console.log('[Main] Deleting API key for provider:', provider);
        const success = await this.database.deleteAPIKey(provider);
        return { 
          success, 
          message: success ? `API key for ${provider} deleted successfully` : `No API key found for ${provider}` 
        };
      } catch (error) {
        console.error('[Main] Delete API key error:', error);
        return { success: false, error: (error as Error).message };
      }
    })

    // Delete all API keys
    ipcMain.handle('delete-all-api-keys', async () => {
      try {
        console.log('[Main] Deleting all API keys');
        const success = await this.database.deleteAllAPIKeys();
        return { 
          success, 
          message: success ? 'All API keys deleted successfully' : 'No API keys found to delete' 
        };
      } catch (error) {
        console.error('[Main] Delete all API keys error:', error);
        return { success: false, error: (error as Error).message };
      }
    })

    // View tracking removed for MVP - only track clicks and saves

    // Track product click interaction
    ipcMain.handle('track-product-click', async (event, productId: string, url: string) => {
      try {
        console.log(`[ML] Track product click: productId=${productId}, url=${url}`);
        await this.personalization.trackUserInteraction({
          eventType: 'click',
          productId,
          timestamp: Date.now(),
          context: { url },
          weight: 0.5,
          source: 'standalone-app'
        })
        console.log(`[ML] Product click tracked successfully`);
        return { success: true }
      } catch (error) {
        console.error('Track product click error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Enhanced save-product handler with ML tracking
    ipcMain.handle('save-product-with-tracking', async (event, product: any) => {
      try {
        console.log(`[ML] Save product with tracking: ${product.name} (ID: ${product.id})`);
        // Save the product
        const saveResult = await this.database.saveProduct(product)
        
        if (saveResult.lastInsertRowid) {
          // Track the save interaction
          console.log(`[DEBUG] Tracking save event for ML learning...`);
          await this.personalization.trackUserInteraction({
            eventType: 'save',
            productId: product.id,
            timestamp: Date.now(),
            context: { 
              category: product.category || product.categories?.[0],
              price: product.price 
            },
            weight: 1.0,
            source: 'standalone-app'
          })
          console.log(`[DEBUG] ML save event tracked successfully`);
        }
        
        return saveResult
      } catch (error) {
        console.error('Save product with tracking error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Track product removal
    ipcMain.handle('track-product-remove', async (event, productId: string) => {
      try {
        await this.personalization.trackUserInteraction({
          eventType: 'remove',
          productId,
          timestamp: Date.now(),
          context: {},
          weight: -0.8,
          source: 'standalone-app'
        })
        return { success: true }
      } catch (error) {
        console.error('Track product remove error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Get personalization profile for MCP
    ipcMain.handle('get-personalization-profile', async (event) => {
      try {
        const profile = await this.personalization.exportForClaudeDesktop()
        return { success: true, profile }
      } catch (error) {
        console.error('Get personalization profile error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // ログ関連のIPCハンドラー
    ipcMain.handle('get-log-file-path', async () => {
      try {
        return { success: true, path: this.logger.getLogFilePath() }
      } catch (error) {
        console.error('Get log file path error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Log management handlers
    ipcMain.handle('clear-logs', async () => {
      try {
        this.logger.clearLogs()
        return { success: true, message: 'Logs cleared successfully' }
      } catch (error) {
        console.error('Clear logs error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('get-logs', async () => {
      try {
        const fs = require('fs')
        const logContent = fs.readFileSync(this.logger.getLogFilePath(), 'utf8')
        return { success: true, logs: logContent }
      } catch (error) {
        console.error('Get logs error:', error)
        return { success: false, error: (error as Error).message, logs: '' }
      }
    })
    
    // Open log folder in file explorer
    ipcMain.handle('open-log-folder', async () => {
      try {
        const path = require('path')
        const logFilePath = this.logger.getLogFilePath()
        const logFolder = path.dirname(logFilePath)
        await shell.openPath(logFolder)
        return { success: true, message: 'Log folder opened' }
      } catch (error) {
        console.error('Open log folder error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 一時的なデバッグ用: APIキーの詳細情報を取得
    ipcMain.handle('debug-api-keys', async () => {
      try {
        console.log('[Debug] Starting detailed API key analysis...');
        const stmt = this.database.database.prepare(`
          SELECT id, provider, encrypted_key, created_at FROM api_configs ORDER BY created_at ASC
        `);
        const allKeys = stmt.all();
        
        console.log('[Debug] Total API key entries found:', allKeys.length);
        
        const debugInfo = allKeys.map((key: any, index: number) => ({
          index: index + 1,
          id: key.id,
          provider: key.provider,
          keyLength: key.encrypted_key ? key.encrypted_key.length : 0,
          keyPreview: key.encrypted_key ? `${key.encrypted_key.substring(0, 8)}...${key.encrypted_key.substring(key.encrypted_key.length - 4)}` : 'NULL',
          fullKey: key.encrypted_key, // 一時的にフルキーも含める
          createdAt: key.created_at
        }));
        
        debugInfo.forEach(info => {
          console.log(`[Debug] Entry ${info.index}: Provider=${info.provider}, Length=${info.keyLength}, Preview=${info.keyPreview}, Created=${info.createdAt}`);
        });
        
        return { success: true, debugInfo };
      } catch (error) {
        console.error('[Debug] Debug API keys error:', error);
        return { success: false, error: (error as Error).message };
      }
    })

    // Sample data loader handler - COMMENTED OUT FOR PRODUCTION
    /*
    ipcMain.handle('load-sample-data', async () => {
      try {
        console.log('[Main] Loading sample data into Algolia indices...');
        const { OptimizedDataLoader } = require('./optimized-data-loader');
        
        // Get Algolia API keys
        const allKeys = await this.database.getAPIKeys();
        const algoliaKeys = allKeys.filter(k => k.provider === 'algolia');
        
        if (algoliaKeys.length < 2) {
          return { success: false, error: 'Please configure Algolia API keys first' };
        }
        
        // Get decrypted keys
        const config: any = {};
        for (const encKey of algoliaKeys) {
          const decrypted = encKey.encrypted_key; // Keys are stored in plain text for Algolia
          if (decrypted.includes('applicationId')) {
            config.applicationId = decrypted.split(':')[1];
          } else if (decrypted.includes('writeApiKey')) {
            config.writeApiKey = decrypted;
          }
        }
        
        // Get from settings properly
        const stmt = this.database.database.prepare(`
          SELECT service, key, value FROM api_configs WHERE service = 'algolia'
        `);
        const algoliaSettings = stmt.all() as Array<{ service: string; key: string; value: string }>;
        
        algoliaSettings.forEach(setting => {
          if (setting.key === 'applicationId') config.applicationId = setting.value;
          if (setting.key === 'writeApiKey') config.writeApiKey = setting.value;
        });
        
        if (!config.applicationId || !config.writeApiKey) {
          return { success: false, error: 'Missing Algolia API configuration' };
        }
        
        const loader = new OptimizedDataLoader(config.applicationId, config.writeApiKey);
        await loader.loadOptimizedData();
        
        return { success: true, message: 'Optimized product data loaded successfully' };
      } catch (error: any) {
        console.error('[Main] Failed to load sample data:', error);
        return { success: false, error: error?.message || 'Failed to load sample data' };
      }
    });
    */

    // PRODUCTION: Developer tools disabled - uncomment for debugging
    /*
    // 破損したAPIキーを完全削除
    ipcMain.handle('delete-corrupted-api-keys', async () => {
      try {
        console.log('[Main] Starting deletion of corrupted API keys...');
        
        // Geminiキーで長さが35文字未満、またはAIzaSyで始まらないものを削除
        const deleteStmt = this.database.database.prepare(`
          DELETE FROM api_configs 
          WHERE provider = 'gemini' 
          AND (
            LENGTH(encrypted_key) < 35 
            OR encrypted_key NOT LIKE 'AIzaSy%'
          )
        `);
        
        const result = deleteStmt.run();
        console.log('[Main] Deleted corrupted entries:', result.changes);
        
        return { 
          success: true, 
          message: `Deleted ${result.changes} corrupted API key entries`,
          deletedCount: result.changes 
        };
      } catch (error) {
        console.error('[Main] Delete corrupted API keys error:', error);
        return { success: false, error: (error as Error).message };
      }
    })
    */
  }

  // Initialize Algolia and upload data when API keys are configured
  private async initializeAlgoliaAndUploadData(): Promise<void> {
    try {
      console.log('[Main] Starting Algolia initialization and data upload...');
      
      // Get API keys from database
      const allKeys = await this.database.getAPIKeys();
      const keyMap = new Map(allKeys.map(k => [k.provider, k.encrypted_key]));
      
      const algoliaAppId = keyMap.get('algoliaAppId');
      const algoliaApiKey = keyMap.get('algoliaSearchKey');
      const algoliaWriteKey = keyMap.get('algoliaWriteKey');
      
      if (!algoliaAppId || !algoliaApiKey || !algoliaWriteKey) {
        throw new Error('Missing required Algolia API keys');
      }
      
      console.log('[Main] All Algolia keys found, initializing MCP service...');
      
      // Initialize the MCP service with multi-search config
      const multiSearchInitialized = await this.algoliaMCPService.initializeMultiSearch({
        applicationId: algoliaAppId,
        apiKey: algoliaApiKey,
        writeApiKey: algoliaWriteKey,
        indexMappings: {
          fashion: 'fashion',
          electronics: 'electronics',
          products: 'products',
          beauty: 'beauty',
          sports: 'sports',
          books: 'books',
          home: 'home',
          food: 'food'
        }
      });
      
      if (!multiSearchInitialized) {
        throw new Error('Failed to initialize Algolia MCP service');
      }
      
      console.log('[Main] MCP service initialized, checking indices...');
      
      // Ensure indices exist and load data if needed
      await this.algoliaMCPService.ensureIndicesExist();
      
      console.log('[Main] Algolia initialization and data upload completed successfully');
    } catch (error) {
      console.error('[Main] Failed to initialize Algolia and upload data:', error);
      throw error;
    }
  }

  // Discovery Mode implementation
  private async applyDiscoveryMode(
    originalProducts: any[],
    searchQuery: string,
    inferredCategories: string[],
    discoveryPercentage: number
  ): Promise<any[]> {
    const totalCount = originalProducts.length;
    const discoveryCount = Math.ceil(totalCount * (discoveryPercentage / 100));
    const regularCount = totalCount - discoveryCount;
    
    console.log(`[Discovery] Total: ${totalCount}, Regular: ${regularCount}, Discovery: ${discoveryCount}`);
    
    // Keep the top-scored regular products
    const regularProducts = originalProducts.slice(0, regularCount);
    
    // Get discovery products
    const discoveryProducts = await this.getDiscoveryProducts(
      searchQuery,
      inferredCategories,
      discoveryCount,
      originalProducts
    );
    
    // Mark discovery products
    const markedDiscoveryProducts = discoveryProducts.map(product => ({
      ...product,
      isDiscovery: true,
      discoveryReason: this.determineDiscoveryReason(product, originalProducts)
    }));
    
    console.log(`[Discovery] Found ${markedDiscoveryProducts.length} discovery products`);
    
    // Interleave products
    return this.interleaveProducts(regularProducts, markedDiscoveryProducts);
  }

  private async getDiscoveryProducts(
    originalQuery: string,
    categories: string[],
    count: number,
    excludeProducts: any[]
  ): Promise<any[]> {
    // Extract meaningful keywords from the query
    const stopWords = ['the', 'and', 'for', 'with', 'can', 'you', 'find', 'one', 'under', 'over', 'like', 'similar', 'style'];
    const queryWords = originalQuery.toLowerCase().split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // Try to extract brand from the query or existing products
    const brandFromQuery = queryWords.find(word => 
      ['nike', 'adidas', 'apple', 'samsung', 'sony', 'hp', 'dell', 'canon', 'puma', 'reebok'].includes(word)
    );
    
    // Extract brands from exclude products
    const existingBrands = excludeProducts
      .map(p => {
        // Try to extract brand from product name
        const nameParts = p.name?.toLowerCase().split(' ') || [];
        return nameParts.find((part: string) => 
          ['nike', 'adidas', 'apple', 'samsung', 'sony', 'hp', 'dell', 'canon', 'puma', 'reebok'].includes(part)
        );
      })
      .filter(Boolean);
    
    // Create a more generic query for discovery
    const productType = queryWords.find(word => 
      ['shoes', 'shoe', 'sneakers', 'boots', 'shirt', 'pants', 'jacket', 'coat', 'dress', 'watch', 'phone', 'laptop', 'camera', 'headphones', 'bag', 'accessories'].includes(word)
    ) || 'product';
    
    // Product type mappings for same-category discovery
    const productTypeAlternatives: Record<string, string[]> = {
      // Fashion category
      'shoes': ['shirt', 'pants', 'jacket', 'hoodie', 'shorts', 'accessories'],
      'shoe': ['shirt', 'pants', 'jacket', 'hoodie', 'shorts', 'accessories'],
      'sneakers': ['t-shirt', 'joggers', 'sweatshirt', 'cap', 'socks'],
      'boots': ['jeans', 'leather jacket', 'belt', 'scarf'],
      'shirt': ['pants', 'shoes', 'jacket', 'tie', 'belt'],
      'pants': ['shirt', 'shoes', 'belt', 'jacket', 'sweater'],
      'jacket': ['shirt', 'pants', 'shoes', 'scarf', 'gloves'],
      'dress': ['heels', 'purse', 'jewelry', 'cardigan', 'scarf'],
      // Electronics category
      'phone': ['case', 'headphones', 'charger', 'watch', 'speaker'],
      'laptop': ['bag', 'mouse', 'keyboard', 'monitor', 'stand'],
      'camera': ['lens', 'tripod', 'bag', 'memory card', 'flash'],
      'headphones': ['phone', 'speaker', 'cable', 'case', 'amplifier'],
      // Sports category
      'running': ['shorts', 'shirt', 'water bottle', 'armband', 'socks'],
      'gym': ['gloves', 'towel', 'shaker', 'mat', 'bag']
    };
    
    console.log(`[Discovery] Original query: "${originalQuery}"`);
    console.log(`[Discovery] Extracted: brand="${brandFromQuery}", type="${productType}", categories=${JSON.stringify(categories)}`);
    
    const discoveryStrategies = [
      // Strategy 1: Same category, different product type (PRIORITY)
      async () => {
        const alternatives = productTypeAlternatives[productType];
        if (alternatives && alternatives.length > 0 && categories.length > 0) {
          // Pick a random alternative product type
          const alternativeType = alternatives[Math.floor(Math.random() * alternatives.length)];
          
          // Build query with brand (if exists) + alternative product type
          let discoveryQuery = alternativeType;
          if (brandFromQuery) {
            discoveryQuery = `${brandFromQuery} ${alternativeType}`;
          } else if (existingBrands.length > 0) {
            // Use a brand from existing products
            const randomBrand = existingBrands[Math.floor(Math.random() * existingBrands.length)];
            discoveryQuery = `${randomBrand} ${alternativeType}`;
          }
          
          console.log(`[Discovery] Strategy 1: Same category "${categories[0]}", different type: "${discoveryQuery}"`);
          try {
            const results = await this.algoliaMCPService.searchProductsMultiIndex(
              discoveryQuery,
              categories, // Use same categories
              { hitsPerPage: count * 10 } // Get more results to ensure variety
            );
            console.log(`[Discovery] Strategy 1 returned ${results?.length || 0} products`);
            return results || [];
          } catch (error) {
            console.error('[Discovery] Strategy 1 error:', error);
            return [];
          }
        }
        return [];
      },
      
      // Strategy 2: Different category
      async () => {
        const otherCategories = ['electronics', 'fashion', 'home', 'sports', 'beauty', 'books']
          .filter(cat => !categories.includes(cat));
        if (otherCategories.length > 0) {
          const randomCategory = otherCategories[Math.floor(Math.random() * otherCategories.length)];
          console.log(`[Discovery] Strategy 2: Searching in different category: ${randomCategory}`);
          try {
            const results = await this.algoliaMCPService.searchProductsMultiIndex(
              productType,
              [randomCategory],
              { hitsPerPage: count * 5 } // Increase results to have better selection
            );
            console.log(`[Discovery] Strategy 2 returned ${results?.length || 0} products`);
            return results || [];
          } catch (error) {
            console.error('[Discovery] Strategy 1 error:', error);
            return [];
          }
        }
        return [];
      },
      
      // Strategy 3: Different price range
      async () => {
        const avgPrice = excludeProducts.length > 0 
          ? excludeProducts.reduce((sum, p) => sum + (p.price || 0), 0) / excludeProducts.length
          : 100;
        const priceFilter = avgPrice > 100 ? 'price < 50' : 'price > 200';
        console.log(`[Discovery] Strategy 3: Searching "${productType}" with price filter: ${priceFilter}`);
        try {
          const results = await this.algoliaMCPService.searchProductsMultiIndex(
            productType,
            categories.length > 0 ? categories : ['fashion', 'electronics'],
            { hitsPerPage: count * 5, filters: priceFilter }
          );
          console.log(`[Discovery] Strategy 3 returned ${results?.length || 0} products`);
          return results || [];
        } catch (error) {
          console.error('[Discovery] Strategy 2 error:', error);
          return [];
        }
      },
      
      // Strategy 4: Different brand in same category
      async () => {
        // Select a brand different from the ones in query/products
        const allBrands = ['Nike', 'Adidas', 'Puma', 'Reebok', 'Under Armour', 'New Balance', 
                          'Apple', 'Samsung', 'Sony', 'LG', 'Microsoft', 'Google'];
        const availableBrands = allBrands.filter(b => 
          b.toLowerCase() !== brandFromQuery && 
          !existingBrands.includes(b.toLowerCase())
        );
        
        if (availableBrands.length > 0) {
          const randomBrand = availableBrands[Math.floor(Math.random() * availableBrands.length)];
          console.log(`[Discovery] Strategy 4: Searching for different brand: ${randomBrand}`);
          try {
            const results = await this.algoliaMCPService.searchProductsMultiIndex(
              randomBrand,
              categories.length > 0 ? categories : ['fashion', 'electronics'],
              { hitsPerPage: count * 5 }
            );
            console.log(`[Discovery] Strategy 4 returned ${results?.length || 0} products`);
            return results || [];
          } catch (error) {
            console.error('[Discovery] Strategy 3 error:', error);
            return [];
          }
        }
        return [];
      },
      
      // Strategy 5: Trending or popular items
      async () => {
        console.log(`[Discovery] Strategy 5: Searching for trending items`);
        try {
          const trendingQueries = ['bestseller', 'trending', 'popular', 'new arrival'];
          const randomTrending = trendingQueries[Math.floor(Math.random() * trendingQueries.length)];
          const results = await this.algoliaMCPService.searchProductsMultiIndex(
            randomTrending,
            undefined, // Search across all categories
            { hitsPerPage: count * 5 }
          );
          console.log(`[Discovery] Strategy 5 returned ${results?.length || 0} products`);
          return results || [];
        } catch (error) {
          console.error('[Discovery] Strategy 4 error:', error);
          return [];
        }
      }
    ];
    
    // Try strategies in priority order until we get enough products
    // Strategy 1 (same category, different type) has highest priority
    let discoveryResults: any[] = [];
    
    for (const strategy of discoveryStrategies) {
      try {
        const results = await strategy();
        if (results && results.length > 0) {
          discoveryResults = results;
          break;
        }
      } catch (error) {
        console.warn('[Discovery] Strategy failed:', error);
      }
    }
    
    // Filter out duplicates and invalid products
    console.log(`[Discovery] Filtering ${discoveryResults.length} discovery results...`);
    
    const uniqueProducts = discoveryResults.filter((dp, index) => {
      // Debug log first few products
      if (index < 3) {
        console.log(`[Discovery] Product ${index}:`, {
          name: dp.name,
          price: dp.price,
          image: dp.image?.substring(0, 50) + '...',
          objectID: dp.objectID,
          id: dp.id
        });
      }
      
      // Check if product already exists in original results
      // For Discovery products, we only check objectID to allow similar products
      const isDuplicate = excludeProducts.some(ep => {
        // Only check objectID for exact duplicates
        if (ep.objectID && dp.objectID && ep.objectID === dp.objectID) {
          return true;
        }
        // For products without objectID, check if the name is exactly the same
        if (!ep.objectID || !dp.objectID) {
          return ep.name === dp.name;
        }
        return false;
      });
      
      if (isDuplicate) {
        console.log(`[Discovery] Duplicate found: ${dp.name} (objectID: ${dp.objectID})`);
        return false;
      }
      
      // Very lenient validation - just need basic fields
      const hasName = dp.name && typeof dp.name === 'string' && dp.name.trim() !== '';
      const hasPrice = typeof dp.price === 'number' && dp.price >= 0;
      
      // Log validation failures
      if (!hasName) {
        console.log(`[Discovery] Invalid name: "${dp.name}"`);
      }
      if (!hasPrice) {
        console.log(`[Discovery] Invalid price: ${dp.price} (type: ${typeof dp.price})`);
      }
      
      return !isDuplicate && hasName && hasPrice;
    });
    
    console.log(`[Discovery] Filtered to ${uniqueProducts.length} unique valid products from ${discoveryResults.length} results`);
    
    // Shuffle and return requested count
    return this.shuffleArray(uniqueProducts).slice(0, count);
  }

  private determineDiscoveryReason(
    product: any,
    originalProducts: any[]
  ): 'different_category' | 'price_range' | 'trending_brand' {
    // Check if it's a different category
    const originalCategories = new Set(
      originalProducts.flatMap(p => p.categories || []).filter(Boolean)
    );
    const productCategories = product.categories || [];
    const isDifferentCategory = productCategories.some((cat: string) => !originalCategories.has(cat));
    
    if (isDifferentCategory) {
      return 'different_category';
    }
    
    // Check if it's a different price range
    const avgPrice = originalProducts.reduce((sum, p) => sum + (p.price || 0), 0) / originalProducts.length;
    const priceDiff = Math.abs((product.price || 0) - avgPrice);
    
    if (priceDiff > avgPrice * 0.5) {
      return 'price_range';
    }
    
    // Default to trending brand
    return 'trending_brand';
  }

  private interleaveProducts(
    regularProducts: any[],
    discoveryProducts: any[]
  ): any[] {
    const result: any[] = [];
    const totalCount = regularProducts.length + discoveryProducts.length;
    
    let regularIndex = 0;
    let discoveryIndex = 0;
    
    // Distribute discovery products evenly
    for (let i = 0; i < totalCount; i++) {
      const discoveryPosition = discoveryProducts.length > 0 
        ? Math.floor((i * discoveryProducts.length) / totalCount)
        : -1;
      
      if (discoveryIndex <= discoveryPosition && discoveryIndex < discoveryProducts.length) {
        result.push(discoveryProducts[discoveryIndex]);
        discoveryIndex++;
      } else if (regularIndex < regularProducts.length) {
        result.push(regularProducts[regularIndex]);
        regularIndex++;
      }
    }
    
    return result;
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

new MainApplication()