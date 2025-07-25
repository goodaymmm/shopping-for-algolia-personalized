import { Product, ProductWithContext, DiscoveryPercentage } from '../types';

export class OutlierMixer {
  constructor() {
    // No longer using direct Algolia service
  }

  async mixResults(
    personalizedResults: Product[],
    outlierPercentage: DiscoveryPercentage,
    originalQuery?: string
  ): Promise<ProductWithContext[]> {
    
    // Map products to include display context based on isDiscovery flag
    return personalizedResults.map(product => ({
      product,
      displayType: product.isDiscovery ? 'inspiration' as const : 'personalized' as const,
      inspirationReason: product.isDiscovery 
        ? this.mapDiscoveryReasonToInspirationReason(product.discoveryReason)
        : undefined
    }));
  }

  private mapDiscoveryReasonToInspirationReason(
    discoveryReason?: 'different_category' | 'price_range' | 'trending_brand'
  ): 'trending' | 'different_style' | 'visual_appeal' {
    switch (discoveryReason) {
      case 'different_category':
        return 'different_style';
      case 'price_range':
        return 'visual_appeal';
      case 'trending_brand':
        return 'trending';
      default:
        return 'different_style';
    }
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