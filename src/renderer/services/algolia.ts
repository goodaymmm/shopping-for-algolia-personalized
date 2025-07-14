import { Product } from '../types'

interface AlgoliaConfig {
  demo: {
    appId: string
    apiKey: string
    indexName: string
  }
}

export class AlgoliaService {
  private config: AlgoliaConfig = {
    demo: {
      appId: 'latency',
      apiKey: '6be0576ff61c053d5f9a3225e2a90f76',
      indexName: 'instant_search'
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `https://${this.config.demo.appId}-dsn.algolia.net/1/indexes/${this.config.demo.indexName}/query`,
        {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': this.config.demo.apiKey,
            'X-Algolia-Application-Id': this.config.demo.appId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: 'test', hitsPerPage: 1 })
        }
      )
      
      return response.ok
    } catch (error) {
      console.error('Algolia connection test failed:', error)
      return false
    }
  }

  async searchProducts(query: string, filters?: string, options?: {
    hitsPerPage?: number
    attributesToRetrieve?: string[]
  }): Promise<Product[]> {
    try {
      const response = await fetch(
        `https://${this.config.demo.appId}-dsn.algolia.net/1/indexes/${this.config.demo.indexName}/query`,
        {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': this.config.demo.apiKey,
            'X-Algolia-Application-Id': this.config.demo.appId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            filters: filters || '',
            hitsPerPage: options?.hitsPerPage || 20,
            attributesToRetrieve: options?.attributesToRetrieve || [
              'name', 'price', 'image', 'categories', 'url', 'objectID'
            ]
          })
        }
      )

      const data = await response.json()
      
      // Transform Algolia results to our Product interface
      const products: Product[] = (data.hits || []).map((hit: any) => ({
        id: hit.objectID,
        name: hit.name || 'Unknown Product',
        description: hit.description || '',
        price: hit.price || hit.salePrice || 0,
        image: hit.image || '/placeholder-image.jpg',
        categories: hit.categories || [],
        url: hit.url
      }))

      return products
    } catch (error) {
      console.error('Algolia search error:', error)
      return []
    }
  }

  async searchByCategory(category: string, options?: {
    hitsPerPage?: number
  }): Promise<Product[]> {
    return this.searchProducts('', `hierarchicalCategories.level0:"${category}"`, options)
  }

  async getPopularProducts(limit: number = 10): Promise<Product[]> {
    return this.searchProducts('', '', { hitsPerPage: limit })
  }

  async searchSimilar(productName: string, excludeId?: string): Promise<Product[]> {
    const filters = excludeId ? `NOT objectID:${excludeId}` : ''
    return this.searchProducts(productName, filters, { hitsPerPage: 8 })
  }
}

// Create singleton instance
export const algoliaService = new AlgoliaService()