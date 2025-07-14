import React, { useState, useRef } from 'react'
import { Send, Paperclip, X, Image } from 'lucide-react'
import { DiscoverySettings } from './DiscoverySettings'
import { DiscoveryPercentage } from '../../types'

interface ChatInputProps {
  onSendMessage: (content: string, imageFile?: File) => void
  sendOnEnter: boolean
  discoveryPercentage?: DiscoveryPercentage
  onDiscoveryChange?: (value: DiscoveryPercentage) => void
  isLoading?: boolean
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  sendOnEnter,
  discoveryPercentage = 0,
  onDiscoveryChange,
  isLoading = false
}) => {
  const [message, setMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((message.trim() || selectedImage) && !isLoading) {
      onSendMessage(message, selectedImage || undefined)
      setMessage('')
      setSelectedImage(null)
      setImagePreview(null)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleImageSelect = (file: File) => {
    if (file.type.startsWith('image/')) {
      setSelectedImage(file)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleImageSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (sendOnEnter) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e as any)
      }
    } else {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit(e as any)
      }
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900">
      <div className="max-w-4xl mx-auto">
        {imagePreview && (
          <div className="mb-4 relative inline-block">
            <img 
              src={imagePreview} 
              alt="Selected" 
              className="h-24 w-24 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-subtle"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full flex items-center justify-center hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-subtle"
              disabled={isLoading}
            >
              <X className="w-3 h-3" strokeWidth={2} />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div 
            className={`relative flex items-end gap-3 p-4 border-2 rounded-xl transition-all shadow-subtle ${
              isDragging 
                ? 'border-algolia-300 bg-algolia-50 dark:bg-algolia-900/20' 
                : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex-shrink-0 p-2 rounded-lg transition-colors text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
              title="Attach image"
            >
              <Paperclip className="w-5 h-5" strokeWidth={1.5} />
            </button>
            
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about products..."
              disabled={isLoading}
              className="flex-1 bg-transparent resize-none outline-none min-h-[24px] max-h-32 py-1 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 disabled:opacity-50"
              rows={1}
            />
            
            <button
              type="submit"
              disabled={(!message.trim() && !selectedImage) || isLoading}
              className="flex-shrink-0 p-2 bg-algolia-500 text-white rounded-lg hover:bg-algolia-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed transition-colors shadow-subtle"
              title={sendOnEnter ? "Send message (Enter)" : "Send message (⌘+Enter)"}
            >
              <Send className="w-5 h-5" strokeWidth={2} />
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          
          {isDragging && (
            <div className="absolute inset-0 bg-algolia-100 dark:bg-algolia-900/50 bg-opacity-90 flex items-center justify-center rounded-xl border-2 border-dashed border-algolia-300">
              <div className="text-center">
                <Image className="w-8 h-8 text-algolia-500 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-algolia-600 dark:text-algolia-400 font-medium">Drop image here</p>
              </div>
            </div>
          )}
        </form>
        
        {/* Discovery Settings */}
        {onDiscoveryChange && (
          <div className="mt-4 flex items-center justify-center">
            <DiscoverySettings
              value={discoveryPercentage}
              onChange={onDiscoveryChange}
            />
          </div>
        )}
        
        <div className="mt-3 text-xs text-center text-neutral-500 dark:text-neutral-400">
          {sendOnEnter 
            ? 'Press Enter to send • Shift+Enter for new line • Drag and drop images to upload'
            : 'Press ⌘+Enter to send • Drag and drop images to upload'
          }
        </div>
      </div>
    </div>
  )
}