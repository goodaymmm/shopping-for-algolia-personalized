import React from 'react';
import { ArrowLeft, Database, TrendingUp, Package, Users, Clock } from 'lucide-react';

interface DatabaseStatsPanelProps {
  onBack: () => void;
  isDark: boolean;
}

export const DatabaseStatsPanel: React.FC<DatabaseStatsPanelProps> = ({
  onBack,
  isDark
}) => {
  return (
    <div className={`flex-1 overflow-y-auto ${
      isDark ? 'bg-gray-900' : 'bg-white'
    }`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-2xl font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Database Statistics
          </h1>
        </div>
      </div>

      {/* Statistics Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Products */}
          <div className={`p-6 rounded-xl border ${
            isDark
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className={`font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Total Products
                </h3>
                <p className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  In database
                </p>
              </div>
            </div>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {/* Placeholder - you can add real data here */}
              Loading...
            </div>
          </div>

          {/* Active Users */}
          <div className={`p-6 rounded-xl border ${
            isDark
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className={`font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Active Users
                </h3>
                <p className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Last 24 hours
                </p>
              </div>
            </div>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {/* Placeholder - you can add real data here */}
              Loading...
            </div>
          </div>

          {/* Search Queries */}
          <div className={`p-6 rounded-xl border ${
            isDark
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className={`font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Search Queries
                </h3>
                <p className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Today
                </p>
              </div>
            </div>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {/* Placeholder - you can add real data here */}
              Loading...
            </div>
          </div>
        </div>

        {/* Detailed Statistics Section */}
        <div className="space-y-6">
          <section>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              <Database className="w-5 h-5" />
              Database Overview
            </h2>
            
            <div className={`p-6 rounded-xl border ${
              isDark
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <div className={`text-center py-8 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Database Statistics</p>
                <p className="text-sm">
                  Detailed database statistics and analytics will be displayed here.
                  <br />
                  You can add your custom implementation in this section.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              <Clock className="w-5 h-5" />
              Recent Activity
            </h2>
            
            <div className={`p-6 rounded-xl border ${
              isDark
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <div className={`text-center py-8 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Recent Activity</p>
                <p className="text-sm">
                  Recent database activity and user interactions will be shown here.
                  <br />
                  You can customize this section with your specific metrics.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};