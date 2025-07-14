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
      {/* Image preview - Minimal design */}
      {imagePreview && (
        <div className="absolute bottom-full mb-2 left-3 animate-fade-in">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-24 max-h-24 rounded-md shadow-soft object-cover"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full p-1 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-soft"
              disabled={isLoading}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full resize-none bg-neutral-100 dark:bg-neutral-850 rounded-md px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-algolia-500 focus:bg-white dark:focus:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            rows={1}
            style={{ 
              minHeight: '40px',
              maxHeight: '120px',
            }}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="absolute right-2 bottom-2 p-1.5 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Upload image"
          >
            <Image size={18} strokeWidth={1.5} />
          </button>
        </div>

        <button
          type="submit"
          disabled={(!message.trim() && !selectedImage) || isLoading}
          className="p-2.5 bg-algolia-500 text-white rounded-md hover:bg-algolia-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message"
        >
          <Send size={18} strokeWidth={2} />
        </button>

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