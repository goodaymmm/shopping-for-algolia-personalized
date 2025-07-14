import React from 'react'
import { Sparkles, Eye, Heart, ExternalLink, Tag } from 'lucide-react'
import { Product } from '../../types'

interface InspirationProductCardProps {
  product: Product
  inspirationReason: 'trending' | 'different_style' | 'visual_appeal'
  onSave?: (product: Product) => void
  onView?: (product: Product) => void
  className?: string
}

export const InspirationProductCard: React.FC<InspirationProductCardProps> = ({
  product,
  inspirationReason,
  onSave,
  onView,
  className = ''
}) => {
  const getInspirationConfig = () => {
    switch (inspirationReason) {
      case 'trending':
        return {
          label: 'Trending Now',
          icon: '🔥',
          color: 'bg-orange-500',
          bgColor: 'bg-gradient-to-br from-orange-50 to-red-50',
          borderColor: 'border-orange-200'
        }
      case 'different_style':
        return {
          label: 'Different Style',
          icon: '✨',
          color: 'bg-purple-500',
          bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
          borderColor: 'border-purple-200'
        }
      case 'visual_appeal':
        return {
          label: 'Visual Inspiration',
          icon: '👁️',
          color: 'bg-blue-500',
          bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
          borderColor: 'border-blue-200'
        }
      default:
        return {
          label: 'Discovery',
          icon: '💡',
          color: 'bg-purple-500',
          bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
          borderColor: 'border-purple-200'
        }
    }
  }

  const config = getInspirationConfig()

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSave?.(product)
  }

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation()
    onView?.(product)
  }

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (product.url) {
      window.open(product.url, '_blank')
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer border-2 ${config.borderColor} ${className}`}>
      <div className="relative">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-48 object-cover rounded-t-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/placeholder-image.jpg'
          }}
        />
        
        {/* Inspiration badges */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 ${config.color} text-white text-xs rounded-full shadow-sm`}>
            <Sparkles size={12} />
            {config.label}
          </span>
        </div>
        
        <div className="absolute top-2 right-2 text-lg drop-shadow-sm">
          {config.icon}
        </div>

        {/* Action buttons */}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleSave}
            className="p-1.5 rounded-full bg-white/90 text-gray-600 hover:bg-white hover:text-red-500 backdrop-blur-sm transition-all"
            title="Save to my database"
          >
            <Heart size={14} />
          </button>
          
          {product.url && (
            <button
              onClick={handleExternalLink}
              className="p-1.5 rounded-full bg-white/90 text-gray-600 hover:bg-white hover:text-algolia-600 backdrop-blur-sm transition-all"
              title="Open product page"
            >
              <ExternalLink size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className={`p-4 ${config.bgColor}`}>
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between mb-3">
          <p className="text-lg font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </p>
        </div>
        
        {product.categories && product.categories.length > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Tag size={12} className="text-gray-400" />
            <p className="text-xs text-gray-500 line-clamp-1">
              {product.categories.slice(0, 2).join(', ')}
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-purple-600 font-medium flex items-center gap-1">
            <Sparkles size={12} />
            Inspiration discovery
          </span>
          
          {onView && (
            <button
              onClick={handleView}
              className="flex items-center gap-1 px-2 py-1 bg-white/80 text-purple-700 text-xs rounded-md hover:bg-white transition-colors"
            >
              <Eye size={12} />
              View
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-2 pt-2 border-t border-gray-200/50">
          <p className="text-xs text-gray-500 italic">
            💡 For inspiration only - not part of learning algorithm
          </p>
        </div>
      </div>
    </div>
  )
}