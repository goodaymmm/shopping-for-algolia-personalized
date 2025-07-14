import React, { useState, useRef } from 'react'
import { Send, Image, X } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (content: string, imageFile?: File) => void
  isLoading?: boolean
  placeholder?: string
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = "Describe what you're looking for or upload an image..."
}) => {
  const [message, setMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if ((!message.trim() && !selectedImage) || isLoading) {
      return
    }

    onSendMessage(message.trim() || 'Image search', selectedImage || undefined)
    
    // Reset form
    setMessage('')
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="relative">
      {/* Image preview */}
      {imagePreview && (
        <div className="absolute bottom-full mb-3 left-4 animate-scale-in">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-32 max-h-32 rounded-xl shadow-lg"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all hover:scale-110 shadow-lg"
              disabled={isLoading}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4 bg-white dark:bg-dark-900">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full resize-none border border-gray-300 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 rounded-2xl px-4 py-3 pr-24 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-algolia-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-dark-700 disabled:cursor-not-allowed transition-all"
            rows={1}
            style={{ 
              minHeight: '48px',
              maxHeight: '120px',
              height: 'auto'
            }}
          />
          
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-algolia-600 dark:text-gray-500 dark:hover:text-algolia-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload image"
            >
              <Image size={20} />
            </button>

            <button
              type="submit"
              disabled={(!message.trim() && !selectedImage) || isLoading}
              className="p-2 bg-algolia-500 text-white rounded-xl hover:bg-algolia-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-algolia-500/20 hover:scale-105"
              title="Send message"
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
      </form>
    </div>
  )
}