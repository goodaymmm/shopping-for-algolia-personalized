import React from 'react'
import { DiscoverySettings } from './DiscoverySettings'
import { DiscoveryPercentage } from '../../types'

interface ChatHeaderProps {
  discoveryPercentage?: DiscoveryPercentage
  onDiscoveryChange?: (value: DiscoveryPercentage) => void
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  discoveryPercentage = 0,
  onDiscoveryChange
}) => {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Shopping Assistant
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Find products by description or image
            </p>
          </div>
          {onDiscoveryChange && (
            <DiscoverySettings
              value={discoveryPercentage}
              onChange={onDiscoveryChange}
            />
          )}
        </div>
      </div>
    </header>
  )
}