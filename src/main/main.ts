import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { DatabaseService } from './database'
import { PersonalizationEngine, MLTrainingEvent } from './personalization'
import { GeminiService, ImageAnalysis } from './gemini-service'
import { AlgoliaMCPService } from './algolia-mcp-service'
import { Logger } from './logger'
import { copyFileSync, existsSync } from 'fs'
import { SearchSession, IPCSearchResult } from '../shared/types'

class MainApplication {
  private mainWindow: BrowserWindow | null = null
  private database: DatabaseService
  private personalization: PersonalizationEngine
  private geminiService: GeminiService
  private algoliaMCPService: AlgoliaMCPService
  private logger: Logger

  constructor() {
    this.logger = Logger.getInstance()
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
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools()
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
      // 強制的にDevToolsを開いてログを確認できるようにする（デバッグ用）
      this.mainWindow.webContents.openDevTools()
    }
  }

  private getDefaultProductImage(): string {
    // Base64 encoded default product image (gray box with "No Image" text)
    // This is a small gray square that serves as a placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2UwZTBlMCIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+'
  }

  private setupIPC() {
    // Search products using Algolia
    ipcMain.handle('search-products', async (event, query: string, imageData?: string) => {
      const searchStartTime = Date.now();
      console.log('[Search] Starting product search...');
      console.log('[Search] Query:', query);
      console.log('[Search] Has image data:', !!imageData);
      
      try {
        let searchQuery = query;
        let imageAnalysis: ImageAnalysis | null = null;

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
              
              // Enhance search query with image analysis keywords
              const originalQuery = searchQuery;
              searchQuery = imageAnalysis.searchKeywords.join(' ') + ' ' + query;
              console.log('[Search] Enhanced search query:', originalQuery, '->', searchQuery);
              console.log('[Search] Image analysis keywords:', imageAnalysis.searchKeywords);
            } else {
              console.warn('[Search] Gemini API key not available, skipping image analysis');
            }
          } catch (error) {
            console.warn('[Search] Gemini image analysis failed, continuing with text search:', error);
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
        
        let usingDemoKeys = false;
        
        if (!algoliaAppId || !algoliaApiKey || !algoliaWriteKey) {
          console.warn('[Search] User Algolia API keys not found or incomplete. Using demo keys.');
          // フォールバック: デモAPIキーを使用 (Best Buy データセット)
          actualAppId = 'latency';
          actualApiKey = '6be0576ff61c053d5f9a3225e2a90f76';
          usingDemoKeys = true;
        } else {
          console.log('[Search] Using user-configured Algolia API keys.');
          actualAppId = algoliaAppId;
          actualApiKey = algoliaApiKey;
        }

        // 統合検索用の設定（デモキー使用時は Best Buy インデックスを使用）
        const indexMappings = usingDemoKeys ? {
          all: 'bestbuy',
          electronics: 'bestbuy',
          fashion: 'bestbuy',
          books: 'bestbuy',
          home: 'bestbuy',
          sports: 'bestbuy',
          beauty: 'bestbuy',
          food: 'bestbuy'
        } : STANDARD_INDICES;
        
        const multiSearchConfig = {
          applicationId: actualAppId,
          apiKey: actualApiKey,
          writeApiKey: usingDemoKeys ? undefined : algoliaWriteKey,
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

        // 統合検索の実行
        console.log('[Search] Performing multi-index search with query:', searchQuery);
        let products = await this.algoliaMCPService.searchProductsMultiIndex(
          searchQuery,
          inferredCategories.length > 0 ? inferredCategories : undefined, // カテゴリ指定がない場合は全インデックス検索
          {
            hitsPerPage: 20,
            attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID']
          }
        );

        console.log('[Search] Algolia search results:', products ? products.length : 0, 'products');
        
        // Implement fallback search strategy if no results found
        if (!products || products.length === 0) {
          console.log('[Search] No products found with original query, attempting fallback searches...');
          
          // If we have image analysis keywords, try fallback searches
          if (imageAnalysis && imageAnalysis.searchKeywords.length > 0) {
            const originalKeywords = imageAnalysis.searchKeywords.join(' ');
            sendFeedback(`No products found with analyzed keywords "${originalKeywords}". Trying broader search...`);
            
            // Strategy 1: Try generic keywords without brand names
            const commonBrands = [
              'Nike', 'Adidas', 'Apple', 'Samsung', 'Sony', 'Microsoft', 'Dell', 'HP', 
              'Canon', 'Nikon', 'LG', 'Panasonic', 'Toshiba', 'Asus', 'Acer', 'Lenovo',
              'Intel', 'AMD', 'Nvidia', 'Google', 'Amazon', 'Facebook', 'Tesla', 'BMW',
              'Mercedes', 'Audi', 'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Puma', 'Reebok',
              'New Balance', 'Converse', 'Vans', 'Under Armour', 'Jordan', 'Yeezy'
            ];
            const genericKeywords = imageAnalysis.searchKeywords.filter(keyword => 
              !commonBrands.some(brand => keyword.toLowerCase().includes(brand.toLowerCase()))
            );
            
            if (genericKeywords.length > 0) {
              const genericQuery = genericKeywords.join(' ') + ' ' + query;
              sendFeedback(`Searching with generic keywords "${genericKeywords.join(' ')}" (brand names removed)...`);
              
              products = await this.algoliaMCPService.searchProductsMultiIndex(
                genericQuery,
                inferredCategories.length > 0 ? inferredCategories : undefined,
                {
                  hitsPerPage: 20,
                  attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID']
                }
              );
              
              console.log('[Search] Generic keywords search results:', products ? products.length : 0, 'products');
            }
            
            // Strategy 2: If still no results, try category-only search
            if ((!products || products.length === 0) && imageAnalysis.category && imageAnalysis.category !== 'general') {
              sendFeedback(`Switching to category search: "${imageAnalysis.category}"...`);
              
              products = await this.algoliaMCPService.searchProductsMultiIndex(
                query, // Use original user query
                [imageAnalysis.category],
                {
                  hitsPerPage: 20,
                  attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID']
                }
              );
              
              console.log('[Search] Category-only search results:', products ? products.length : 0, 'products');
            }
            
            // Strategy 3: Try with synonym variations
            if ((!products || products.length === 0) && genericKeywords.length > 0) {
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
                  attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID']
                }
              );
              
              console.log('[Search] Synonym search results:', products ? products.length : 0, 'products');
            }
            
            // Strategy 4: If still no results, try all indices with user query only
            if (!products || products.length === 0) {
              sendFeedback(`Searching all categories for "${query}"...`);
              
              products = await this.algoliaMCPService.searchProductsMultiIndex(
                query,
                undefined, // Search all indices
                {
                  hitsPerPage: 20,
                  attributesToRetrieve: ['name', 'description', 'price', 'salePrice', 'image', 'categories', 'url', 'objectID']
                }
              );
              
              console.log('[Search] All-categories search results:', products ? products.length : 0, 'products');
            }
          }
          
          if (!products || products.length === 0) {
            console.log('[Search] No products found after all fallback attempts, returning empty array');
            sendFeedback('Sorry, no products found matching your search.');
            return [];
          } else {
            sendFeedback(`Found ${products.length} products.`);
          }
        }

        // Filter out products with broken or invalid image URLs
        console.log('[Search] Filtering products with invalid images...');
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
          
          // Check for common invalid URL patterns
          const invalidPatterns = [
            /^https?:\/\/(localhost|127\.0\.0\.1)/,  // localhost URLs
            /\.(tmp|temp)$/i,                        // temporary file extensions
            /\/temp\//i,                             // temp directories
            /example\.com/i                          // example domains
          ];
          
          return !invalidPatterns.some(pattern => pattern.test(product.image));
        });
        
        console.log(`[Search] Filtered ${products.length - validProducts.length} products with invalid images, ${validProducts.length} remain`);
        products = validProducts;

        // Apply personalization scoring if we have ML data
        console.log('[Search] Checking user profile for personalization...');
        const userProfile = await this.personalization.getUserProfile();
        console.log('[Search] User profile confidence level:', userProfile.confidenceLevel);
        
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
        } else {
          console.log('[Search] Skipping personalization (insufficient confidence)');
        }

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

        // Create search result with analysis metadata
        const searchResult: IPCSearchResult = {
          products: productsWithSession,
          imageAnalysis: imageAnalysis ? {
            keywords: imageAnalysis.searchKeywords,
            category: imageAnalysis.category,
            searchQuery: imageAnalysis.searchKeywords.join(' ')
          } : undefined
        };

        console.log('[Search] Returning', productsWithSession.length, 'products with analysis metadata');
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
        return join(app.getPath('userData'), 'shopping-data.db')
      } catch (error) {
        console.error('Get database path error:', error)
        return null
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
        
        const message = `API keys saved successfully: ${savedKeys.join(', ')}`;
        console.log('[Main]', message);
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

    // Track product view interaction
    ipcMain.handle('track-product-view', async (event, productId: string, timeSpent: number) => {
      try {
        await this.personalization.trackUserInteraction({
          eventType: 'view',
          productId,
          timestamp: Date.now(),
          context: { timeSpent },
          weight: 0.3 + (timeSpent / 10) * 0.1,
          source: 'standalone-app'
        })
        return { success: true }
      } catch (error) {
        console.error('Track product view error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Track product click interaction
    ipcMain.handle('track-product-click', async (event, productId: string, url: string) => {
      try {
        await this.personalization.trackUserInteraction({
          eventType: 'click',
          productId,
          timestamp: Date.now(),
          context: { url },
          weight: 0.5,
          source: 'standalone-app'
        })
        return { success: true }
      } catch (error) {
        console.error('Track product click error:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Enhanced save-product handler with ML tracking
    ipcMain.handle('save-product-with-tracking', async (event, product: any) => {
      try {
        // Save the product
        const saveResult = await this.database.saveProduct(product)
        
        if (saveResult.lastInsertRowid) {
          // Track the save interaction
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
  }
}

new MainApplication()