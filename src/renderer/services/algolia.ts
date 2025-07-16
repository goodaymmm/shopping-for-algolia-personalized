import { Product } from '../types';
import { DEFAULT_PRODUCT_IMAGE } from '../utils/defaultImages';

// Algolia demo configuration (from requirements document)
interface AlgoliaConfig {
  demo: {
    appId: string;
    apiKey: string;
    indexName: string;
  };
}

export class AlgoliaService {
  private config: AlgoliaConfig = {
    demo: {
      appId: 'latency',
      apiKey: '6be0576ff61c053d5f9a3225e2a90f76',
      indexName: 'instant_search'
    }
  };

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
      );
      
      return response.ok;
    } catch (error) {
      console.error('Algolia connection test failed:', error);
      return false;
    }
  }

  async searchProducts(query: string, filters?: string): Promise<Product[]> {
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
            filters,
            hitsPerPage: 20,
            attributesToRetrieve: ['name', 'price', 'image', 'categories', 'url', 'objectID']
          })
        }
      );

      const data = await response.json();
      
      if (!data.hits) {
        return [];
      }

      return data.hits.map((hit: any) => ({
        id: hit.objectID,
        name: hit.name || 'Unknown Product',
        description: hit.description || '',
        price: hit.price || hit.salePrice || 0,
        image: hit.image || DEFAULT_PRODUCT_IMAGE,
        categories: hit.categories || [],
        url: hit.url || ''
      }));
    } catch (error) {
      console.error('Algolia search error:', error);
      return [];
    }
  }

  async getRandomProducts(count: number = 10): Promise<Product[]> {
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
            query: '',
            hitsPerPage: count,
            attributesToRetrieve: ['name', 'price', 'image', 'categories', 'url', 'objectID']
          })
        }
      );

      const data = await response.json();
      
      if (!data.hits) {
        return [];
      }

      return data.hits.map((hit: any) => ({
        id: hit.objectID,
        name: hit.name || 'Unknown Product',
        description: hit.description || '',
        price: hit.price || hit.salePrice || 0,
        image: hit.image || DEFAULT_PRODUCT_IMAGE,
        categories: hit.categories || [],
        url: hit.url || ''
      }));
    } catch (error) {
      console.error('Algolia random products error:', error);
      return [];
    }
  }
}