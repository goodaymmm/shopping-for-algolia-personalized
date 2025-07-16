import React, { useState } from 'react';
import { Heart, ExternalLink, ShoppingCart, Star, Tag, Edit2, Check, X, Trash2 } from 'lucide-react';
import { Product } from '../types';

interface EditableProductCardProps {
  product: Product & { customName?: string; tags?: string; savedAt?: Date };
  onUpdate: (productId: string, updates: { customName?: string; tags?: string }) => void;
  onRemove: (productId: string) => void;
  isDark?: boolean;
}

export const EditableProductCard: React.FC<EditableProductCardProps> = ({
  product,
  onUpdate,
  onRemove,
  isDark = false
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [customName, setCustomName] = useState(product.customName || product.name);
  const [tags, setTags] = useState(product.tags || '');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSaveName = () => {
    onUpdate(product.id, { customName });
    setIsEditingName(false);
  };

  const handleSaveTags = () => {
    onUpdate(product.id, { tags });
    setIsEditingTags(false);
  };

  const handleCancelName = () => {
    setCustomName(product.customName || product.name);
    setIsEditingName(false);
  };

  const handleCancelTags = () => {
    setTags(product.tags || '');
    setIsEditingTags(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const openProduct = async () => {
    if (product.url && product.url !== '#') {
      if (window.electronAPI?.openExternal) {
        await window.electronAPI.openExternal(product.url);
      } else {
        window.open(product.url, '_blank');
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  return (
    <div className={`rounded-lg border transition-all duration-200 group ${
      isDark 
        ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600' 
        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
    } shadow-sm hover:shadow-md`}>
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden rounded-t-lg">
        {!imageError ? (
          <>
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-full object-cover transition-all duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
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
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(product.id);
            }}
            className={`p-2 rounded-full transition-all ${
              isDark
                ? 'bg-gray-800/80 text-gray-300 hover:bg-red-500 hover:text-white'
                : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white'
            } backdrop-blur-sm shadow-lg`}
            title="Remove product"
          >
            <Trash2 size={16} />
          </button>

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
        {/* Editable Name */}
        <div className="mb-2">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className={`flex-1 px-2 py-1 rounded border ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancelName}
                className="p-1 rounded text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold line-clamp-2 flex-1 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {customName}
              </h3>
              <button
                onClick={() => setIsEditingName(true)}
                className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDark 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>
        
        {/* Original Name (if custom name is set) */}
        {product.customName && product.customName !== product.name && (
          <p className={`text-xs mb-2 ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            Original: {product.name}
          </p>
        )}

        {product.description && (
          <p className={`text-sm mb-3 line-clamp-2 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {product.description}
          </p>
        )}

        {/* Editable Tags */}
        <div className="mb-3">
          {isEditingTags ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Enter tags (comma separated)"
                className={`flex-1 px-2 py-1 rounded border text-sm ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                autoFocus
              />
              <button
                onClick={handleSaveTags}
                className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancelTags}
                className="p-1 rounded text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1 flex-1">
                {tags ? (
                  tags.split(',').map((tag, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                        isDark 
                          ? 'bg-purple-900/50 text-purple-200' 
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      <Tag size={10} />
                      {tag.trim()}
                    </span>
                  ))
                ) : (
                  <span className={`text-xs ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    No tags
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsEditingTags(true)}
                className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDark 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-500" fill="currentColor" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              4.5
            </span>
          </div>
          {product.savedAt && (
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Saved {formatDate(product.savedAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};