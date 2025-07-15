import React from 'react'
import { Settings as SettingsIcon, Database, Sparkles, Info } from 'lucide-react'
import { ErrorBoundary } from '../Common'

export const Settings: React.FC = () => {
  // Simplified for now - will be enhanced in Phase C
  const stats = {
    totalProducts: 0,
    totalCategories: 0,
    totalValue: 0,
    averagePrice: 0
  }

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <SettingsIcon size={24} className="text-algolia-500" />
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
              <p className="text-sm text-gray-600">
                Configure your shopping assistant preferences
              </p>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Discovery Settings Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-purple-500" />
              <h3 className="text-lg font-medium text-gray-900">Discovery Mode</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Discovery mode will be available in Phase C when advanced personalization features are implemented.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                <Info size={12} className="inline mr-1" />
                Coming soon: Control variety in search results for inspiration products.
              </p>
            </div>
          </div>

          {/* Database Statistics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database size={20} className="text-algolia-500" />
              <h3 className="text-lg font-medium text-gray-900">Database Statistics</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-algolia-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-algolia-700">
                  {stats.totalProducts}
                </div>
                <div className="text-sm text-gray-600">Saved Products</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">
                  {stats.totalCategories}
                </div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">
                  ${stats.totalValue.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-700">
                  ${stats.averagePrice.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Avg. Price</div>
              </div>
            </div>
          </div>

          {/* App Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Application Information</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="font-medium">Phase B - Prototype</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Search Engine:</span>
                <span className="font-medium">Algolia Demo API</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Database:</span>
                <span className="font-medium">SQLite (Local)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">AI Features:</span>
                <span className="font-medium">Coming in Phase C</span>
              </div>
            </div>
          </div>

          {/* Phase Information */}
          <div className="bg-gradient-to-r from-algolia-50 to-blue-50 rounded-lg border border-algolia-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Development Status</h3>
            <p className="text-sm text-gray-600 mb-3">
              🚀 <strong>Phase B completed!</strong> Basic chat functionality, discovery settings, and Algolia search integration are now working.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Next up:</strong> Phase C will add Gemini API image analysis, ML personalization, and Claude Desktop MCP integration.
            </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}