import Database from 'better-sqlite3';
import { Product } from '../shared/types';

// ML Training Event interface with weighted scoring
export interface MLTrainingEvent {
  eventType: 'search' | 'view' | 'click' | 'save' | 'remove';
  productId: string;
  timestamp: number;
  context: {
    searchQuery?: string;
    imageFeatures?: any;
    sessionId?: number;
    timeSpent?: number;
    category?: string;
    url?: string;
    price?: number;
  };
  weight: number;
  source: 'standalone-app' | 'claude-desktop-mcp';
}

// User Profile interface
export interface UserProfile {
  categoryScores: Record<string, number>;
  pricePreference: {
    min: number;
    max: number;
    sweetSpot: number;
    flexibility: number;
  };
  stylePreference: {
    colors: Record<string, number>;
    materials: Record<string, number>;
    occasions: Record<string, number>;
  };
  brandAffinity: Record<string, number>;
  interactionHistory: {
    totalSearches: number;
    totalSaves: number;
    totalClicks: number;
    totalViews: number;
    avgTimePerProduct: number;
  };
  confidenceLevel: number;
  lastUpdated: Date;
}

export class PersonalizationEngine {
  private db: Database.Database;

  // Interaction weights based on user engagement level
  private readonly WEIGHTS = {
    search: 0.2,
    view: 0.3,
    click: 0.5,
    save: 1.0,
    remove: -0.8,
    timeSpent: 0.1 // Per 10 seconds
  };

  constructor(database: Database.Database) {
    this.db = database;
    this.initializeTables();
  }

  public initialize(): void {
    console.log('[PersonalizationEngine] Initializing ML tables...');
    this.initializeTables();
    console.log('[PersonalizationEngine] ML tables initialized successfully');
  }

