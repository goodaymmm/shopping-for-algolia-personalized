import { Product, ProductWithContext, DiscoveryPercentage } from '../types';
import { MOCK_PRODUCT_IMAGES } from '../utils/defaultImages';

export class OutlierMixer {
  constructor() {
    // No longer using direct Algolia service
  }

  async mixResults(
    personalizedResults: Product[],
    outlierPercentage: DiscoveryPercentage,
    originalQuery?: string
  ): Promise<ProductWithContext[]> {
    
    // If no discovery mode, return all as personalized
    if (outlierPercentage === 0) {
      return personalizedResults.map(product => ({
        product,
        displayType: 'personalized' as const
      }));
    }

    const totalResults = personalizedResults.length;
    const outlierCount = Math.floor(totalResults * (outlierPercentage / 100));
    const personalizedCount = totalResults - outlierCount;

    // Get main personalized results
    const mainResults: ProductWithContext[] = personalizedResults
      .slice(0, personalizedCount)
      .map(product => ({
        product,
        displayType: 'personalized' as const
      }));

    // Get outlier products for discovery
    const outliers = await this.getVisuallyAttractiveOutliers(outlierCount, originalQuery);

    // Interleave results to create good distribution
    return this.interleaveResults(mainResults, outliers);
  }

  private async getVisuallyAttractiveOutliers(
    count: number, 
    originalQuery?: string
  ): Promise<ProductWithContext[]> {
    try {
      // Generate mock diverse products for inspiration
      const diverseProducts = this.generateMockDiverseProducts(count * 2, originalQuery);

      // If we got products, select random ones for variety
      const shuffled = this.shuffleArray([...diverseProducts]);
      const selected = shuffled.slice(0, count * 2); // Get extra for filtering

      // Filter to avoid exact duplicates and create context
      return selected
        .slice(0, count)
        .map(product => ({
          product,
          displayType: 'inspiration' as const,
          inspirationReason: this.determineInspirationReason(product, originalQuery)
        }));
        
    } catch (error) {
      console.error('Failed to get outlier products:', error);
      return [];
    }
  }

  private generateMockDiverseProducts(count: number, originalQuery?: string): Product[] {
    const mockProducts: Product[] = [
      {
        id: 'diverse-1',
        name: 'Trendy Wireless Earbuds',
        description: 'Latest technology with premium sound quality',
        price: 129.99,
        image: MOCK_PRODUCT_IMAGES.headphones,
        categories: ['electronics', 'audio', 'trending'],
        url: '#'
      },
      {
        id: 'diverse-2', 
        name: 'Eco-Friendly Water Bottle',
        description: 'Sustainable stainless steel with unique design',
        price: 24.99,
        image: MOCK_PRODUCT_IMAGES.generic,
        categories: ['lifestyle', 'eco-friendly', 'unique'],
        url: '#'
      },
      {
        id: 'diverse-3',
        name: 'Smart Fitness Tracker',
        description: 'Advanced health monitoring with style',
        price: 199.99,
        image: MOCK_PRODUCT_IMAGES.watch,
        categories: ['electronics', 'fitness', 'smart'],
        url: '#'
      },
      {
        id: 'diverse-4',
        name: 'Artisan Coffee Beans',
        description: 'Premium single-origin specialty roast',
        price: 18.99,
        image: MOCK_PRODUCT_IMAGES.generic,
        categories: ['food', 'premium', 'artisan'],
        url: '#'
      },
      {
        id: 'diverse-5',
        name: 'Minimalist Desk Lamp',
        description: 'Modern LED lighting with adjustable brightness',
        price: 79.99,
        image: MOCK_PRODUCT_IMAGES.lamp,
        categories: ['home', 'lighting', 'modern'],
        url: '#'
      },
      {
        id: 'diverse-6',
        name: 'Vintage Leather Bag',
        description: 'Handcrafted with timeless design',
        price: 149.99,
        image: MOCK_PRODUCT_IMAGES.generic,
        categories: ['fashion', 'accessories', 'vintage'],
        url: '#'
      }
    ];

    // Shuffle and return requested count
    const shuffled = this.shuffleArray([...mockProducts]);
    return shuffled.slice(0, count);
  }

  private determineInspirationReason(
    product: Product, 
    originalQuery?: string
  ): 'trending' | 'different_style' | 'visual_appeal' {
    // Simple heuristic based on product characteristics
    if (product.price && product.price > 500) {
      return 'visual_appeal'; // Higher-priced items for visual appeal
    }
    
    if (originalQuery) {
      const queryWords = originalQuery.toLowerCase().split(' ');
      const hasCommonWords = product.name.toLowerCase().split(' ')
        .some(word => queryWords.includes(word));
      
      if (!hasCommonWords) {
        return 'different_style'; // Different from search terms
      }
    }
    
    return 'trending'; // Default to trending
  }

  private interleaveResults(
    mainResults: ProductWithContext[],
    outliers: ProductWithContext[]
  ): ProductWithContext[] {
    const interleaved: ProductWithContext[] = [];
    const totalResults = mainResults.length + outliers.length;
    
    let mainIndex = 0;
    let outlierIndex = 0;
    
    for (let i = 0; i < totalResults; i++) {
      // Distribute outliers evenly throughout the results
      const shouldAddOutlier = outlierIndex < outliers.length && 
        (mainIndex >= mainResults.length || 
         (i + 1) * outliers.length >= (outlierIndex + 1) * totalResults);
      
      if (shouldAddOutlier) {
        interleaved.push(outliers[outlierIndex]);
        outlierIndex++;
      } else if (mainIndex < mainResults.length) {
        interleaved.push(mainResults[mainIndex]);
        mainIndex++;
      }
    }
    
    return interleaved;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Track outlier interactions (separate from ML learning)
  async trackOutlierInteraction(
    productId: string,
    interactionType: 'view' | 'click',
    inspirationReason?: string
  ): Promise<void> {
    try {
      // This will be tracked separately from ML data
      if (window.electronAPI) {
        // We'll store this in the outlier_interactions table
        // For now, we can track it through the regular system but mark it as outlier
        console.log('Outlier interaction tracked:', {
          productId,
          interactionType,
          inspirationReason,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Failed to track outlier interaction:', error);
    }
  }

  // Get statistics about discovery interactions (for analytics)
  getDiscoveryStats(): {
    totalOutlierViews: number;
    totalOutlierClicks: number;
    preferredInspirationTypes: Record<string, number>;
  } {
    // This would typically query the database for outlier_interactions
    // For now, return empty stats
    return {
      totalOutlierViews: 0,
      totalOutlierClicks: 0,
      preferredInspirationTypes: {}
    };
  }
}