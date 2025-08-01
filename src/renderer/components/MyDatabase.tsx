import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, Grid, List, Trash2, Download, Package, Tag } from 'lucide-react';
import { Product } from '../types';
import { EditableProductCard } from './EditableProductCard';
import { InspirationProductCard } from './InspirationProductCard';
import { DEFAULT_PRODUCT_IMAGE } from '../utils/defaultImages';

interface MyDatabaseProps {
  onBack: () => void;
  isDark: boolean;
}


export const MyDatabase: React.FC<MyDatabaseProps> = ({ onBack, isDark }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showInspiration, setShowInspiration] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved products from database
  useEffect(() => {
    const loadSavedProducts = async () => {
      console.log('[DEBUG][MyDatabase] Loading saved products...');
      if (window.electronAPI?.getProducts) {
        setIsLoading(true);
        try {
          const savedProducts = await window.electronAPI.getProducts();
          console.log(`[DEBUG][MyDatabase] Loaded ${savedProducts.length} products from database`);
          
          // Convert database products to component format
          const formattedProducts = savedProducts.map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price,
            image: product.image_url || DEFAULT_PRODUCT_IMAGE,
            categories: product.category ? product.category.split(', ') : [],
            url: product.url || (product.algolia_data ? JSON.parse(product.algolia_data).url : null) || '#',
            savedAt: new Date(product.created_at),
            isInspiration: product.tags?.includes('inspiration') || false,
            inspirationReason: 'different_style' as const,
            customName: product.custom_name || product.name,
            tags: product.tags || '',
          }));
          setProducts(formattedProducts);
          console.log('[DEBUG][MyDatabase] Products formatted and set to state');
        } catch (error) {
          console.error('[DEBUG][MyDatabase] Failed to load saved products:', error);
          // Keep mock data on error
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('[DEBUG][MyDatabase] electronAPI.getProducts not available');
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

  const handleUpdateProduct = async (productId: string, updates: { customName?: string; tags?: string }) => {
    try {
      if (window.electronAPI?.updateProduct) {
        const result = await window.electronAPI.updateProduct(productId, updates);
        if (result.success) {
          setProducts(prev => prev.map(p => 
            p.id === productId 
              ? { ...p, ...updates }
              : p
          ));
        }
      }
    } catch (error) {
      console.error('Failed to update product:', error);
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
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3'
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
                  <EditableProductCard
                    product={product}
                    onUpdate={handleUpdateProduct}
                    onRemove={handleRemoveProduct}
                    isDark={isDark}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};