import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, Grid, List, Trash2, Download, Package, Tag } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { InspirationProductCard } from './InspirationProductCard';

interface MyDatabaseProps {
  onBack: () => void;
  isDark: boolean;
}

// Mock saved products data
const mockSavedProducts: (Product & { savedAt: Date; isInspiration?: boolean; inspirationReason?: 'trending' | 'different_style' | 'visual_appeal' })[] = [
  {
    id: '1',
    name: 'Premium Bluetooth Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 299.99,
    image: 'https://via.placeholder.com/300x300?text=Headphones',
    categories: ['electronics', 'audio'],
    url: '#',
    savedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Vintage Leather Jacket',
    description: 'Classic brown leather jacket with vintage styling',
    price: 189.99,
    image: 'https://via.placeholder.com/300x300?text=Jacket',
    categories: ['fashion', 'outerwear'],
    url: '#',
    savedAt: new Date('2024-01-14'),
    isInspiration: true,
    inspirationReason: 'different_style' as const,
  },
  {
    id: '3',
    name: 'Smart Watch Series 9',
    description: 'Advanced fitness tracking and smart features',
    price: 399.99,
    image: 'https://via.placeholder.com/300x300?text=Watch',
    categories: ['electronics', 'wearables'],
    url: '#',
    savedAt: new Date('2024-01-13'),
  },
  {
    id: '4',
    name: 'Artisan Coffee Mug Set',
    description: 'Handcrafted ceramic mugs with unique patterns',
    price: 45.99,
    image: 'https://via.placeholder.com/300x300?text=Mugs',
    categories: ['home', 'kitchen'],
    url: '#',
    savedAt: new Date('2024-01-12'),
    isInspiration: true,
    inspirationReason: 'visual_appeal' as const,
  },
  {
    id: '5',
    name: 'Gaming Mechanical Keyboard',
    description: 'RGB backlit mechanical keyboard for gaming',
    price: 129.99,
    image: 'https://via.placeholder.com/300x300?text=Keyboard',
    categories: ['electronics', 'gaming'],
    url: '#',
    savedAt: new Date('2024-01-11'),
  },
];

export const MyDatabase: React.FC<MyDatabaseProps> = ({ onBack, isDark }) => {
  const [products, setProducts] = useState(mockSavedProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showInspiration, setShowInspiration] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved products from database
  useEffect(() => {
    const loadSavedProducts = async () => {
      if (window.electronAPI?.getProducts) {
        setIsLoading(true);
        try {
          const savedProducts = await window.electronAPI.getProducts();
          // Convert database products to component format
          const formattedProducts = savedProducts.map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price,
            image: product.image_url || 'https://via.placeholder.com/300x300?text=No+Image',
            categories: product.category ? product.category.split(', ') : [],
            url: product.url || '#',
            savedAt: new Date(product.created_at),
            isInspiration: product.tags?.includes('inspiration') || false,
            inspirationReason: 'different_style' as const,
          }));
          setProducts(formattedProducts);
        } catch (error) {
          console.error('Failed to load saved products:', error);
          // Keep mock data on error
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadSavedProducts();
  }, []);

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      product.categories?.includes(selectedCategory);
    
    const matchesInspiration = showInspiration || !product.isInspiration;
    
    return matchesSearch && matchesCategory && matchesInspiration;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(
    products.flatMap(p => p.categories || [])
  ))];

  // Statistics
  const stats = {
    total: products.length,
    regular: products.filter(p => !p.isInspiration).length,
    inspiration: products.filter(p => p.isInspiration).length,
    categories: new Set(products.flatMap(p => p.categories || [])).size,
  };

  const handleRemoveProduct = async (productId: string) => {
    try {
      if (window.electronAPI?.removeProduct) {
        await window.electronAPI.removeProduct(productId);
      }
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Failed to remove product:', error);
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(products, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-saved-products.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`border-b p-4 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-semibold">My Product Database</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportData}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isDark 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-2">
              <Package size={16} className="text-blue-500" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-green-500" />
              <span className="text-sm font-medium">Regular</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.regular}</p>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-purple-500" />
              <span className="text-sm font-medium">Inspiration</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.inspiration}</p>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-orange-500" />
              <span className="text-sm font-medium">Categories</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.categories}</p>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={18} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search saved products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500'
              } focus:outline-none`}
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-3 py-2 rounded-lg border transition-colors ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
            } focus:outline-none`}
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>

        {/* View Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showInspiration}
                onChange={(e) => setShowInspiration(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Show inspiration items</span>
            </label>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? isDark ? 'bg-purple-600 text-white' : 'bg-purple-600 text-white'
                  : isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? isDark ? 'bg-purple-600 text-white' : 'bg-purple-600 text-white'
                  : isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid/List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-lg mb-2">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No products found</p>
            <p className="text-sm">
              {searchQuery || selectedCategory !== 'all' || !showInspiration
                ? 'Try adjusting your search or filter criteria'
                : 'Start saving products to see them here'
              }
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-4'
          }>
            {filteredProducts.map((product) => (
              <div key={product.id} className="relative">
                {product.isInspiration ? (
                  <InspirationProductCard
                    product={product}
                    inspirationReason={product.inspirationReason || 'different_style'}
                    isDark={isDark}
                  />
                ) : (
                  <ProductCard
                    product={product}
                    onRemove={handleRemoveProduct}
                    showRemoveButton={true}
                    showSaveButton={false}
                    isDark={isDark}
                  />
                )}
                
                {/* Saved Date */}
                <div className={`absolute bottom-2 right-2 px-2 py-1 rounded text-xs ${
                  isDark ? 'bg-gray-800/80 text-gray-300' : 'bg-white/80 text-gray-600'
                } backdrop-blur-sm`}>
                  Saved {formatDate(product.savedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};