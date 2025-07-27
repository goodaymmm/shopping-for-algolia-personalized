// Lightweight personalization engine for MCP server
// Works with JSON export data instead of SQLite
import { Product } from '../shared/types'

export interface MLTrainingEvent {
  id?: number
  user_id: number
  event_type: string
  product_id: string
  timestamp: number
  context?: any
  weight: number
  source: string
}

export class PersonalizationEngine {
  private database: any // Using any to avoid TypeScript issues with MCP vs regular database

  constructor(database: any) {
    // Accept database instance (either regular or MCP version)
    this.database = database
  }

  // Main export method for Claude Desktop
  async exportForClaudeDesktop(): Promise<any> {
    // Check if we have cached personalization profile
    const cachedProfile = this.database.getPersonalizationProfile()
    if (cachedProfile) {
      // Using cached personalization profile from export
      return cachedProfile
    }

    // If no cached profile, generate basic profile from available data
    // Generating personalization profile from available data
    
    const products = this.database.getAllProducts()
    const mlData = this.database.getMLTrainingData()
    const settings = this.database.getUserSettings()
    
    // Calculate basic statistics
    const categoryCount: { [key: string]: number } = {}
    const brandCount: { [key: string]: number } = {}
    const priceRanges: number[] = []
    
    // Analyze saved products
    products.forEach((product: Product) => {
      // Count categories
      product.categories?.forEach((cat: string) => {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1
      })
      
      // Count brands
      if (product.brand) {
        brandCount[product.brand] = (brandCount[product.brand] || 0) + 1
      }
      
      // Track prices
      if (product.price > 0) {
        priceRanges.push(product.price)
      }
    })
    
    // Analyze ML training data for more insights
    const interactionCount: { [key: string]: { [eventType: string]: number } } = {}
    mlData.forEach((event: MLTrainingEvent) => {
      const productId = event.product_id
      if (!interactionCount[productId]) {
        interactionCount[productId] = {}
      }
      interactionCount[productId][event.event_type] = 
        (interactionCount[productId][event.event_type] || 0) + 1
    })
    
    // Build category preferences
    const categoryPreferences = Object.entries(categoryCount)
      .map(([category, count]) => ({
        category,
        affinity: count,
        confidence: Math.min(count / 10, 1) // Simple confidence calculation
      }))
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, 10) // Top 10 categories
    
    // Build brand preferences
    const brandPreferences = Object.entries(brandCount)
      .map(([brand, count]) => ({
        brand,
        affinity: count,
        lastInteraction: new Date().toISOString()
      }))
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, 10) // Top 10 brands
    
    // Calculate price preferences
    const avgPrice = priceRanges.length > 0 
      ? priceRanges.reduce((a, b) => a + b, 0) / priceRanges.length 
      : 100
    const minPrice = priceRanges.length > 0 ? Math.min(...priceRanges) : 0
    const maxPrice = priceRanges.length > 0 ? Math.max(...priceRanges) : 1000
    
    // Build the export profile
    const profile = {
      userProfile: {
        categoryPreferences,
        brandPreferences,
        priceRange: {
          min: minPrice,
          max: maxPrice,
          sweetSpot: Math.round(avgPrice)
        },
        discoveryMode: settings?.discoveryPercentage || 0
      },
      insights: {
        totalInteractions: mlData.length,
        totalProducts: products.length,
        confidenceLevel: Math.min(mlData.length / 100, 1), // Simple confidence
        lastUpdated: new Date().toISOString()
      },
      recommendations: {
        categories: categoryPreferences.slice(0, 3).map(c => c.category),
        priceRange: `$${Math.round(minPrice)} - $${Math.round(maxPrice)}`,
        discoveryHint: settings?.discoveryPercentage > 0 
          ? 'User enjoys discovering new products' 
          : 'User prefers familiar categories'
      }
    }
    
    return profile
  }

  // Stub methods for compatibility
  async calculatePersonalizedScore(product: any, options?: any): Promise<number> {
    // In MCP mode, we don't calculate scores
    return 1.0
  }

  async getTopCategories(limit: number = 5): Promise<string[]> {
    const profile = await this.exportForClaudeDesktop()
    return profile.userProfile.categoryPreferences
      .slice(0, limit)
      .map((c: any) => c.category)
  }

  async getTopBrands(limit: number = 5): Promise<string[]> {
    const profile = await this.exportForClaudeDesktop()
    return profile.userProfile.brandPreferences
      .slice(0, limit)
      .map((b: any) => b.brand)
  }

  // Write methods - all no-op in MCP mode
  async trackUserInteraction(event: any): Promise<void> {
    // Write operation ignored - read-only mode
  }

  async updateUserProfile(updates: any): Promise<void> {
    // Write operation ignored - read-only mode
  }
}