import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showDetails?: boolean;
  onReset?: () => void;
  isDark?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console for development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendErrorToService(error, errorInfo, this.state.errorId);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    if (window.electronAPI) {
      // In Electron, we might want to restart the app
      window.location.reload();
    } else {
      // In browser, just reload the page
      window.location.reload();
    }
  };

  copyErrorDetails = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        alert('Error details copied to clipboard');
      })
      .catch(() => {
        console.error('Failed to copy error details');
      });
  };

  render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = "Something went wrong",
        fallbackMessage = "The application encountered an unexpected error. You can try refreshing the page or going back to the home screen.",
        showDetails = true,
        isDark = false
      } = this.props;

      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${
          isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}>
          <div className={`max-w-lg w-full rounded-lg shadow-lg p-6 ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full ${
                isDark ? 'bg-red-900/20' : 'bg-red-50'
              }`}>
                <AlertTriangle 
                  size={32} 
                  className={isDark ? 'text-red-400' : 'text-red-500'} 
                />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-xl font-semibold text-center mb-3">
              {fallbackTitle}
            </h1>

            {/* Error Message */}
            <p className={`text-center mb-6 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {fallbackMessage}
            </p>

            {/* Error Details */}
            {showDetails && this.state.error && (
              <div className={`mb-6 p-4 rounded-lg ${
                isDark ? 'bg-gray-900 border border-gray-600' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Bug size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                  <span className="text-sm font-medium">Error Details</span>
                </div>
                
                <div className={`text-sm font-mono ${
                  isDark ? 'text-red-400' : 'text-red-600'
                }`}>
                  <p className="mb-2">
                    <strong>Error ID:</strong> {this.state.errorId}
                  </p>
                  <p className="mb-2">
                    <strong>Message:</strong> {this.state.error.message}
                  </p>
                  
                  {process.env.NODE_ENV === 'development' && (
                    <details className="mt-3">
                      <summary className="cursor-pointer hover:text-red-500">
                        Stack Trace (Development)
                      </summary>
                      <pre className={`mt-2 text-xs overflow-auto max-h-32 p-2 rounded ${
                        isDark ? 'bg-gray-800' : 'bg-white'
                      }`}>
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                <Home size={16} />
                Reload App
              </button>
            </div>

            {/* Copy Error Button */}
            {showDetails && this.state.error && (
              <button
                onClick={this.copyErrorDetails}
                className={`w-full mt-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                  isDark 
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Copy Error Details for Support
              </button>
            )}

            {/* App Info */}
            <div className={`mt-6 pt-4 border-t text-center text-xs ${
              isDark 
                ? 'border-gray-700 text-gray-500' 
                : 'border-gray-200 text-gray-400'
            }`}>
              Shopping for AIgolia personalized • Version 1.0.0
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple error boundary hook for functional components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  return (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
};