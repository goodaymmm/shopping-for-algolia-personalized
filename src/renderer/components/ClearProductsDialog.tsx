import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ClearProductsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productCount: number;
  isDark: boolean;
}

export const ClearProductsDialog: React.FC<ClearProductsDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productCount,
  isDark
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className={`relative max-w-md w-full mx-4 rounded-2xl shadow-2xl border ${
        isDark 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isDark ? 'bg-red-900/30' : 'bg-red-100'
            }`}>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              商品をクリアしますか？
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className={`text-sm leading-relaxed mb-4 ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
            サイドバーに表示されている{productCount}個の商品をすべて削除します。
            この操作は元に戻すことができません。
          </p>
          <p className={`text-xs ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            ※保存済みの商品（データベース内）は削除されません。
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors border ${
              isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            いいえ
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-red-500 hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            はい、クリアする
          </button>
        </div>
      </div>
    </div>
  );
};