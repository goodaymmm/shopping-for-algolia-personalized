import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, ShoppingBag, Sparkles, Trash2, Package } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { ClearProductsDialog } from './ClearProductsDialog';
import { Product, ProductWithContext } from '../types';

interface ProductSidebarProps {
  products: (Product | ProductWithContext)[];
  isOpen: boolean;
  onToggle: () => void;
  onProductSave?: (product: Product) => Promise<{ success: boolean }>;
  onProductRemove?: (productId: string) => Promise<{ success: boolean }>;
  onClearProducts: () => void;
  savedProductIds?: Set<string>;
  isDark: boolean;
}

export const ProductSidebar: React.FC<ProductSidebarProps> = ({
  products,
  isOpen,
  onToggle,
  onProductSave,
  onProductRemove,
  onClearProducts,
  savedProductIds = new Set(),
  isDark
}) => {
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Separate personalized and inspiration products
  const personalizedProducts = products.filter(p => 
    !('displayType' in p) || p.displayType === 'personalized'
  );
  const inspirationProducts = products.filter(p => 
    'displayType' in p && p.displayType === 'inspiration'
  );

  const totalCount = products.length;

  const handleClearClick = () => {
    setShowClearDialog(true);
  };

  const handleClearConfirm = () => {
    onClearProducts();
    setShowClearDialog(false);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-l-xl shadow-lg transition-all duration-300 border-l border-t border-b ${
          isDark
            ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
        } ${isOpen ? 'right-[900px]' : 'right-4'}`}
      >
        {isOpen ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <div className="flex items-center gap-2">
            <ChevronLeft className="w-5 h-5" />
            {totalCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-orange-500 text-white rounded-full">
                {totalCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[900px] z-30 transform transition-transform duration-300 ease-in-out border-l ${
          isDark
            ? 'bg-gray-900 border-gray-700'
            : 'bg-white border-gray-200'
        } ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className={`p-6 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-orange-500" />
              <h2 className={`text-xl font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Search Results
              </h2>
              {totalCount > 0 && (
                <span className={`px-2 py-1 text-sm font-medium rounded-full ${
                  isDark
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {totalCount} items
                </span>
              )}
            </div>
            {totalCount > 0 && (
              <button
                onClick={handleClearClick}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-red-400'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-red-500'
                }`}
                title="Clear all products"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
                isDark ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <Package className={`w-10 h-10 ${
                  isDark ? 'text-gray-600' : 'text-gray-400'
                }`} />
              </div>
              <h3 className={`text-lg font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                No Search Results
              </h3>
              <p className={`text-sm ${
                isDark ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Search for products to see results here
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Personalized Products */}
              {personalizedProducts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingBag className="w-5 h-5 text-orange-500" />
                    <h3 className={`text-lg font-semibold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      Personalized
                    </h3>
                    <span className="px-2 py-1 text-xs rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                      For You
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {personalizedProducts.map((product) => {
                      const productData = 'product' in product ? product.product : product;
                      return (
                        <ProductCard
                          key={productData.id}
                          product={product}
                          isSaved={savedProductIds.has(productData.id)}
                          onSave={async (product) => {
                            try {
                              if (onProductSave) {
                                await onProductSave(product);
                              }
                            } catch (error) {
                              console.error('Failed to save product:', error);
                            }
                          }}
                          onRemove={async (productId) => {
                            try {
                              if (onProductRemove) {
                                await onProductRemove(productId);
                              }
                            } catch (error) {
                              console.error('Failed to remove product:', error);
                            }
                          }}
                          showSaveButton={true}
                          showRemoveButton={false}
                          isDark={isDark}
                          enableMLTracking={true}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inspiration Products */}
              {inspirationProducts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <h3 className={`text-lg font-semibold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      Discovery
                    </h3>
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                      Diverse
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {inspirationProducts.map((product) => {
                      const productData = product.product;
                      return (
                        <ProductCard
                          key={productData.id}
                          product={product}
                          isSaved={savedProductIds.has(productData.id)}
                          onSave={async (product) => {
                            try {
                              if (onProductSave) {
                                await onProductSave(product);
                              }
                            } catch (error) {
                              console.error('Failed to save product:', error);
                            }
                          }}
                          onRemove={async (productId) => {
                            try {
                              if (onProductRemove) {
                                await onProductRemove(productId);
                              }
                            } catch (error) {
                              console.error('Failed to remove product:', error);
                            }
                          }}
                          showSaveButton={true}
                          showRemoveButton={false}
                          isDark={isDark}
                          enableMLTracking={false}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-3 text-center">
                    <p className={`text-xs ${
                      isDark ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      💡 These products don't affect personalization
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      <ClearProductsDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearConfirm}
        productCount={totalCount}
        isDark={isDark}
      />
    </>
  );
};