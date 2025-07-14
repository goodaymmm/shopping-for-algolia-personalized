import { useEffect, useCallback } from 'react'
import { useDatabaseStore } from '../store'
import { Product } from '../types'

export const useDatabase = () => {
  const {
    savedProducts,
    chatHistory,
    isLoading,
    loadProducts,
    saveProduct,
    removeProduct,
    loadChatHistory
  } = useDatabaseStore()

  // Load data on mount
  useEffect(() => {
    loadProducts()
    loadChatHistory()
  }, [loadProducts, loadChatHistory])

  const refreshData = useCallback(async () => {
    await Promise.all([loadProducts(), loadChatHistory()])
  }, [loadProducts, loadChatHistory])

  const saveProductWithNotification = useCallback(async (product: Product) => {
    try {
      await saveProduct(product)
      return { success: true, message: `Saved "${product.name}" to your database!` }
    } catch (error) {
      console.error('Failed to save product:', error)
      return { success: false, message: `Failed to save "${product.name}". Please try again.` }
    }
  }, [saveProduct])

  const removeProductWithConfirmation = useCallback(async (productId: string) => {
    const product = savedProducts.find(p => p.id === productId)
    const productName = product?.name || 'Unknown product'
    
    if (window.confirm(`Are you sure you want to remove "${productName}" from your database?`)) {
      try {
        await removeProduct(productId)
        return { success: true, message: `Removed "${productName}" from your database.` }
      } catch (error) {
        console.error('Failed to remove product:', error)
        return { success: false, message: `Failed to remove "${productName}". Please try again.` }
      }
    }
    
    return { success: false, message: 'Removal cancelled.' }
  }, [removeProduct, savedProducts])

  const getProductsByCategory = useCallback((category?: string) => {
    if (!category) return savedProducts
    
    return savedProducts.filter(product => 
      product.categories?.some(cat => 
        cat.toLowerCase().includes(category.toLowerCase())
      )
    )
  }, [savedProducts])

  const searchProducts = useCallback((query: string) => {
    const searchTerm = query.toLowerCase()
    
    return savedProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm) ||
      product.categories?.some(cat => cat.toLowerCase().includes(searchTerm))
    )
  }, [savedProducts])

  const getUniqueCategories = useCallback(() => {
    const categories = new Set<string>()
    savedProducts.forEach(product => {
      product.categories?.forEach(category => {
        categories.add(category)
      })
    })
    return Array.from(categories).sort()
  }, [savedProducts])

  const getProductStats = useCallback(() => {
    const totalProducts = savedProducts.length
    const categories = getUniqueCategories()
    const totalValue = savedProducts.reduce((sum, product) => sum + product.price, 0)
    const averagePrice = totalProducts > 0 ? totalValue / totalProducts : 0
    
    return {
      totalProducts,
      totalCategories: categories.length,
      totalValue,
      averagePrice,
      categories
    }
  }, [savedProducts, getUniqueCategories])

  return {
    // State
    savedProducts,
    chatHistory,
    isLoading,
    
    // Actions
    saveProduct: saveProductWithNotification,
    removeProduct: removeProductWithConfirmation,
    refreshData,
    
    // Utilities
    getProductsByCategory,
    searchProducts,
    getUniqueCategories,
    getProductStats
  }
}