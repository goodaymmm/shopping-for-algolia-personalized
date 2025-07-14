import React, { useState } from 'react'
import { Sparkles, Info } from 'lucide-react'
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
    { value: 0 as const, label: 'Off' },
    { value: 5 as const, label: '5%' },
    { value: 10 as const, label: '10%' }
  ]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
        <span className="text-sm text-neutral-600 dark:text-neutral-400">Discovery</span>
        
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-850 rounded-md p-0.5">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                px-3 py-1 text-xs font-medium rounded transition-all duration-200
                ${value === option.value
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-subtle'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors p-1"
          >
            <Info size={14} strokeWidth={1.5} />
          </button>
          
          {showTooltip && (
            <div className="absolute bottom-full mb-2 right-0 bg-neutral-900 dark:bg-neutral-800 text-white text-xs rounded-md px-3 py-2 whitespace-nowrap z-50 shadow-medium animate-fade-in">
              <div className="font-medium mb-0.5">Discovery Mode</div>
              <div className="text-neutral-300">
                Mix in diverse products for inspiration
              </div>
              <div className="absolute top-full right-2 transform -translate-y-1 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}