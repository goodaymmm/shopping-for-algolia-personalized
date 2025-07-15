import React, { useState } from 'react';
import { Heart, ExternalLink, ShoppingCart, Star, Tag } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onSave?: (product: Product) => void;
  onRemove?: (productId: string) => void;
  isSaved?: boolean;
  showSaveButton?: boolean;
  showRemoveButton?: boolean;
  isDark?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSave,
  onRemove,
  isSaved = false,
  showSaveButton = true,
  showRemoveButton = false,
  isDark = false
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave) {
      onSave(product);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(product.id);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const openProduct = () => {
    if (product.url && product.url !== '#') {
      window.open(product.url, '_blank');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

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
              src={product.image}
              alt={product.name}
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

          {product.url && product.url !== '#' && (
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
            {formatPrice(product.price)}
          </span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className={`font-semibold mb-2 line-clamp-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {product.name}
        </h3>
        
        {product.description && (
          <p className={`text-sm mb-3 line-clamp-2 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {product.description}
          </p>
        )}

        {/* Categories */}
        {product.categories && product.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.categories.slice(0, 3).map((category) => (
              <span
                key={category}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                  isDark 
                    ? 'bg-purple-900/50 text-purple-200' 
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                <Tag size={10} />
                {category}
              </span>
            ))}
            {product.categories.length > 3 && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                +{product.categories.length - 3} more
              </span>
            )}
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