import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import type { Product, ChatSession, ChatMessage, DiscoveryPercentage } from '../shared/types'

export class DatabaseService {
  private db: Database.Database

  constructor() {
    const dbPath = join(app.getPath('userData'), 'shopping-data.db')
    this.db = new Database(dbPath)
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON')
  }

  initialize() {
    this.createTables()
  }

  private createTables() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        preferences TEXT
      )
    `)

    // Chat sessions
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY,
        session_name TEXT NOT NULL,
        category TEXT,
        subcategory TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Chat messages
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        image_url TEXT,
        analysis_result TEXT,
        search_results TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Saved products
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS saved_products (
        id INTEGER PRIMARY KEY,
        product_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image_url TEXT,
        category TEXT,
        subcategory TEXT,
        tags TEXT,
        algolia_data TEXT,
        user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // ML training data (personalized products only)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ml_training_data (
        id INTEGER PRIMARY KEY,
        user_query TEXT NOT NULL,
        image_features TEXT,
        selected_products TEXT NOT NULL,
        user_feedback INTEGER CHECK (user_feedback BETWEEN 1 AND 5),
        session_context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Outlier interactions (statistical tracking only, not for ML)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS outlier_interactions (
        id INTEGER PRIMARY KEY,
        product_id TEXT NOT NULL,
        interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'save')),
        timestamp INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Discovery settings
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_saved_products_product_id ON saved_products(product_id);
      CREATE INDEX IF NOT EXISTS idx_outlier_interactions_product_id ON outlier_interactions(product_id);
      CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(setting_key);
    `)
  }

  // Product operations
  saveProduct(product: Product): { success: boolean; id?: number } {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO saved_products 
        (product_id, name, description, price, image_url, category, subcategory, tags, algolia_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      const result = stmt.run(
        product.id,
        product.name,
        product.description || null,
        product.price,
        product.image,
        product.categories?.[0] || null,
        product.categories?.[1] || null,
        JSON.stringify(product.categories || []),
        JSON.stringify(product)
      )
      
      return { success: true, id: result.lastInsertRowid as number }
    } catch (error) {
      console.error('Failed to save product:', error)
      return { success: false }
    }
  }

  getProducts(): Product[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM saved_products 
        ORDER BY created_at DESC
      `)
      
      const rows = stmt.all() as any[]
      return rows.map(row => ({
        id: row.product_id,
        name: row.name,
        description: row.description,
        price: row.price,
        image: row.image_url,
        categories: JSON.parse(row.tags || '[]'),
        url: JSON.parse(row.algolia_data || '{}').url
      }))
    } catch (error) {
      console.error('Failed to get products:', error)
      return []
    }
  }

  // Chat operations
  saveChat(sessionData: { name: string; category?: string }, message: ChatMessage): { success: boolean; sessionId?: number } {
    try {
      const transaction = this.db.transaction(() => {
        // Create or get session
        let sessionId: number
        const existingSession = this.db.prepare(`
          SELECT id FROM chat_sessions 
          WHERE session_name = ? 
          ORDER BY created_at DESC 
          LIMIT 1
        `).get(sessionData.name) as any

        if (existingSession) {
          sessionId = existingSession.id
          // Update session timestamp
          this.db.prepare(`
            UPDATE chat_sessions 
            SET updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(sessionId)
        } else {
          // Create new session
          const sessionResult = this.db.prepare(`
            INSERT INTO chat_sessions (session_name, category) 
            VALUES (?, ?)
          `).run(sessionData.name, sessionData.category || null)
          sessionId = sessionResult.lastInsertRowid as number
        }

        // Save message
        const messageStmt = this.db.prepare(`
          INSERT INTO chat_messages (session_id, role, content, image_url, analysis_result, search_results)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        
        messageStmt.run(
          sessionId,
          message.role,
          message.content,
          message.imageUrl || null,
          null, // analysis_result - to be filled later
          null  // search_results - to be filled later
        )

        return sessionId
      })

      const sessionId = transaction()
      return { success: true, sessionId }
    } catch (error) {
      console.error('Failed to save chat:', error)
      return { success: false }
    }
  }

  getChatHistory(): ChatSession[] {
    try {
      const stmt = this.db.prepare(`
        SELECT cs.*, 
               COUNT(cm.id) as message_count,
               MAX(cm.created_at) as last_message_time
        FROM chat_sessions cs
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id
        GROUP BY cs.id
        ORDER BY cs.updated_at DESC
      `)
      
      const rows = stmt.all() as any[]
      return rows.map(row => ({
        id: row.id.toString(),
        name: row.session_name,
        category: row.category,
        subcategory: row.subcategory,
        messages: [], // Will be loaded separately when needed
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }))
    } catch (error) {
      console.error('Failed to get chat history:', error)
      return []
    }
  }

  getChatMessages(sessionId: number): ChatMessage[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_messages 
        WHERE session_id = ? 
        ORDER BY created_at ASC
      `)
      
      const rows = stmt.all(sessionId) as any[]
      return rows.map(row => ({
        id: row.id.toString(),
        role: row.role,
        content: row.content,
        imageUrl: row.image_url,
        timestamp: new Date(row.created_at)
      }))
    } catch (error) {
      console.error('Failed to get chat messages:', error)
      return []
    }
  }

  // Settings operations
  saveDiscoverySetting(percentage: DiscoveryPercentage): { success: boolean } {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_settings (setting_key, setting_value, updated_at)
        VALUES ('outlier_percentage', ?, CURRENT_TIMESTAMP)
      `)
      
      stmt.run(percentage.toString())
      return { success: true }
    } catch (error) {
      console.error('Failed to save discovery setting:', error)
      return { success: false }
    }
  }

  getDiscoverySetting(): DiscoveryPercentage {
    try {
      const stmt = this.db.prepare(`
        SELECT setting_value FROM user_settings 
        WHERE setting_key = 'outlier_percentage'
      `)
      
      const result = stmt.get() as any
      if (result) {
        const value = parseInt(result.setting_value)
        return (value === 5 || value === 10) ? value as DiscoveryPercentage : 0
      }
      return 0
    } catch (error) {
      console.error('Failed to get discovery setting:', error)
      return 0
    }
  }

  // Cleanup method
  close() {
    this.db.close()
  }
}