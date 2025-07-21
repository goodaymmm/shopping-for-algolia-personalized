import React, { useState } from 'react';
import { Sparkles, Eye, TrendingUp, Palette, Heart, ExternalLink } from 'lucide-react';
import { Product } from '../types';

type InspirationReason = 'trending' | 'different_style' | 'visual_appeal';

interface InspirationProductCardProps {
  product: Product;
  inspirationReason: InspirationReason;
  onSelect?: (product: Product) => void;
  onSave?: (product: Product) => void;
  isDark?: boolean;
}

export const InspirationProductCard: React.FC<InspirationProductCardProps> = ({
  product,
  inspirationReason,
  onSelect,
  onSave,
  isDark = false
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getInspirationConfig = () => {
    switch (inspirationReason) {
      case 'trending':
        return {
          label: 'Trending Now',
          icon: TrendingUp,
          emoji: '🔥',
          color: 'red',
          description: 'Popular choice'
        };
      case 'different_style':
        return {
          label: 'Different Style',
          icon: Sparkles,
          emoji: '✨',
          color: 'purple',
          description: 'Explore new styles'
        };
      case 'visual_appeal':
        return {
          label: 'Visual Inspiration',
          icon: Palette,
          emoji: '🎨',
          color: 'blue',
          description: 'Visually striking'
        };
      default:
        return {
          label: 'Discovery',
          icon: Eye,
          emoji: '💡',
          color: 'purple',
          description: 'Discover something new'
        };
    }
  };

  const config = getInspirationConfig();
  const IconComponent = config.icon;

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(product);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave) {
      onSave(product);
    }
  };

  const openProduct = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return {
          border: 'border-red-300',
          bg: 'bg-red-50',
          badge: 'bg-red-500 text-white',
          badgeDark: 'bg-red-600 text-red-100',
          label: 'text-red-700',
          labelDark: 'text-red-300',
          ring: 'ring-red-200',
          ringDark: 'ring-red-800'
        };
      case 'blue':
        return {
          border: 'border-blue-300',
          bg: 'bg-blue-50',
          badge: 'bg-blue-500 text-white',
          badgeDark: 'bg-blue-600 text-blue-100',
          label: 'text-blue-700',
          labelDark: 'text-blue-300',
          ring: 'ring-blue-200',
          ringDark: 'ring-blue-800'
        };
      case 'purple':
      default:
        return {
          border: 'border-purple-300',
          bg: 'bg-purple-50',
          badge: 'bg-purple-500 text-white',
          badgeDark: 'bg-purple-600 text-purple-100',
          label: 'text-purple-700',
          labelDark: 'text-purple-300',
          ring: 'ring-purple-200',
          ringDark: 'ring-purple-800'
        };
    }
  };

  const colors = getColorClasses(config.color);

  return (
    <div 
      className={`rounded-lg border-2 transition-all duration-200 cursor-pointer group relative ${
        isDark 
          ? `bg-gray-800 ${colors.border} hover:bg-gray-750 hover:${colors.ringDark} hover:ring-2` 
          : `${colors.bg} ${colors.border} hover:bg-white hover:${colors.ring} hover:ring-2`
      } shadow-sm hover:shadow-lg transform hover:-translate-y-1`}
      onClick={handleSelect}
    >
      {/* Inspiration Label */}
      <div className="absolute -top-2 left-4 z-10">
        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium shadow-lg ${
          isDark ? colors.badgeDark : colors.badge
        }`}>
          <IconComponent size={12} />
          <span>{config.label}</span>
        </div>
      </div>

      {/* Inspiration Emoji */}
      <div className="absolute -top-1 -right-1 z-10">
        <div className="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-lg">
          {config.emoji}
        </div>
      </div>

      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden rounded-t-lg mt-3">
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
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                  `border-${config.color}-600`
                }`}></div>
              </div>
            )}
          </>
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
          }`}>
            <div className="text-center">
              <Sparkles size={24} className="mx-auto mb-1 opacity-50" />
              <p className="text-xs">Image not available</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSave && (
            <button
              onClick={handleSave}
              className={`p-2 rounded-full transition-all ${
                isDark
                  ? 'bg-gray-800/80 text-gray-300 hover:bg-purple-500 hover:text-white'
                  : 'bg-white/80 text-gray-600 hover:bg-purple-500 hover:text-white'
              } backdrop-blur-sm shadow-lg`}
              title="Save for inspiration"
            >
              <Heart size={16} />
            </button>
          )}

          {product.url && product.url !== '#' && (
            <button
              onClick={openProduct}
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
      <div className="p-3">
        <h3 className={`font-semibold text-sm mb-1.5 line-clamp-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {product.name}
        </h3>
        
        {product.description && (
          <p className={`text-xs mb-2 line-clamp-2 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {product.description}
          </p>
        )}

        {/* Categories */}
        {product.categories && product.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.categories.slice(0, 2).map((category) => (
              <span
                key={category}
                className={`px-2 py-1 text-xs rounded-full ${
                  isDark 
                    ? `${colors.labelDark} bg-gray-700` 
                    : `${colors.label} bg-white`
                }`}
              >
                {category}
              </span>
            ))}
          </div>
        )}

        {/* Inspiration Footer */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1 text-xs font-medium ${
            isDark ? colors.labelDark : colors.label
          }`}>
            <Sparkles size={12} />
            <span>{config.description}</span>
          </div>
          
          {onSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelect();
              }}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-colors ${
                isDark 
                  ? `${colors.labelDark} hover:bg-gray-700` 
                  : `${colors.label} hover:bg-white`
              }`}
            >
              <Eye size={12} />
              <span>Explore</span>
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <div className={`mt-3 pt-3 border-t text-xs ${
          isDark 
            ? 'border-gray-700 text-gray-500' 
            : 'border-gray-200 text-gray-400'
        }`}>
          💡 Discovery item - not used for learning preferences
        </div>
      </div>
    </div>
  );
};