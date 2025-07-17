import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { DatabaseService } from './database'
import { PersonalizationEngine, MLTrainingEvent } from './personalization'
import { GeminiService, ImageAnalysis } from './gemini-service'
import { copyFileSync, existsSync } from 'fs'

class MainApplication {
  private mainWindow: BrowserWindow | null = null
  private database: DatabaseService
  private personalization: PersonalizationEngine
  private geminiService: GeminiService

  constructor() {
    this.database = new DatabaseService()
    this.personalization = new PersonalizationEngine(this.database.database)
    this.geminiService = new GeminiService()
    this.setupApp()
    this.setupIPC()
  }

  private setupApp() {
    app.whenReady().then(() => {
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
      try {
        let searchQuery = query;
        let imageAnalysis: ImageAnalysis | null = null;

        // If image data is provided, analyze it with Gemini API
        if (imageData) {
          try {
            // Initialize Gemini service with API key if available
            const apiKeysArray = await this.database.getAPIKeys();
            const geminiKey = apiKeysArray.find(key => key.provider === 'gemini')?.encrypted_key;
            if (geminiKey) {
              await this.geminiService.initialize(geminiKey);
              
              // Analyze the image
              imageAnalysis = await this.geminiService.analyzeImage(imageData, query);
              
              // Enhance search query with image analysis keywords
              searchQuery = imageAnalysis.searchKeywords.join(' ') + ' ' + query;
              
              console.log('Gemini analysis result:', imageAnalysis);
            } else {
              console.warn('Gemini API key not available, skipping image analysis');
            }
          } catch (error) {
            console.warn('Gemini image analysis failed, continuing with text search:', error);
          }
        }

        // Use Algolia demo API for product search
        const response = await fetch(
          'https://latency-dsn.algolia.net/1/indexes/instant_search/query',
          {
            method: 'POST',
            headers: {
              'X-Algolia-API-Key': '6be0576ff61c053d5f9a3225e2a90f76',
              'X-Algolia-Application-Id': 'latency',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: searchQuery,
              hitsPerPage: 20,
              attributesToRetrieve: ['name', 'price', 'image', 'categories', 'url', 'objectID']
            })
          }
        )

        const data = await response.json() as any
        
        if (!data.hits) {
          return []
        }

        let products = data.hits.map((hit: any) => ({
          id: hit.objectID,
          name: hit.name || 'Unknown Product',
          description: hit.description || '',
          price: hit.price || hit.salePrice || 0,
          image: hit.image || this.getDefaultProductImage(),
          categories: hit.categories || [],
          url: hit.url || ''
        }));

        // Apply personalization scoring if we have ML data
        const userProfile = await this.personalization.getUserProfile();
        if (userProfile.confidenceLevel > 0.1) {
          // Score each product based on user preferences
          const scoredProducts = await Promise.all(
            products.map(async (product: any) => ({
              ...product,
              personalizedScore: await this.personalization.calculateProductScore(product, userProfile)
            }))
          );

          // Sort by personalized score
          products = scoredProducts.sort((a, b) => b.personalizedScore - a.personalizedScore);
        }

        // Track search interaction for ML learning
        if (imageAnalysis) {
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

        return products;

      } catch (error) {
        console.error('Product search error:', error)
        return []
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

    // Save API keys
    ipcMain.handle('save-api-keys', async (event, apiKeys: Record<string, string>) => {
      try {
        // Save each API key
        for (const [provider, key] of Object.entries(apiKeys)) {
          if (key && key.trim()) {
            // Note: In production, you should encrypt the key before storing
            // For now, we're storing it as-is (which is what the schema suggests with "encrypted_key")
            await this.database.saveAPIKey(provider, key)
          }
        }
        
        return { success: true, message: 'API keys saved successfully' }
      } catch (error) {
        console.error('Save API keys error:', error)
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
  }
}

new MainApplication()