import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Image, Compass } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string, image?: string) => void;
  sendOnEnter: boolean;
  discoveryMode: boolean;
  onDiscoveryModeToggle: () => void;
  isDark: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  sendOnEnter,
  discoveryMode,
  onDiscoveryModeToggle,
  isDark 
}) => {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || selectedImage) {
      onSendMessage(message, selectedImage || undefined);
      setMessage('');
      setSelectedImage(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleImageSelect = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (sendOnEnter) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as any);
      }
    } else {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit(e as any);
      }
    }
  };

  return (
    <div className={`border-t p-6 ${
      isDark 
        ? 'border-gray-700 bg-gray-800' 
        : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="max-w-4xl mx-auto">
        {selectedImage && (
          <div className="mb-4 relative inline-block">
            <img 
              src={selectedImage} 
              alt="Selected" 
              className="h-24 w-24 object-cover rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm"
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div 
            className={`relative flex items-end gap-3 p-4 border-2 rounded-2xl transition-all shadow-sm ${
              isDragging 
                ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20' 
                : isDark
                  ? 'border-gray-600 bg-gray-900 hover:border-gray-500'
                  : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                isDark
                  ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Attach image"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about products..."
              className={`flex-1 bg-transparent resize-none outline-none min-h-[24px] max-h-32 py-1 text-base ${
                isDark 
                  ? 'text-white placeholder-gray-400' 
                  : 'text-gray-900 placeholder-gray-500'
              }`}
              rows={1}
            />
            
            <button
              type="submit"
              disabled={!message.trim() && !selectedImage}
              className="flex-shrink-0 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              title={sendOnEnter ? "Send message (Enter)" : "Send message (⌘+Enter)"}
            >
              <Send className="w-5 h-5" />
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
            <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/50 bg-opacity-90 flex items-center justify-center rounded-2xl border-2 border-dashed border-blue-300">
              <div className="text-center">
                <Image className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-blue-600 dark:text-blue-400 font-medium">Drop image here</p>
              </div>
            </div>
          )}
        </form>
        
        {/* Discovery Mode */}
        <div className="mt-4 flex items-center justify-center">
          <button
            onClick={onDiscoveryModeToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              discoveryMode
                ? 'bg-orange-500 text-white shadow-sm'
                : isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="text-sm font-medium">
              Discovery Mode {discoveryMode ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
        
        <div className={`mt-3 text-xs text-center ${
          isDark ? 'text-gray-500' : 'text-gray-500'
        }`}>
          {sendOnEnter 
            ? 'Press Enter to send • Shift+Enter for new line • Drag and drop images to upload'
            : 'Press ⌘+Enter to send • Drag and drop images to upload'
          }
        </div>
      </div>
    </div>
  );
};