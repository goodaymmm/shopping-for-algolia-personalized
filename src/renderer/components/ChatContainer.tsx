import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ProductCard } from './ProductCard';
import { Message, Product, ProductWithContext } from '../types';
import { MessageSquare, Sparkles, ShoppingBag } from 'lucide-react';

interface ChatContainerProps {
  messages: Message[];
  searchResults?: (Product | ProductWithContext)[];
  showTimestamps: boolean;
  isLoading?: boolean;
  isDark: boolean;
  savedProductIds?: Set<string>;
  onProductSave?: (product: Product) => Promise<{ success: boolean }>;
  onProductRemove?: (productId: string) => Promise<{ success: boolean }>;
  saveMessage?: { type: 'success' | 'error'; text: string } | null;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  messages, 
  searchResults = [],
  showTimestamps, 
  isLoading = false,
  isDark,
  savedProductIds = new Set(),
  onProductSave,
  onProductRemove,
  saveMessage
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center py-16">
            <div className="max-w-md">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                Welcome to Shopping AI
              </h2>
              <p className="leading-relaxed mb-6 text-gray-600 dark:text-gray-300">
                I'm Shopping AI, powered by Algolia Search. I can help you find products, compare prices, discover deals, and make informed shopping decisions.
              </p>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 backdrop-blur-sm">
                  <div className="font-medium mb-1 text-gray-900 dark:text-white">
                    💬 Natural conversation
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Ask me anything or start a conversation
                  </div>
                </div>
                <div className="rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 backdrop-blur-sm">
                  <div className="font-medium mb-1 text-gray-900 dark:text-white">
                    🖼️ Image analysis
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Upload images for analysis and discussion
                  </div>
                </div>
                <div className="rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 backdrop-blur-sm">
                  <div className="font-medium mb-1 text-gray-900 dark:text-white">
                    📝 Writing assistance
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Help with writing, editing, and creative projects
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                showTimestamp={showTimestamps}
                isDark={isDark}
              />
            ))}
            
            {/* Save Message Notification */}
            {saveMessage && (
              <div className="px-6 my-4">
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  saveMessage.type === 'success' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}>
                  {saveMessage.type === 'success' ? '✓' : '✗'}
                  <span className="font-medium">{saveMessage.text}</span>
                </div>
              </div>
            )}
            
            {/* Search Results Section */}
            {searchResults.length > 0 && (() => {
              // Separate personalized and inspiration products
              const personalizedProducts = searchResults.filter(p => 
                !('displayType' in p) || p.displayType === 'personalized'
              );
              const inspirationProducts = searchResults.filter(p => 
                'displayType' in p && p.displayType === 'inspiration'
              );
              
              return (
                <div className="mt-6 px-6 space-y-6">
                  {/* Personalized Results */}
                  {personalizedProducts.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <ShoppingBag className="w-5 h-5 text-orange-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Recommended for You
                        </h3>
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                          Personalized
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  
                  {/* Inspiration Results */}
                  {inspirationProducts.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Inspiration & Discovery
                        </h3>
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                          Diverse
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                              enableMLTracking={false} // Disable ML tracking for inspiration items
                            />
                          );
                        })}
                      </div>
                      <div className="mt-3 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          💡 These items won't affect your personalization preferences
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Searching for products...</span>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};