  private initializeTables() {
    // Enhanced ML training data table with weights
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ml_training_events (
        id INTEGER PRIMARY KEY,
        event_type TEXT NOT NULL,
        product_id TEXT NOT NULL,
        weight REAL NOT NULL,
        context TEXT,
        timestamp INTEGER NOT NULL,
        source TEXT DEFAULT 'standalone-app',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User preferences profile table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY,
        category_scores TEXT,
        price_preference TEXT,
        style_preference TEXT,
        brand_affinity TEXT,
        interaction_history TEXT,
        confidence_level REAL DEFAULT 0.0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indices for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ml_events_product_id ON ml_training_events(product_id);
      CREATE INDEX IF NOT EXISTS idx_ml_events_timestamp ON ml_training_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ml_events_type ON ml_training_events(event_type);
    `);
  }

  async trackUserInteraction(event: MLTrainingEvent): Promise<void> {
    // Skip ML learning for Claude Desktop interactions (read-only mode)
    if (event.source === 'claude-desktop-mcp') {
      console.log('Claude Desktop interaction - skipping ML learning');
      return;
    }

    try {
      // Calculate weight based on event type and context
      let weight = this.WEIGHTS[event.eventType] || 0;
      
      // Add time-based weight for view events
      if (event.eventType === 'view' && event.context.timeSpent) {
        weight += (event.context.timeSpent / 10) * this.WEIGHTS.timeSpent;
      }

      // Store the interaction
      const stmt = this.db.prepare(`
        INSERT INTO ml_training_events 
        (event_type, product_id, weight, context, timestamp, source)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        event.eventType,
        event.productId,
        weight,
        JSON.stringify(event.context),
        event.timestamp,
        event.source
      );

      // Update user profile asynchronously
      await this.updateUserProfile();

    } catch (error) {
      console.error('Failed to track user interaction:', error);
    }
  }

  async updateUserProfile(): Promise<void> {
    try {
      const profile = await this.calculateUserProfile();
      
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_profile 
        (id, category_scores, price_preference, style_preference, brand_affinity, interaction_history, confidence_level, last_updated)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        JSON.stringify(profile.categoryScores),
        JSON.stringify(profile.pricePreference),
        JSON.stringify(profile.stylePreference),
        JSON.stringify(profile.brandAffinity),
        JSON.stringify(profile.interactionHistory),
        profile.confidenceLevel,
        new Date().toISOString()
      );

    } catch (error) {
      console.error('Failed to update user profile:', error);
    }
  }

  async calculateUserProfile(): Promise<UserProfile> {
    try {
      // Get all interactions with product data
      const events = this.db.prepare(`
        SELECT mte.*, sp.category, sp.price, sp.algolia_data
        FROM ml_training_events mte
        LEFT JOIN saved_products sp ON mte.product_id = sp.product_id
        WHERE mte.source = 'standalone-app'
        ORDER BY mte.timestamp DESC
        LIMIT 1000
      `).all();

      // Initialize profile
      const profile: UserProfile = {
        categoryScores: {},
        pricePreference: { min: 0, max: 1000, sweetSpot: 100, flexibility: 0.3 },
        stylePreference: { colors: {}, materials: {}, occasions: {} },
        brandAffinity: {},
        interactionHistory: {
          totalSearches: 0,
          totalSaves: 0,
          totalClicks: 0,
          totalViews: 0,
          avgTimePerProduct: 0
        },
        confidenceLevel: 0,
        lastUpdated: new Date()
      };

      if (events.length === 0) {
        return profile;
      }

      // Calculate category preferences
      const categoryWeights: Record<string, number> = {};
      let totalWeight = 0;

      for (const event of events as any[]) {
        const weight = (event as any).weight;
        totalWeight += Math.abs(weight);

        // Update interaction history
        const eventKey = `total${(event as any).event_type.charAt(0).toUpperCase() + (event as any).event_type.slice(1)}s` as keyof typeof profile.interactionHistory;
        if (typeof profile.interactionHistory[eventKey] === 'number') {
          (profile.interactionHistory[eventKey] as number)++;
        }

        // Category scoring - handle both string and JSON array formats
        if ((event as any).category) {
          let categories: string[] = [];
          try {
            // Try to parse as JSON array first
            categories = JSON.parse((event as any).category);
          } catch {
            // Fall back to comma-separated string
            categories = (event as any).category.split(',').map((c: string) => c.trim()).filter((c: string) => c);
          }
          
          // Add weight to each category
          for (const cat of categories) {
            categoryWeights[cat] = (categoryWeights[cat] || 0) + weight;
          }
        }

        // Price learning removed for MVP - will use real-time API pricing in future

        // Extract style preferences from context
        if ((event as any).context) {
          try {
            const context = JSON.parse((event as any).context);
            if (context.imageFeatures) {
              // Process image features for style learning
              this.processStyleFeatures(context.imageFeatures, weight, profile.stylePreference);
            }
          } catch (error) {
            // Ignore malformed context
          }
        }
      }

      // Normalize category scores
      for (const [category, weight] of Object.entries(categoryWeights)) {
        profile.categoryScores[category] = weight / totalWeight;
      }
      
      console.log(`[ML] User Profile Update - Total events: ${events.length}, Total weight: ${totalWeight}`);
      console.log(`[ML] Category scores:`, profile.categoryScores);

      // Price preferences removed for MVP
      // Keep default values for compatibility

      // Calculate confidence level based on data points
      // Lower threshold for testing - 10 interactions = full confidence
      profile.confidenceLevel = Math.min(1.0, events.length / 10);

      return profile;

    } catch (error) {
      console.error('Failed to calculate user profile:', error);
      throw error;
    }
  }

  async calculateProductScore(product: Product, userProfile?: UserProfile): Promise<number> {
    try {
      if (!userProfile) {
        userProfile = await this.getUserProfile();
      }

      let score = 0.5; // Base score
      console.log(`[ML] Scoring product: ${product.name} (ID: ${product.id})`);
      console.log(`[ML] - Categories: ${JSON.stringify(product.categories)}`);

      // Category affinity (increased weight from 0.4 to 0.5)
      let categoryScore = 0;
      if (product.categories && product.categories.length > 0) {
        categoryScore = product.categories.reduce((sum, cat) => {
          const catScore = userProfile!.categoryScores[cat] || 0;
          console.log(`[ML]   - Category "${cat}" score: ${catScore}`);
          return sum + catScore;
        }, 0) / product.categories.length;
        score += categoryScore * 0.5;
      }
      console.log(`[ML] - Category score component: ${categoryScore * 0.5}`);

      // Price learning removed - MVP focuses on stable attributes
      // Future API integration will provide real-time pricing

      // Historical interactions with this specific product
      const interactions = this.db.prepare(`
        SELECT SUM(weight) as total_weight, COUNT(*) as count
        FROM ml_training_events
        WHERE product_id = ? AND source = 'standalone-app'
      `).get(product.id);

      let interactionScore = 0;
      if (interactions && (interactions as any).total_weight) {
        const weight = (interactions as any).total_weight;
        const count = (interactions as any).count;
        
        // Increase cap to 0.6 and use logarithmic scaling for better differentiation
        // This gives more spread between products with different interaction levels
        interactionScore = Math.min(0.6, Math.log10(1 + weight) * 0.4);
        
        // Bonus for multiple interactions (not just high weight from single save)
        if (count > 1) {
          interactionScore += Math.min(0.1, count * 0.02);
        }
        
        score += interactionScore;
      }
      console.log(`[ML] - Interaction score: ${interactionScore} (weight: ${(interactions as any)?.total_weight || 0}, count: ${(interactions as any)?.count || 0})`);

      // Apply confidence level to score adjustments
      // This makes ML effects more visible with less data
      const confidenceMultiplier = Math.max(0.5, userProfile.confidenceLevel);
      const adjustedScore = 0.5 + (score - 0.5) * confidenceMultiplier;
      
      const finalScore = Math.max(0, Math.min(1, adjustedScore));
      console.log(`[ML] - Final score: ${finalScore} (confidence: ${userProfile.confidenceLevel})`);
      console.log(`[ML] --------------------------------`);

      return finalScore;

    } catch (error) {
      console.error('Failed to calculate product score:', error);
      return 0.5; // Default score on error
    }
  }

  async getUserProfile(): Promise<UserProfile> {
    try {
      const result = this.db.prepare(`
        SELECT * FROM user_profile WHERE id = 1
      `).get();

      if (!result) {
        // Return default profile if none exists
        return this.getDefaultProfile();
      }

      return {
        categoryScores: JSON.parse((result as any).category_scores || '{}'),
        pricePreference: JSON.parse((result as any).price_preference || '{"min":0,"max":1000,"sweetSpot":100,"flexibility":0.3}'),
        stylePreference: JSON.parse((result as any).style_preference || '{"colors":{},"materials":{},"occasions":{}}'),
        brandAffinity: JSON.parse((result as any).brand_affinity || '{}'),
        interactionHistory: JSON.parse((result as any).interaction_history || '{"totalSearches":0,"totalSaves":0,"totalClicks":0,"totalViews":0,"avgTimePerProduct":0}'),
        confidenceLevel: (result as any).confidence_level || 0,
        lastUpdated: new Date((result as any).last_updated)
      };

    } catch (error) {
      console.error('Failed to get user profile:', error);
      return this.getDefaultProfile();
    }
  }

  async exportForClaudeDesktop(): Promise<any> {
    const profile = await this.getUserProfile();
    
    return {
      userProfile: {
        stylePreferences: Object.keys(profile.stylePreference.colors).slice(0, 5),
        colorPreferences: Object.keys(profile.stylePreference.colors).slice(0, 3),
        occasionHistory: profile.stylePreference.occasions,
        categoryPreferences: Object.entries(profile.categoryScores)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([cat, score]) => ({ category: cat, affinity: score })),
        brandAffinities: profile.brandAffinity
      },
      searchOptimization: {
        commonKeywords: this.extractCommonKeywords(),
        preferredCategories: Object.keys(profile.categoryScores)
          .filter(cat => profile.categoryScores[cat] > 0.1)
          .slice(0, 5)
      },
      metadata: {
        appSource: 'Shopping for AIgolia personalized (MVP)',
        dataVersion: '2.0.0',
        lastSync: new Date(),
        confidenceLevel: profile.confidenceLevel,
        dataPoints: this.getInteractionCount(),
        note: 'Price learning disabled in MVP - future versions will use real-time API pricing'
      }
    };
  }

  private getDefaultProfile(): UserProfile {
    return {
      categoryScores: {},
      pricePreference: { min: 0, max: 1000, sweetSpot: 100, flexibility: 0.3 },
      stylePreference: { colors: {}, materials: {}, occasions: {} },
      brandAffinity: {},
      interactionHistory: {
        totalSearches: 0,
        totalSaves: 0,
        totalClicks: 0,
        totalViews: 0,
        avgTimePerProduct: 0
      },
      confidenceLevel: 0,
      lastUpdated: new Date()
    };
  }

  private processStyleFeatures(imageFeatures: any, weight: number, stylePreference: any): void {
    if (imageFeatures.colors) {
      for (const color of imageFeatures.colors) {
        stylePreference.colors[color] = (stylePreference.colors[color] || 0) + weight;
      }
    }
    if (imageFeatures.materials) {
      for (const material of imageFeatures.materials) {
        stylePreference.materials[material] = (stylePreference.materials[material] || 0) + weight;
      }
    }
    if (imageFeatures.occasion) {
      stylePreference.occasions[imageFeatures.occasion] = (stylePreference.occasions[imageFeatures.occasion] || 0) + weight;
    }
  }

  // Price-related calculation methods removed for MVP
  // Future versions will use real-time API pricing without ML learning

  private extractCommonKeywords(): string[] {
    const result = this.db.prepare(`
      SELECT context, COUNT(*) as frequency
      FROM ml_training_events
      WHERE event_type = 'search' AND context IS NOT NULL
      GROUP BY context
      ORDER BY frequency DESC
      LIMIT 10
    `).all();

    const keywords: string[] = [];
    for (const row of result as any[]) {
      try {
        const context = JSON.parse((row as any).context);
        if (context.searchQuery) {
          keywords.push(...context.searchQuery.split(' ').filter((w: string) => w.length > 2));
        }
      } catch (error) {
        // Ignore malformed context
      }
    }

    return [...new Set(keywords)].slice(0, 5);
  }

  private getInteractionCount(): number {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM ml_training_events
      WHERE source = 'standalone-app'
    `).get();

    return result ? (result as any).count : 0;
  }
}