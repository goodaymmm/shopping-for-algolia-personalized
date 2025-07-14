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
    <div className={`flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100 ${className}`}>
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-purple-600" />
        <span className="text-sm font-medium text-gray-700">Discovery:</span>
      </div>
      
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ${
              value === option.value
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="text-gray-500 hover:text-purple-600 transition-colors"
        >
          <Info size={16} />
        </button>
        
        {showTooltip && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-lg">
            <div className="space-y-1">
              <div className="font-medium">🎨 Discovery Mode</div>
              <div>Explore new styles and trends</div>
              <div className="text-gray-300">Does not affect learning data</div>
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>

      {value > 0 && (
        <div className="text-xs text-purple-600 font-medium">
          ✨ Inspiration mode active
        </div>
      )}
    </div>
  )
}