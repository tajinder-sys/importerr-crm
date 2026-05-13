import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info'
  loading = false
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      confirmBg: 'bg-red-600 hover:bg-red-700',
      confirmText: 'text-white'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
      confirmText: 'text-white'
    },
    info: {
      icon: AlertTriangle,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      confirmBg: 'bg-blue-600 hover:bg-blue-700',
      confirmText: 'text-white'
    }
  };

  const currentStyle = typeStyles[type] || typeStyles.danger;
  const Icon = currentStyle.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />
        
        {/* Dialog */}
        <div className="relative w-full max-w-md transform rounded-lg bg-white p-6 shadow-xl transition-all dark:bg-slate-800">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="flex items-center justify-center mb-4">
            <div className={`rounded-full p-3 ${currentStyle.iconBg}`}>
              <Icon className={`h-6 w-6 ${currentStyle.iconColor}`} />
            </div>
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentStyle.confirmBg} ${currentStyle.confirmText}`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
