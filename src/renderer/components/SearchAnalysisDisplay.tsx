import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Image, Filter, DollarSign, Palette, User, Zap } from 'lucide-react';
import { IPCSearchResult } from '../../shared/types';

interface SearchAnalysisDisplayProps {
  searchResult: IPCSearchResult;
  query: string;
}

export function SearchAnalysisDisplay({ searchResult, query }: SearchAnalysisDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { imageAnalysis, constraints } = searchResult;

  // Don't show if there's no analysis data
  if (!imageAnalysis && !constraints) {
    return null;
  }

  return (
    <div className="mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Zap className="w-4 h-4 text-blue-500" />
          Search Analysis & Filters
          {(imageAnalysis || constraints) && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {imageAnalysis && constraints ? 'Image + Filters' : imageAnalysis ? 'Image Analysis' : 'Filters Applied'}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Image Analysis Section */}
          {imageAnalysis && (
            <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Image className="w-4 h-4 text-purple-500" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Gemini Image Analysis
                </h4>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Detected Keywords:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {imageAnalysis.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                
                {imageAnalysis.category && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="ml-2 text-gray-800 dark:text-gray-200 capitalize">
                      {imageAnalysis.category}
                    </span>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Search Query: "{imageAnalysis.searchQuery}"
                </div>
              </div>
            </div>
          )}

          {/* Constraints Section */}
          {constraints && constraints.applied && (
            <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-green-500" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Applied Filters
                </h4>
              </div>
              
              <div className="space-y-2 text-sm">
                {/* Price Range */}
                {constraints.priceRange && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-gray-600 dark:text-gray-400">Price:</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      ${constraints.priceRange.min || 0} - ${constraints.priceRange.max || '∞'}
                    </span>
                  </div>
                )}

                {/* Colors */}
                {constraints.colors && constraints.colors.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Palette className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400">Colors:</span>
                    <div className="flex flex-wrap gap-1">
                      {constraints.colors.map((color, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded text-xs capitalize"
                        >
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gender */}
                {constraints.gender && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-600 dark:text-gray-400">Gender:</span>
                    <span className="text-gray-800 dark:text-gray-200 capitalize">
                      {constraints.gender}
                    </span>
                  </div>
                )}

                {/* Styles */}
                {constraints.styles && constraints.styles.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400">Styles:</span>
                    <div className="flex flex-wrap gap-1">
                      {constraints.styles.map((style, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded text-xs capitalize"
                        >
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Original Query */}
          <div className="text-xs text-gray-500 dark:text-gray-500 px-1">
            Original Query: "{query}"
          </div>
        </div>
      )}
    </div>
  );
}