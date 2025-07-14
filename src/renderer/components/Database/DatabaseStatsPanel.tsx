import React from 'react'
import { ArrowLeft, Database, TrendingUp, Users, ShoppingCart, Activity } from 'lucide-react'

interface DatabaseStatsPanelProps {
  onBack: () => void
  isDark: boolean
}

export const DatabaseStatsPanel: React.FC<DatabaseStatsPanelProps> = ({ onBack, isDark }) => {
  // Mock data - will be replaced with real database queries
  const stats = {
    totalProducts: 156,
    totalSessions: 23,
    totalSearches: 89,
    favoriteBrand: 'Nike',
    avgPrice: 125.50,
    topCategory: 'Electronics'
  }

  const recentSearches = [
    { query: 'running shoes', count: 12, lastUsed: '2 hours ago' },
    { query: 'wireless headphones', count: 8, lastUsed: '1 day ago' },
    { query: 'gaming laptop', count: 5, lastUsed: '3 days ago' },
    { query: 'smartphone', count: 15, lastUsed: '1 week ago' },
  ]

  return (
    <div className="h-full bg-white dark:bg-neutral-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
          </button>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Database Statistics</h2>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Overview Stats */}
          <section>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-neutral-50 dark:bg-neutral-850 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-algolia-100 dark:bg-algolia-900/20 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-algolia-600 dark:text-algolia-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {stats.totalProducts}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      Saved Products
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-850 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <Users className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {stats.totalSessions}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      Chat Sessions
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-850 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {stats.totalSearches}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      Total Searches
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-850 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      ${stats.avgPrice}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      Avg Price
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-850 rounded-lg p-4">
                <div>
                  <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {stats.favoriteBrand}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Favorite Brand
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-850 rounded-lg p-4">
                <div>
                  <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {stats.topCategory}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Top Category
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Searches */}
          <section>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Recent Searches</h3>
            <div className="bg-neutral-50 dark:bg-neutral-850 rounded-lg">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <div className="grid grid-cols-3 gap-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  <div>Search Query</div>
                  <div>Usage Count</div>
                  <div>Last Used</div>
                </div>
              </div>
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {recentSearches.map((search, index) => (
                  <div key={index} className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {search.query}
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400">
                        {search.count} times
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400">
                        {search.lastUsed}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Data Management</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-4 bg-neutral-50 dark:bg-neutral-850 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="font-medium text-neutral-900 dark:text-neutral-100">Export Data</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">Download your personalization data</div>
              </button>
              
              <button className="w-full text-left p-4 bg-neutral-50 dark:bg-neutral-850 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="font-medium text-neutral-900 dark:text-neutral-100">Clear Search History</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">Remove all search history data</div>
              </button>
              
              <button className="w-full text-left p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                <div className="font-medium text-red-700 dark:text-red-400">Reset All Data</div>
                <div className="text-sm text-red-600 dark:text-red-500">Permanently delete all stored data</div>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}