import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { Product, Message, ChatSession, DiscoveryPercentage } from '../shared/types'

export class DatabaseService {
  private db: Database.Database

  constructor() {
    const dbPath = join(app.getPath('userData'), 'shopping-data.db')
    this.db = new Database(dbPath)
  }

  get database(): Database.Database {
    return this.db
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

    // Chat sessions (following requirements document schema)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY,
        session_name TEXT,
        category TEXT,
        subcategory TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Chat messages (following requirements document schema)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY,
        session_id INTEGER REFERENCES chat_sessions(id),
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        analysis_result TEXT,
        search_results TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Saved products (following requirements document schema)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS saved_products (
        id INTEGER PRIMARY KEY,
        product_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        price REAL,
        image_url TEXT,
        url TEXT,
        category TEXT,
        subcategory TEXT,
        tags TEXT,
        algolia_data TEXT,
        user_rating INTEGER,
        notes TEXT,
        custom_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // ML training data (personalized products only)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ml_training_data (
        id INTEGER PRIMARY KEY,
        user_query TEXT,
        image_features TEXT,
        selected_products TEXT,
        user_feedback INTEGER,
        session_context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Outlier interactions (statistical tracking only, not for ML)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS outlier_interactions (
        id INTEGER PRIMARY KEY,
        product_id TEXT,
        interaction_type TEXT,
        timestamp INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // User settings (including discovery settings)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY,
        setting_key TEXT UNIQUE,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // API configurations (encrypted)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_configs (
        id INTEGER PRIMARY KEY,
        provider TEXT NOT NULL,
        encrypted_key TEXT NOT NULL,
        settings TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    // Run migrations for existing databases
    this.migrateDatabase()
  }

  private migrateDatabase() {
    try {
      // Check if custom_name column exists in saved_products table
      const tableInfo = this.db.prepare("PRAGMA table_info(saved_products)").all()
      const hasCustomName = tableInfo.some((col: any) => col.name === 'custom_name')
      
      if (!hasCustomName) {
        console.log('Migrating database: Adding custom_name column to saved_products table')
        this.db.exec('ALTER TABLE saved_products ADD COLUMN custom_name TEXT')
      }

      // Check if url column exists in saved_products table
      const hasUrl = tableInfo.some((col: any) => col.name === 'url')
      
      if (!hasUrl) {
        console.log('Migrating database: Adding url column to saved_products table')
        this.db.exec('ALTER TABLE saved_products ADD COLUMN url TEXT')
      }
    } catch (error) {
      console.error('Migration error:', error)
      // If table doesn't exist, it will be created with the correct schema
    }
  }

  // Product operations
  async saveProduct(product: Product) {
    // Check if product already exists
    const existing = this.db.prepare('SELECT id FROM saved_products WHERE product_id = ?').get(product.id)
    
    if (existing) {
      throw new Error('Product already saved')
    }
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO saved_products 
        (product_id, name, description, price, image_url, url, category, subcategory, tags, algolia_data, user_rating, notes, custom_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const result = stmt.run(
        product.id,
        product.name,
        product.description || '',
        product.price,
        product.image,
        product.url || '',
        product.categories?.join(', ') || '',
        '', // subcategory
        product.categories?.join(', ') || '', // tags
        JSON.stringify(product),
        null, // user_rating
        '', // notes
        product.name // custom_name
      )
      console.log('Product saved successfully:', product.id)
      return result
    } catch (error) {
      console.error('Database error while saving product:', error)
      console.error('Product data:', product)
      throw error
    }
  }

  async getProducts() {
    const stmt = this.db.prepare(`
      SELECT * FROM saved_products ORDER BY created_at DESC
    `)
    return stmt.all()
  }

  async removeProduct(productId: string) {
    const stmt = this.db.prepare(`
      DELETE FROM saved_products WHERE id = ?
    `)
    return stmt.run(productId)
  }

  async updateProduct(productId: string, updates: { customName?: string; tags?: string }) {
    const fields: string[] = []
    const values: any[] = []
    
    if (updates.customName !== undefined) {
      fields.push('custom_name = ?')
      values.push(updates.customName)
    }
    
    if (updates.tags !== undefined) {
      fields.push('tags = ?')
      values.push(updates.tags)
    }
    
    if (fields.length === 0) return
    
    values.push(productId)
    const stmt = this.db.prepare(`
      UPDATE saved_products 
      SET ${fields.join(', ')}
      WHERE id = ?
    `)
    return stmt.run(...values)
  }

  // Chat operations
  async saveChat(sessionData: { name: string; category?: string }, message: Message) {
    // First, create or get session
    let sessionId: number

    const existingSession = this.db.prepare(`
      SELECT id FROM chat_sessions WHERE session_name = ?
    `).get(sessionData.name)

    if (existingSession) {
      sessionId = (existingSession as any).id
      // Update session timestamp
      this.db.prepare(`
        UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(sessionId)
    } else {
      const sessionResult = this.db.prepare(`
        INSERT INTO chat_sessions (session_name, category)
        VALUES (?, ?)
      `).run(sessionData.name, sessionData.category || 'general')
      sessionId = sessionResult.lastInsertRowid as number
    }

    // Save message
    const messageResult = this.db.prepare(`
      INSERT INTO chat_messages (session_id, role, content, image_url)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, message.sender, message.content, message.image || null)

    return { sessionId, messageId: messageResult.lastInsertRowid }
  }

  async getChatHistory(): Promise<ChatSession[]> {
    const stmt = this.db.prepare(`
      SELECT cs.*, 
             COUNT(cm.id) as message_count,
             MAX(cm.created_at) as last_message
      FROM chat_sessions cs
      LEFT JOIN chat_messages cm ON cs.id = cm.session_id
      GROUP BY cs.id
      ORDER BY cs.updated_at DESC
    `)
    const sessions = stmt.all()

    return sessions.map((session: any) => ({
      id: session.id.toString(),
      title: session.session_name,
      category: session.category,
      subcategory: session.subcategory,
      messages: [],
      createdAt: new Date(session.created_at),
      updatedAt: new Date(session.updated_at)
    }))
  }

  async getChatMessages(sessionId: number): Promise<Message[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM chat_messages 
      WHERE session_id = ? 
      ORDER BY created_at ASC
    `)
    const messages = stmt.all(sessionId)

    return messages.map((msg: any) => ({
      id: msg.id.toString(),
      sender: msg.role as 'user' | 'assistant',
      content: msg.content,
      image: msg.image_url,
      timestamp: new Date(msg.created_at)
    }))
  }

  // Discovery settings
  async saveDiscoverySetting(percentage: DiscoveryPercentage) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_settings (setting_key, setting_value, updated_at)
      VALUES ('outlier_percentage', ?, CURRENT_TIMESTAMP)
    `)
    return stmt.run(percentage.toString())
  }

  async getDiscoverySetting(): Promise<DiscoveryPercentage> {
    const stmt = this.db.prepare(`
      SELECT setting_value FROM user_settings WHERE setting_key = 'outlier_percentage'
    `)
    const result = stmt.get() as any
    return result ? (parseInt(result.setting_value) as DiscoveryPercentage) : 0
  }

  // ML data operations (for Phase C - advanced features)
  async saveMLTrainingData(data: {
    userQuery: string
    imageFeatures?: any
    selectedProducts: Product[]
    userFeedback: number
    sessionContext: any
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO ml_training_data 
      (user_query, image_features, selected_products, user_feedback, session_context)
      VALUES (?, ?, ?, ?, ?)
    `)
    return stmt.run(
      data.userQuery,
      JSON.stringify(data.imageFeatures || {}),
      JSON.stringify(data.selectedProducts),
      data.userFeedback,
      JSON.stringify(data.sessionContext)
    )
  }

  // Statistics
  async getStats() {
    const productCount = this.db.prepare('SELECT COUNT(*) as count FROM saved_products').get() as any
    const sessionCount = this.db.prepare('SELECT COUNT(*) as count FROM chat_sessions').get() as any
    const messageCount = this.db.prepare('SELECT COUNT(*) as count FROM chat_messages').get() as any

    return {
      totalProducts: productCount.count,
      totalSessions: sessionCount.count,
      totalMessages: messageCount.count
    }
  }

  // Database management methods
  resetDatabase() {
    // Drop all tables
    this.db.exec(`
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS chat_sessions;
      DROP TABLE IF EXISTS chat_messages;
      DROP TABLE IF EXISTS saved_products;
      DROP TABLE IF EXISTS ml_training_data;
      DROP TABLE IF EXISTS outlier_interactions;
      DROP TABLE IF EXISTS user_settings;
      DROP TABLE IF EXISTS api_configs;
    `)
    
    // Recreate tables
    this.createTables()
  }

  resetMLData() {
    // Clear ML training data tables
    this.db.exec(`
      DELETE FROM ml_training_data;
      DELETE FROM outlier_interactions;
    `)
  }

  // API key management
  async getAPIKeys() {
    console.log('[Database] Getting API keys...');
    const stmt = this.db.prepare(`
      SELECT provider, encrypted_key FROM api_configs
    `)
    const result = stmt.all() as Array<{ provider: string; encrypted_key: string }>;
    console.log('[Database] Retrieved API keys:', result.map(r => ({ provider: r.provider, keyLength: r.encrypted_key.length })));
    return result;
  }

  async saveAPIKey(provider: string, key: string) {
    console.log('[Database] Saving API key for provider:', provider, 'keyLength:', key.length);
    
    // APIキーの基本的な検証
    if (provider === 'gemini' && (!key.startsWith('AIzaSy') || key.length < 35)) {
      console.log('[Database] Invalid Gemini API key format detected, rejecting save');
      throw new Error('Invalid API key format');
    }
    
    // 既存の重複エントリをクリーンアップ
    await this.cleanupDuplicateAPIKeys(provider);
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO api_configs (provider, encrypted_key, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `)
    const result = stmt.run(provider, key);
    console.log('[Database] API key saved successfully');
    return result;
  }

  // 重複APIキーエントリのクリーンアップ
  async cleanupDuplicateAPIKeys(provider?: string) {
    console.log('[Database] Starting API key cleanup for provider:', provider || 'all');
    
    try {
      // 指定されたプロバイダーまたは全てのプロバイダーの重複をクリーンアップ
      if (provider) {
        // 特定のプロバイダーの最新エントリ以外を削除
        const deleteStmt = this.db.prepare(`
          DELETE FROM api_configs 
          WHERE provider = ? AND id NOT IN (
            SELECT id FROM api_configs 
            WHERE provider = ? 
            ORDER BY created_at DESC 
            LIMIT 1
          )
        `);
        const result = deleteStmt.run(provider, provider);
        console.log('[Database] Cleaned up', result.changes, 'duplicate entries for provider:', provider);
      } else {
        // 全プロバイダーの重複をクリーンアップ
        const providers = this.db.prepare('SELECT DISTINCT provider FROM api_configs').all() as Array<{ provider: string }>;
        let totalCleaned = 0;
        
        for (const { provider } of providers) {
          const deleteStmt = this.db.prepare(`
            DELETE FROM api_configs 
            WHERE provider = ? AND id NOT IN (
              SELECT id FROM api_configs 
              WHERE provider = ? 
              ORDER BY created_at DESC 
              LIMIT 1
            )
          `);
          const result = deleteStmt.run(provider, provider);
          totalCleaned += result.changes;
        }
        
        console.log('[Database] Total cleanup: removed', totalCleaned, 'duplicate API key entries');
      }
    } catch (error) {
      console.error('[Database] Error during API key cleanup:', error);
      throw error;
    }
  }
}