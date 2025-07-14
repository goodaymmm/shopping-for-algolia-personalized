import React from 'react'

interface ChatHeaderProps {
  isDark: boolean
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ isDark }) => {
  return (
    <header className={`border-b ${
      isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
    }`}>
      <div className="px-6 py-4">
        <h1 className={`text-xl font-semibold ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Shopping Assistant
        </h1>
        <p className={`text-sm mt-1 ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Find products by description or image
        </p>
      </div>
    </header>
  )
}