// Lightweight database service for MCP server
// Reads data from JSON export instead of SQLite
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { Product, Message, ChatSession, DiscoveryPercentage } from '../shared/types'

interface MCPExportData {
  exportedAt: string
  version: string
  products: Product[]
  mlTrainingData: any[]
  userSettings: any
  personalizationProfile: any
  lastActivityDate: string | null
}

export class DatabaseService {
  private cachedData: MCPExportData | null = null
  private exportPath: string

  constructor(mcpMode: boolean = false) {
    // MCP mode always reads from JSON export
    const exportDir = join(homedir(), '.shopping-algolia')
    this.exportPath = join(exportDir, 'mcp-export.json')
    console.log('[Database MCP] Using JSON export at:', this.exportPath)
  }

  get database(): any {
    // Return mock database object for compatibility
    return {
      prepare: () => ({
        all: () => [],
        get: () => undefined,
        run: () => ({ lastInsertRowid: 0 })
      })
    }
  }

  initialize() {
    this.loadExportData()
  }

  private loadExportData(): void {
    try {
      if (existsSync(this.exportPath)) {
        const data = readFileSync(this.exportPath, 'utf8')
        this.cachedData = JSON.parse(data)
        console.log('[Database MCP] Loaded export data from', this.exportPath)
        console.log(`[Database MCP] Export timestamp: ${this.cachedData?.exportedAt}`)
      } else {
        console.log('[Database MCP] No export file found at', this.exportPath)
        // Initialize with empty data
        this.cachedData = {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          products: [],
          mlTrainingData: [],
          userSettings: null,
          personalizationProfile: null,
          lastActivityDate: null
        }
      }
    } catch (error) {
      console.error('[Database MCP] Failed to load export data:', error)
      // Initialize with empty data on error
      this.cachedData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        products: [],
        mlTrainingData: [],
        userSettings: null,
        personalizationProfile: null,
        lastActivityDate: null
      }
    }
  }

  // Implement read-only methods that match the original DatabaseService API

  getAllProducts(): Product[] {
    this.loadExportData() // Reload to get latest data
    return this.cachedData?.products || []
  }

  async getProducts(): Promise<Product[]> {
    return this.getAllProducts()
  }

  getProduct(id: number): Product | undefined {
    const products = this.getAllProducts()
    return products.find(p => p.id === id.toString())
  }

  getProductByProductId(productId: string): Product | undefined {
    const products = this.getAllProducts()
    return products.find(p => p.id === productId)
  }

  getUserSettings(): any {
    this.loadExportData() // Reload to get latest data
    return this.cachedData?.userSettings || {
      discoveryPercentage: 0,
      theme: 'light'
    }
  }

  getMLTrainingData(): any[] {
    this.loadExportData() // Reload to get latest data
    return this.cachedData?.mlTrainingData || []
  }

  getOutlierInteractions(): any[] {
    // In JSON export, we might not have separate outlier data
    // Return empty array for compatibility
    return []
  }

  getLastActivityDate(): string | null {
    this.loadExportData() // Reload to get latest data
    return this.cachedData?.lastActivityDate || null
  }

  getAllChatSessions(): ChatSession[] {
    // Chat sessions might not be in export, return empty array
    return []
  }

  getChatMessages(sessionId: number): Message[] {
    // Chat messages might not be in export, return empty array
    return []
  }

  getAPIKey(provider: string): { api_key: string } | undefined {
    // API keys are not exported for security reasons
    return undefined
  }

  // Write methods - all no-op in MCP mode
  saveProduct(product: any): any {
    console.log('[Database MCP] Write operation ignored - read-only mode')
    return { lastInsertRowid: 0 }
  }

  removeProduct(id: number): boolean {
    console.log('[Database MCP] Write operation ignored - read-only mode')
    return false
  }

  createChatSession(name: string, category?: string): number {
    console.log('[Database MCP] Write operation ignored - read-only mode')
    return 0
  }

  saveChatMessage(message: any): any {
    console.log('[Database MCP] Write operation ignored - read-only mode')
    return { lastInsertRowid: 0 }
  }

  saveUserSettings(settings: any): void {
    console.log('[Database MCP] Write operation ignored - read-only mode')
  }

  saveAPIKey(provider: string, apiKey: string): void {
    console.log('[Database MCP] Write operation ignored - read-only mode')
  }

  deleteAPIKey(provider: string): boolean {
    console.log('[Database MCP] Write operation ignored - read-only mode')
    return false
  }

  deleteAllAPIKeys(): boolean {
    console.log('[Database MCP] Write operation ignored - read-only mode')
    return false
  }

  cleanupDuplicateAPIKeys(provider?: string): void {
    console.log('[Database MCP] Write operation ignored - read-only mode')
  }

  resetDatabase(): void {
    console.log('[Database MCP] Write operation ignored - read-only mode')
  }

  resetMLData(): void {
    console.log('[Database MCP] Write operation ignored - read-only mode')
  }

  updateChatSession(sessionId: number, updates: any): void {
    console.log('[Database MCP] Write operation ignored - read-only mode')
  }

  deleteChatSession(sessionId: number): boolean {
    console.log('[Database MCP] Write operation ignored - read-only mode')
    return false
  }

  // Additional methods for MCP export data
  getExportMetadata(): { exportedAt: string; version: string } | null {
    this.loadExportData()
    if (this.cachedData) {
      return {
        exportedAt: this.cachedData.exportedAt,
        version: this.cachedData.version
      }
    }
    return null
  }

  getPersonalizationProfile(): any {
    this.loadExportData()
    return this.cachedData?.personalizationProfile || null
  }
}