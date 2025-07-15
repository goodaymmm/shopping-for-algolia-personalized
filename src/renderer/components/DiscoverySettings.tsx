import React, { useState, useEffect } from 'react';
import { Info, Sparkles } from 'lucide-react';
import { DiscoveryPercentage } from '../types';

interface DiscoverySettingsProps {
  value: DiscoveryPercentage;
  onChange: (value: DiscoveryPercentage) => void;
  className?: string;
}

export const DiscoverySettings: React.FC<DiscoverySettingsProps> = ({ 
  value, 
  onChange, 
  className = '' 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
      <Sparkles size={16} className="text-purple-500" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Discovery:</span>
      
      <div className="flex gap-1">
        {[0, 5, 10].map((percentage) => (
          <button
            key={percentage}
            onClick={() => onChange(percentage as DiscoveryPercentage)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              value === percentage
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {percentage === 0 ? 'Off' : `${percentage}%`}
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Info size={16} />
        </button>
        
        {showTooltip && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs rounded px-2 py-1 whitespace-nowrap z-10">
            Discover new styles and ideas. Does not affect learning data.
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-200"></div>
          </div>
        )}
      </div>
    </div>
  );
};