import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'white' | 'gray';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  text,
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-4 w-4';
      case 'medium':
        return 'h-8 w-8';
      case 'large':
        return 'h-12 w-12';
      default:
        return 'h-8 w-8';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'border-purple-600';
      case 'white':
        return 'border-white';
      case 'gray':
        return 'border-gray-600';
      default:
        return 'border-purple-600';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 'text-sm';
      case 'medium':
        return 'text-base';
      case 'large':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const spinnerClasses = `
    ${getSizeClasses()}
    ${getColorClasses()}
    border-2 border-t-transparent rounded-full animate-spin
  `.trim();

  if (text) {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <div className={spinnerClasses}></div>
        <p className={`${getTextSize()} text-center`}>{text}</p>
      </div>
    );
  }

  return <div className={`${spinnerClasses} ${className}`}></div>;
};

// Alternative pulse loading animation
export const PulseLoader: React.FC<{
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}> = ({ size = 'medium', color = 'primary', className = '' }) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-2 w-2';
      case 'medium':
        return 'h-3 w-3';
      case 'large':
        return 'h-4 w-4';
      default:
        return 'h-3 w-3';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'bg-purple-600';
      case 'white':
        return 'bg-white';
      case 'gray':
        return 'bg-gray-600';
      default:
        return 'bg-purple-600';
    }
  };

  const dotClasses = `${getSizeClasses()} ${getColorClasses()} rounded-full`;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className={`${dotClasses} animate-pulse`} style={{ animationDelay: '0ms' }}></div>
      <div className={`${dotClasses} animate-pulse`} style={{ animationDelay: '150ms' }}></div>
      <div className={`${dotClasses} animate-pulse`} style={{ animationDelay: '300ms' }}></div>
    </div>
  );
};

// Skeleton loader for content
export const SkeletonLoader: React.FC<{
  lines?: number;
  className?: string;
  isDark?: boolean;
}> = ({ lines = 3, className = '', isDark = false }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 rounded mb-2 last:mb-0 ${
            isDark ? 'bg-gray-700' : 'bg-gray-200'
          }`}
          style={{
            width: index === lines - 1 ? '75%' : '100%'
          }}
        ></div>
      ))}
    </div>
  );
};

// Product card skeleton
export const ProductCardSkeleton: React.FC<{
  isDark?: boolean;
  className?: string;
}> = ({ isDark = false, className = '' }) => {
  return (
    <div className={`rounded-lg border overflow-hidden ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } ${className}`}>
      <div className={`aspect-square ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`}></div>
      <div className="p-4">
        <div className={`h-5 rounded mb-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`}></div>
        <div className={`h-4 rounded mb-3 w-3/4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`}></div>
        <div className="flex justify-between items-center">
          <div className={`h-6 w-16 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`}></div>
          <div className={`h-4 w-12 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`}></div>
        </div>
      </div>
    </div>
  );
};