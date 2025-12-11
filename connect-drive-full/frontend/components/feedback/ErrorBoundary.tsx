import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppError, AppErrorClass } from '../../types/errors';

interface Props {
  children: ReactNode;
  fallback?: (error: AppError, retry: () => void) => ReactNode;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  level?: 'root' | 'feature' | 'component';
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    const appError = error instanceof AppErrorClass 
      ? error 
      : new AppErrorClass(
          'unknown',
          'COMPONENT_ERROR',
          error.message || 'A component error occurred',
          true,
          false,
          true,
          { originalError: error }
        );

    return {
      hasError: true,
      error: appError,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = this.state.error;
    if (appError && this.props.onError) {
      this.props.onError(appError, errorInfo);
    }

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.retry} level={this.props.level || 'component'} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: AppError;
  retry: () => void;
  level?: 'root' | 'feature' | 'component';
}

function DefaultErrorFallback({ error, retry, level = 'component' }: DefaultErrorFallbackProps) {
  const isRootLevel = level === 'root';
  
  return (
    <div className={`flex flex-col items-center justify-center p-6 ${
      isRootLevel ? 'min-h-screen bg-gray-50' : 'min-h-[200px] bg-white border border-red-200 rounded-lg'
    }`}>
      <div className="text-center max-w-md">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <h3 className={`${isRootLevel ? 'text-lg' : 'text-base'} font-medium text-gray-900 mb-2`}>
          {isRootLevel ? 'Application Error' : 'Something went wrong'}
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          {error.message}
        </p>
        
        {error.recoverable && (
          <button
            onClick={retry}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Try again
          </button>
        )}
        
        {!error.recoverable && isRootLevel && (
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Reload page
          </button>
        )}
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="text-xs text-gray-500 cursor-pointer">Error details</summary>
            <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}