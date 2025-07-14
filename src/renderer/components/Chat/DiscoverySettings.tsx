import React, { useState } from 'react'
import { Info, Sparkles } from 'lucide-react'
import { DiscoveryPercentage } from '../../types'

interface DiscoverySettingsProps {
  value: DiscoveryPercentage
  onChange: (value: DiscoveryPercentage) => void
  className?: string
}

export const DiscoverySettings: React.FC<DiscoverySettingsProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false)

  const options = [
    { value: 0 as const, label: 'Off', description: 'Show only personalized results' },
    { value: 5 as const, label: '5%', description: 'Mix in 5% diverse products' },
    { value: 10 as const, label: '10%', description: 'Mix in 10% diverse products' }
  ]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-800 rounded-xl">
        <Sparkles className="w-4 h-4 text-algolia-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Discovery</span>
        
        <div className="flex gap-1 ml-2">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
                ${value === option.value
                  ? 'bg-algolia-500 text-white shadow-md transform scale-105'
                  : 'bg-white dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-600'
                }
              `}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="relative ml-2">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <Info size={16} />
          </button>
          
          {showTooltip && (
            <div className="absolute bottom-full mb-2 right-0 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-xl animate-fade-in">
              <div className="font-medium mb-1">Discovery Mode</div>
              <div className="text-gray-300">
                Explore new styles and trending items.<br />
                Does not affect your preference learning.
              </div>
              <div className="absolute top-full right-4 transform -translate-y-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
            </div>
          )}
        </div>
      </div>
      
      {value > 0 && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-algolia-600 dark:text-algolia-400">
          <span className="w-1.5 h-1.5 bg-algolia-500 rounded-full animate-pulse"></span>
          Active
        </div>
      )}
    </div>
  )
}