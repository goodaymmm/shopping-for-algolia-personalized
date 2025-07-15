import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

interface DatabaseState {
  savedProducts: Product[];
  isLoading: boolean;
  error: string | null;
}

export const useDatabase = () => {
  const [state, setState] = useState<DatabaseState>({
    savedProducts: [],
    isLoading: false,
    error: null
  });

  // Load saved products from database or local storage
  const loadSavedProducts = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      if (window.electronAPI && window.electronAPI.getChatHistory) {
        // In Electron environment, get from database
        // For now, we'll use mock data since we don't have a specific "getSavedProducts" API
        const mockProducts: Product[] = [
          {
            id: 'saved-1',
            name: 'Premium Wireless Headphones',
            description: 'High-quality noise-canceling headphones',
            price: 299.99,
            image: 'https://via.placeholder.com/300x300?text=Headphones',
            categories: ['electronics', 'audio'],
            url: '#'
          },
          {
            id: 'saved-2',
            name: 'Smart Fitness Watch',
            description: 'Advanced fitness tracking with heart rate monitor',
            price: 199.99,
            image: 'https://via.placeholder.com/300x300?text=Watch',
            categories: ['electronics', 'fitness'],
            url: '#'
          }
        ];
        
        setState(prev => ({
          ...prev,
          savedProducts: mockProducts,
          isLoading: false
        }));
      } else {
        // In development environment, use localStorage
        const products = safeGetItem<Product[]>('savedProducts', []);
        
        setState(prev => ({
          ...prev,
          savedProducts: products,
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load saved products',
        isLoading: false
      }));
    }
  }, []);

  // Save a product
  const saveProduct = useCallback(async (product: Product) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (window.electronAPI && window.electronAPI.saveProduct) {
        // Save to Electron database
        const result = await window.electronAPI.saveProduct(product);
        
        if (result.success) {
          setState(prev => ({
            ...prev,
            savedProducts: [...prev.savedProducts.filter(p => p.id !== product.id), product],
            isLoading: false
          }));
          return true;
        } else {
          throw new Error(result.error || 'Failed to save product');
        }
      } else {
        // Save to localStorage in development
        setState(prev => {
          const updatedProducts = [...prev.savedProducts.filter(p => p.id !== product.id), product];
          safeSetItem('savedProducts', updatedProducts);
          
          return {
            ...prev,
            savedProducts: updatedProducts,
            isLoading: false
          };
        });
        return true;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save product',
        isLoading: false
      }));
      return false;
    }
  }, []);

  // Remove a product
  const removeProduct = useCallback(async (productId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (window.electronAPI) {
        // In Electron, we would call a remove API
        // For now, just remove from local state
        setState(prev => ({
          ...prev,
          savedProducts: prev.savedProducts.filter(p => p.id !== productId),
          isLoading: false
        }));
      } else {
        // Remove from localStorage in development
        setState(prev => {
          const updatedProducts = prev.savedProducts.filter(p => p.id !== productId);
          safeSetItem('savedProducts', updatedProducts);
          
          return {
            ...prev,
            savedProducts: updatedProducts,
            isLoading: false
          };
        });
      }
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to remove product',
        isLoading: false
      }));
      return false;
    }
  }, []);

  // Check if a product is saved
  const isProductSaved = useCallback((productId: string) => {
    return state.savedProducts.some(p => p.id === productId);
  }, [state.savedProducts]);

  // Get products by category
  const getProductsByCategory = useCallback((category: string) => {
    if (category === 'all') {
      return state.savedProducts;
    }
    return state.savedProducts.filter(p => 
      p.categories?.includes(category)
    );
  }, [state.savedProducts]);

  // Search products
  const searchProducts = useCallback((query: string) => {
    if (!query.trim()) {
      return state.savedProducts;
    }
    
    const lowercaseQuery = query.toLowerCase();
    return state.savedProducts.filter(p => 
      p.name.toLowerCase().includes(lowercaseQuery) ||
      p.description?.toLowerCase().includes(lowercaseQuery) ||
      p.categories?.some(cat => cat.toLowerCase().includes(lowercaseQuery))
    );
  }, [state.savedProducts]);

  // Get statistics
  const getStatistics = useCallback(() => {
    const total = state.savedProducts.length;
    const categories = new Set(state.savedProducts.flatMap(p => p.categories || []));
    const avgPrice = total > 0 
      ? state.savedProducts.reduce((sum, p) => sum + p.price, 0) / total 
      : 0;

    return {
      totalProducts: total,
      totalCategories: categories.size,
      averagePrice: avgPrice,
      categoryBreakdown: Array.from(categories).map(cat => ({
        category: cat,
        count: state.savedProducts.filter(p => p.categories?.includes(cat)).length
      }))
    };
  }, [state.savedProducts]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load products on hook initialization
  useEffect(() => {
    loadSavedProducts();
  }, [loadSavedProducts]);

  return {
    // State
    savedProducts: state.savedProducts,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    saveProduct,
    removeProduct,
    loadSavedProducts,
    clearError,
    
    // Utilities
    isProductSaved,
    getProductsByCategory,
    searchProducts,
    getStatistics
  };
};