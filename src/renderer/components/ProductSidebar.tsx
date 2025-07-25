import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, ShoppingBag, Sparkles, Trash2, Package, GripVertical, Image, Type, Search } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { ClearProductsDialog } from './ClearProductsDialog';
import { Product, ProductWithContext, SearchSession } from '../types';

interface ProductSidebarProps {
  products: (Product | ProductWithContext)[];
  isOpen: boolean;
  onToggle: () => void;
  onProductSave?: (product: Product) => Promise<{ success: boolean }>;
  onProductRemove?: (productId: string) => Promise<{ success: boolean }>;
  onClearProducts: () => void;
  onWidthChange?: (width: number) => void;
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
  onWidthChange,
  savedProductIds = new Set(),
  isDark
}) => {
  // Debug logging
  console.log('[ProductSidebar] Rendering with:', {
    productsCount: products?.length || 0,
    isOpen,
    savedProductIdsCount: savedProductIds?.size || 0,
    isDark
  });

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // Load saved width from localStorage, default to 600px
    const saved = localStorage.getItem('productSidebarWidth');
    return saved ? parseInt(saved, 10) : 600;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const resizeRef = useRef<HTMLDivElement>(null);

  // Save width to localStorage and notify parent when it changes
  useEffect(() => {
    localStorage.setItem('productSidebarWidth', sidebarWidth.toString());
    if (onWidthChange) {
      onWidthChange(sidebarWidth);
    }
  }, [sidebarWidth, onWidthChange]);

  // Handle mouse down on resize handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      // Constrain width between 400px and 1200px
      const constrainedWidth = Math.max(400, Math.min(1200, newWidth));
      setSidebarWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Group products by search session
  const productsBySession = (products || []).reduce((acc, product) => {
    // Extract search session from either Product or ProductWithContext
    const searchSession = 'searchSession' in product ? product.searchSession : 
                         ('product' in product && product.product.searchSession ? product.product.searchSession : null);
    
    if (!searchSession) {
      // If no search session, create a default one
      const defaultSession: SearchSession = {
        sessionId: 'default',
        searchQuery: 'Search Results',
        searchType: 'text',
        timestamp: new Date(),
        resultCount: 1
      };
      if (!acc['default']) acc['default'] = { session: defaultSession, products: [] };
      acc['default'].products.push(product);
      return acc;
    }

    if (!acc[searchSession.sessionId]) {
      acc[searchSession.sessionId] = { session: searchSession, products: [] };
    }
    acc[searchSession.sessionId].products.push(product);
    return acc;
  }, {} as Record<string, { session: SearchSession; products: (Product | ProductWithContext)[] }>);

  // Convert to array and sort by timestamp (newest first)
  const sessionGroups = Object.values(productsBySession).sort(
    (a, b) => new Date(b.session.timestamp).getTime() - new Date(a.session.timestamp).getTime()
  );

  const totalCount = products.length;

  const handleClearClick = () => {
    setShowClearDialog(true);
  };

  const handleClearConfirm = () => {
    onClearProducts();
    setShowClearDialog(false);
  };

  const toggleSection = (sessionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setCollapsedSections(new Set());
  };

  const collapseAll = () => {
    const allSessionIds = sessionGroups.map(group => group.session.sessionId);
    setCollapsedSections(new Set(allSessionIds));
  };

  const formatSearchType = (searchType: SearchSession['searchType']) => {
    switch (searchType) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'text': return <Type className="w-4 h-4" />;
      case 'mixed': return <Search className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-40 p-3 rounded-l-xl shadow-lg transition-all duration-300 border-l border-t border-b ${
          isDark
            ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
        }`}
        style={{ right: isOpen ? `${sidebarWidth}px` : '16px' }}
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
        className={`fixed top-0 right-0 h-full z-30 transform transition-transform duration-300 ease-in-out border-l ${
          isDark
            ? 'bg-gray-900 border-gray-700'
            : 'bg-white border-gray-200'
        } ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Resize Handle */}
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className={`absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-orange-500 transition-colors ${
            isResizing ? 'bg-orange-500' : 'bg-transparent'
          } group`}
        >
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 p-1 rounded ${
            isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
          } opacity-0 group-hover:opacity-100 transition-opacity`}>
            <GripVertical className="w-3 h-3" />
          </div>
        </div>
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

          {/* Expand/Collapse All Controls */}
          {sessionGroups.length > 1 && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={expandAll}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <ChevronDown className="w-4 h-4 inline mr-1" />
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <ChevronUp className="w-4 h-4 inline mr-1" />
                Collapse All
              </button>
            </div>
          )}
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
            <div className="p-6 space-y-6">
              {/* Search Session Groups */}
              {sessionGroups.map((group, groupIndex) => {
                const isCollapsed = collapsedSections.has(group.session.sessionId);
                const personalizedProducts = (group.products || []).filter(p => 
                  !('displayType' in p) || p.displayType === 'personalized'
                );
                const inspirationProducts = (group.products || []).filter(p => 
                  'displayType' in p && p.displayType === 'inspiration'
                );

                return (
                  <div key={group.session.sessionId} className={`rounded-lg border ${
                    isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                  }`}>
                    {/* Session Header */}
                    <div 
                      className={`p-4 cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => toggleSection(group.session.sessionId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {formatSearchType(group.session.searchType)}
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-medium truncate ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              {group.session.searchQuery.length > 50 
                                ? group.session.searchQuery.substring(0, 50) + '...'
                                : group.session.searchQuery
                              }
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs ${
                                isDark ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {formatTimestamp(group.session.timestamp)}
                              </span>
                              {group.session.imageAnalysisKeywords && (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  isDark ? 'bg-blue-900/30 text-blue-200' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  AI analyzed
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isDark
                                ? 'bg-gray-700 text-gray-300'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {(group.products || []).length} items
                            </span>
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Session Products */}
                    {!isCollapsed && (
                      <div className="px-4 pb-4 space-y-6">
                        {/* Personalized Products */}
                        {personalizedProducts.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <ShoppingBag className="w-4 h-4 text-orange-500" />
                              <h4 className={`text-sm font-medium ${
                                isDark ? 'text-white' : 'text-gray-900'
                              }`}>
                                Personalized
                              </h4>
                              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                                {personalizedProducts.length}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
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
                                    onRemove={undefined}
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
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="w-4 h-4 text-purple-500" />
                              <h4 className={`text-sm font-medium ${
                                isDark ? 'text-white' : 'text-gray-900'
                              }`}>
                                Discovery
                              </h4>
                              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                                {inspirationProducts.length}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
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
                                    onRemove={undefined}
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
                                💡 Discovery items don't affect personalization
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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