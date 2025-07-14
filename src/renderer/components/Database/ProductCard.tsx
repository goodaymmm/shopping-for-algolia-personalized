import React from 'react'
import { Heart, ExternalLink, Tag } from 'lucide-react'
import { Product } from '../../types'

interface ProductCardProps {
  product: Product
  onSave?: (product: Product) => void
  onRemove?: (productId: string) => void
  isSaved?: boolean
  showActions?: boolean
  className?: string
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSave,
  onRemove,
  isSaved = false,
  showActions = true,
  className = ''
}) => {
  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSaved && onRemove) {
      onRemove(product.id)
    } else if (!isSaved && onSave) {
      onSave(product)
    }
  }

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (product.url) {
      window.open(product.url, '_blank')
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 ${className}`}>
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
        
        {showActions && (
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={handleSave}
              className={`p-1.5 rounded-full backdrop-blur-sm transition-all ${
                isSaved
                  ? 'bg-red-500/90 text-white hover:bg-red-600/90'
                  : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save product'}
            >
              <Heart size={14} fill={isSaved ? 'currentColor' : 'none'} />
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
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between mb-3">
          <p className="text-lg font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </p>
          
          <div className="flex items-center text-xs text-algolia-600">
            <span className="px-2 py-1 bg-algolia-50 rounded-full">
              Personalized
            </span>
          </div>
        </div>
        
        {product.categories && product.categories.length > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Tag size={12} className="text-gray-400" />
            <p className="text-xs text-gray-500 line-clamp-1">
              {product.categories.slice(0, 2).join(', ')}
            </p>
          </div>
        )}
        
        {product.description && (
          <p className="text-xs text-gray-600 line-clamp-2">
            {product.description}
          </p>
        )}
      </div>
    </div>
  )
}