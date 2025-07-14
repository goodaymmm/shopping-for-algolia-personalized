import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { DatabaseService } from './database'
import { IPC_CHANNELS } from '../shared/types'

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
      if (BrowserWindow.getAllWindows().length === 0) this.createWindow()
    })
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools()
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  private setupIPC() {
    // Database operations
    ipcMain.handle(IPC_CHANNELS.DB_SAVE_PRODUCT, async (_event, product) => {
      return this.database.saveProduct(product)
    })

    ipcMain.handle(IPC_CHANNELS.DB_GET_PRODUCTS, async () => {
      return this.database.getProducts()
    })

    ipcMain.handle(IPC_CHANNELS.DB_SAVE_CHAT, async (_event, sessionData, message) => {
      return this.database.saveChat(sessionData, message)
    })

    ipcMain.handle(IPC_CHANNELS.DB_GET_CHAT_HISTORY, async () => {
      return this.database.getChatHistory()
    })

    ipcMain.handle(IPC_CHANNELS.DB_GET_CHAT_MESSAGES, async (_event, sessionId) => {
      return this.database.getChatMessages(sessionId)
    })

    // Settings operations
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE_DISCOVERY, async (_event, percentage) => {
      return this.database.saveDiscoverySetting(percentage)
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_DISCOVERY, async () => {
      return this.database.getDiscoverySetting()
    })

    // Search operations (Algolia integration)
    ipcMain.handle(IPC_CHANNELS.SEARCH_PRODUCTS, async (_event, query, filters) => {
      return await this.handleProductSearch(query, filters)
    })
  }

  private async handleProductSearch(query: string, filters?: string) {
    try {
      // Algolia demo API search
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
            filters: filters || '',
            hitsPerPage: 20,
            attributesToRetrieve: ['name', 'price', 'image', 'categories', 'url', 'objectID']
          })
        }
      )

      const data = await response.json() as any
      
      // Transform Algolia results to our Product interface
      const products = (data.hits || []).map((hit: any) => ({
        id: hit.objectID,
        name: hit.name,
        description: hit.description || '',
        price: hit.price || hit.salePrice || 0,
        image: hit.image,
        categories: hit.categories || [],
        url: hit.url
      }))

      return products
    } catch (error) {
      console.error('Algolia search error:', error)
      return []
    }
  }

  private cleanup() {
    this.database.close()
  }
}

const mainApp = new MainApplication()

// Handle app cleanup
app.on('before-quit', () => {
  mainApp['cleanup']()
})