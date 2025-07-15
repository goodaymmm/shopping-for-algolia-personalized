import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { DatabaseService } from './database'

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
  }
}

new MainApplication()