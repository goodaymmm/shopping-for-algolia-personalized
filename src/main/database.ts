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

    // Search logs (for ML learning and personalization)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id INTEGER PRIMARY KEY,
        search_query TEXT NOT NULL,
        inferred_categories TEXT, -- JSON array of categories
        search_results_count INTEGER,
        selected_product_id TEXT,
        selected_product_index INTEGER, -- Position in search results (0-based)
        source_index TEXT, -- Which Algolia index provided the selected product
        response_time_ms INTEGER,
        gemini_keywords TEXT, -- Gemini-generated keywords
        gemini_category TEXT, -- Gemini-identified category
        image_provided BOOLEAN DEFAULT FALSE,
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
        JSON.stringify(product.categories || []), // Store as JSON array
        '', // subcategory
        JSON.stringify(product.categories || []), // tags as JSON array
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
      DROP TABLE IF EXISTS ml_training_events;
      DROP TABLE IF EXISTS outlier_interactions;
      DROP TABLE IF EXISTS search_logs;
      DROP TABLE IF EXISTS user_profile;
      DROP TABLE IF EXISTS user_settings;
      DROP TABLE IF EXISTS api_configs;
    `)
    
    // Recreate tables
    this.createTables()
  }

  resetMLData() {
    // Clear ML training data tables
    try {
      // Delete from ml_training_events (created by PersonalizationEngine)
      this.db.exec(`DELETE FROM ml_training_events`)
    } catch (error) {
      console.log('ml_training_events table does not exist yet')
    }
    
    try {
      // Delete from user_profile (created by PersonalizationEngine)
      this.db.exec(`DELETE FROM user_profile`)
    } catch (error) {
      console.log('user_profile table does not exist yet')
    }
    
    // Delete from other ML-related tables
    this.db.exec(`
      DELETE FROM ml_training_data;
      DELETE FROM outlier_interactions;
      DELETE FROM search_logs;
    `)
    
    console.log('ML data reset successfully')
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

  // 検索ログの記録（ML学習とパーソナライゼーション用）
  async logSearch(searchLog: {
    searchQuery: string;
    inferredCategories: string[];
    searchResultsCount: number;
    selectedProductId?: string;
    selectedProductIndex?: number;
    sourceIndex?: string;
    responseTimeMs: number;
    geminiKeywords?: string[];
    geminiCategory?: string;
    imageProvided: boolean;
  }) {
    console.log('[Database] Logging search:', {
      query: searchLog.searchQuery,
      categories: searchLog.inferredCategories,
      resultsCount: searchLog.searchResultsCount,
      hasSelection: !!searchLog.selectedProductId
    });

    try {
      const stmt = this.db.prepare(`
        INSERT INTO search_logs (
          search_query, 
          inferred_categories, 
          search_results_count,
          selected_product_id,
          selected_product_index,
          source_index,
          response_time_ms,
          gemini_keywords,
          gemini_category,
          image_provided
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        searchLog.searchQuery,
        JSON.stringify(searchLog.inferredCategories),
        searchLog.searchResultsCount,
        searchLog.selectedProductId || null,
        searchLog.selectedProductIndex || null,
        searchLog.sourceIndex || null,
        searchLog.responseTimeMs,
        searchLog.geminiKeywords ? JSON.stringify(searchLog.geminiKeywords) : null,
        searchLog.geminiCategory || null,
        searchLog.imageProvided ? 1 : 0 // boolean を数値に変換
      );

      console.log('[Database] Search logged successfully with ID:', result.lastInsertRowid);
      return result;
    } catch (error) {
      console.error('[Database] Error logging search:', error);
      throw error;
    }
  }

  // 商品選択の記録（検索ログを更新）
  async logProductSelection(searchLogId: number, productId: string, productIndex: number, sourceIndex: string) {
    console.log('[Database] Logging product selection:', {
      searchLogId,
      productId,
      productIndex,
      sourceIndex
    });

    try {
      const stmt = this.db.prepare(`
        UPDATE search_logs 
        SET selected_product_id = ?, selected_product_index = ?, source_index = ?
        WHERE id = ?
      `);

      const result = stmt.run(productId, productIndex, sourceIndex, searchLogId);
      console.log('[Database] Product selection logged successfully');
      return result;
    } catch (error) {
      console.error('[Database] Error logging product selection:', error);
      throw error;
    }
  }

  // カテゴリ別興味度の取得
  async getCategoryInterests(): Promise<{ [category: string]: number }> {
    console.log('[Database] Getting category interests from search logs');

    try {
      // 最近の検索ログからカテゴリ別の興味度を計算
      const stmt = this.db.prepare(`
        SELECT 
          gemini_category,
          inferred_categories,
          COUNT(*) as search_count,
          COUNT(selected_product_id) as selection_count
        FROM search_logs 
        WHERE created_at > datetime('now', '-30 days')
        GROUP BY gemini_category, inferred_categories
      `);

      const rows = stmt.all() as Array<{
        gemini_category: string | null;
        inferred_categories: string;
        search_count: number;
        selection_count: number;
      }>;

      const categoryInterests: { [category: string]: number } = {};

      for (const row of rows) {
        // Geminiカテゴリの処理
        if (row.gemini_category) {
          const category = row.gemini_category;
          const interest = row.selection_count / row.search_count; // 選択率
          categoryInterests[category] = (categoryInterests[category] || 0) + interest;
        }

        // 推論カテゴリの処理
        if (row.inferred_categories) {
          try {
            const categories = JSON.parse(row.inferred_categories) as string[];
            const interest = (row.selection_count / row.search_count) / categories.length; // 複数カテゴリで分散
            for (const category of categories) {
              categoryInterests[category] = (categoryInterests[category] || 0) + interest;
            }
          } catch (e) {
            console.warn('[Database] Failed to parse inferred categories:', row.inferred_categories);
          }
        }
      }

      console.log('[Database] Category interests calculated:', categoryInterests);
      return categoryInterests;
    } catch (error) {
      console.error('[Database] Error getting category interests:', error);
      return {};
    }
  }

  // 検索パターンの取得（パーソナライズド検索用）
  async getSearchPatterns(limit: number = 50): Promise<Array<{
    query: string;
    keywords: string[];
    category: string;
    frequency: number;
  }>> {
    console.log('[Database] Getting search patterns for personalization');

    try {
      const stmt = this.db.prepare(`
        SELECT 
          search_query,
          gemini_keywords,
          gemini_category,
          COUNT(*) as frequency
        FROM search_logs 
        WHERE created_at > datetime('now', '-30 days')
          AND selected_product_id IS NOT NULL
        GROUP BY search_query, gemini_keywords, gemini_category
        ORDER BY frequency DESC, created_at DESC
        LIMIT ?
      `);

      const rows = stmt.all(limit) as Array<{
        search_query: string;
        gemini_keywords: string | null;
        gemini_category: string | null;
        frequency: number;
      }>;

      const patterns = rows.map(row => ({
        query: row.search_query,
        keywords: row.gemini_keywords ? JSON.parse(row.gemini_keywords) : [],
        category: row.gemini_category || 'general',
        frequency: row.frequency
      }));

      console.log('[Database] Retrieved', patterns.length, 'search patterns');
      return patterns;
    } catch (error) {
      console.error('[Database] Error getting search patterns:', error);
      return [];
    }
  }

  // Delete a specific API key
  async deleteAPIKey(provider: string): Promise<boolean> {
    console.log('[Database] Deleting API key for provider:', provider);
    
    try {
      const stmt = this.db.prepare('DELETE FROM api_configs WHERE provider = ?');
      const result = stmt.run(provider);
      
      console.log('[Database] Delete result:', { provider, changes: result.changes });
      return result.changes > 0;
    } catch (error) {
      console.error('[Database] Error deleting API key:', error);
      return false;
    }
  }

  // Delete all API keys
  async deleteAllAPIKeys(): Promise<boolean> {
    console.log('[Database] Deleting all API keys');
    
    try {
      const stmt = this.db.prepare('DELETE FROM api_configs');
      const result = stmt.run();
      
      console.log('[Database] Delete all result:', { changes: result.changes });
      return result.changes > 0;
    } catch (error) {
      console.error('[Database] Error deleting all API keys:', error);
      return false;
    }
  }
}