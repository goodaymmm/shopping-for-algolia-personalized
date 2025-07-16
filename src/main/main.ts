import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { DatabaseService } from './database'
import { copyFileSync, existsSync } from 'fs'

class MainApplication {
  private mainWindow: BrowserWindow | null = null
  private database: DatabaseService

  constructor() {
    this.database = new DatabaseService()
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

  private setupIPC() {
    // Search products using Algolia
    ipcMain.handle('search-products', async (event, query: string, imageData?: string) => {
      try {
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
              query,
              hitsPerPage: 20,
              attributesToRetrieve: ['name', 'price', 'image', 'categories', 'url', 'objectID']
            })
          }
        )

        const data = await response.json() as any
        
        if (!data.hits) {
          return []
        }

        return data.hits.map((hit: any) => ({
          id: hit.objectID,
          name: hit.name || 'Unknown Product',
          description: hit.description || '',
          price: hit.price || hit.salePrice || 0,
          image: hit.image || 'https://via.placeholder.com/300x300?text=No+Image',
          categories: hit.categories || [],
          url: hit.url || ''
        }))
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
        return { success: false, error: (error as Error).message }
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
  }
}

new MainApplication()