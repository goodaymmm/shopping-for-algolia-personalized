import React, { useState, useEffect, useRef } from 'react';
import { Heart, ExternalLink, ShoppingCart, Star, Tag, Sparkles } from 'lucide-react';
import { Product, ProductWithContext, ProductDisplayType } from '../types';

interface ProductCardProps {
  product: Product | ProductWithContext;
  onSave?: (product: Product) => void;
  onRemove?: (productId: string) => void;
  isSaved?: boolean;
  showSaveButton?: boolean;
  showRemoveButton?: boolean;
  isDark?: boolean;
  enableMLTracking?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSave,
  onRemove,
  isSaved = false,
  showSaveButton = true,
  showRemoveButton = false,
  isDark = false,
  enableMLTracking = true
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const viewStartTime = useRef<number>(Date.now());
  const hasTrackedView = useRef<boolean>(false);
  
  // Extract product data and display info
  const productData = 'product' in product ? product.product : product;
  const displayType: ProductDisplayType = 'displayType' in product ? product.displayType : 'personalized';
  const inspirationReason = 'inspirationReason' in product ? product.inspirationReason : undefined;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('ProductCard handleSave clicked for product:', productData);
    
    if (enableMLTracking && window.electronAPI?.saveProductWithTracking) {
      // Use ML-enabled save for personalization learning
      try {
        const result = await window.electronAPI.saveProductWithTracking(productData);
        if (result.success) {
          console.log('Product saved with ML tracking');
        }
      } catch (error) {
        console.error('Failed to save product with tracking:', error);
      }
    }
    
    if (onSave) {
      console.log('Calling onSave callback...');
      onSave(productData);
    } else {
      console.warn('onSave callback is not provided');
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (enableMLTracking && window.electronAPI?.trackProductRemove) {
      // Track removal for ML learning
      try {
        await window.electronAPI.trackProductRemove(productData.id);
      } catch (error) {
        console.error('Failed to track product removal:', error);
      }
    }
    
    if (onRemove) {
      onRemove(productData.id);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const openProduct = async () => {
    if (productData.url && productData.url !== '#') {
      // Track click for ML learning
      if (enableMLTracking && window.electronAPI?.trackProductClick) {
        try {
          await window.electronAPI.trackProductClick(productData.id, productData.url);
        } catch (error) {
          console.error('Failed to track product click:', error);
        }
      }
      
      if (window.electronAPI?.openExternal) {
        await window.electronAPI.openExternal(productData.url);
      } else {
        window.open(productData.url, '_blank');
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };
  
  // Track view time for ML learning
  useEffect(() => {
    if (!enableMLTracking || hasTrackedView.current) return;
    
    const trackView = async () => {
      const timeSpent = Date.now() - viewStartTime.current;
      
      if (timeSpent > 1000 && window.electronAPI?.trackProductView) { // Only track if viewed for >1s
        try {
          await window.electronAPI.trackProductView(productData.id, Math.floor(timeSpent / 1000));
          hasTrackedView.current = true;
        } catch (error) {
          console.error('Failed to track product view:', error);
        }
      }
    };
    
    // Track view after component unmounts or after 10 seconds
    const timer = setTimeout(trackView, 10000);
    
    return () => {
      clearTimeout(timer);
      if (!hasTrackedView.current) {
        trackView();
      }
    };
  }, [productData.id, enableMLTracking]);

  return (
    <div 
      className={`rounded-lg border transition-all duration-200 cursor-pointer group ${
        isDark 
          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600' 
          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      } shadow-sm hover:shadow-md`}
      onClick={openProduct}
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden rounded-t-lg">
        {!imageError ? (
          <>
            <img
              src={productData.image}
              alt={productData.name}
              className={`w-full h-full object-cover transition-all duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } group-hover:scale-105`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {!imageLoaded && (
              <div className={`absolute inset-0 flex items-center justify-center ${
                isDark ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            )}
          </>
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
          }`}>
            <div className="text-center">
              <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Image not available</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {showSaveButton && (
            <button
              onClick={handleSave}
              className={`p-2 rounded-full transition-all ${
                isSaved
                  ? 'bg-red-500 text-white'
                  : isDark
                    ? 'bg-gray-800/80 text-gray-300 hover:bg-red-500 hover:text-white'
                    : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white'
              } backdrop-blur-sm shadow-lg`}
              title={isSaved ? 'Remove from saved' : 'Save product'}
            >
              <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          )}
          
          {showRemoveButton && (
            <button
              onClick={handleRemove}
              className={`p-2 rounded-full transition-all ${
                isDark
                  ? 'bg-gray-800/80 text-gray-300 hover:bg-red-500 hover:text-white'
                  : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white'
              } backdrop-blur-sm shadow-lg`}
              title="Remove product"
            >
              <Heart size={16} fill="currentColor" />
            </button>
          )}

          {productData.url && productData.url !== '#' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openProduct();
              }}
              className={`p-2 rounded-full transition-all ${
                isDark
                  ? 'bg-gray-800/80 text-gray-300 hover:bg-blue-500 hover:text-white'
                  : 'bg-white/80 text-gray-600 hover:bg-blue-500 hover:text-white'
              } backdrop-blur-sm shadow-lg`}
              title="Open product page"
            >
              <ExternalLink size={16} />
            </button>
          )}
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-2 left-2">
          <span className={`px-2 py-1 rounded-full text-sm font-bold ${
            isDark 
              ? 'bg-green-900/80 text-green-200' 
              : 'bg-green-100/80 text-green-800'
          } backdrop-blur-sm`}>
            {formatPrice(productData.price)}
          </span>
        </div>
        
        {/* Display Type Badge */}
        {displayType === 'inspiration' && (
          <div className="absolute top-2 left-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              isDark 
                ? 'bg-purple-900/80 text-purple-200' 
                : 'bg-purple-100/80 text-purple-700'
            } backdrop-blur-sm`}>
              <Sparkles size={12} />
              {inspirationReason === 'trending' && 'Trending'}
              {inspirationReason === 'different_style' && 'New Style'}
              {inspirationReason === 'visual_appeal' && 'Featured'}
              {!inspirationReason && 'Inspiration'}
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className={`font-semibold mb-2 line-clamp-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {productData.name}
        </h3>
        
        {productData.description && (
          <p className={`text-sm mb-3 line-clamp-2 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {productData.description}
          </p>
        )}

        {/* Categories */}
        {productData.categories && productData.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {productData.categories.slice(0, 3).map((category) => (
              <span
                key={category}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                  isDark 
                    ? 'bg-gray-700/50 text-gray-300' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Tag size={10} />
                {category}
              </span>
            ))}
            {productData.categories.length > 3 && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                +{productData.categories.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Source Index Badge */}
        {productData.sourceIndex && (
          <div className="mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isDark 
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50' 
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <Tag size={10} />
              {productData.sourceIndex === 'bestbuy' ? 'Electronics' : 
               productData.sourceIndex === 'instant_search' ? 'General' : 
               productData.sourceIndex}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-500" fill="currentColor" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              4.5
            </span>
          </div>
          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Featured
          </div>
        </div>
      </div>
    </div>
  );
};

// CSS for line clamping (add to global styles if not already present)
const styles = `
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
`;