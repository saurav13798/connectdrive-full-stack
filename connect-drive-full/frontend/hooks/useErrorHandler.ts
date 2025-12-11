import { useCallback } from 'react';
import { AppError, AppErrorClass } from '../types/errors';

interface UseErrorHandlerOptions {
  onError?: (error: AppError) => void;
  showToast?: (message: string, type: 'error' | 'success' | 'info') => void;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const handleError = useCallback((error: unknown): AppError => {
    let appError: AppError;

    if (error instanceof AppErrorClass) {
      appError = error;
    } else if (error instanceof Error) {
      appError = AppErrorClass.fromAxiosError(error);
    } else {
      appError = new AppErrorClass(
        'unknown',
        'UNKNOWN_ERROR',
        'An unexpected error occurred',
        false,
        false,
        { originalError: error }
      );
    }

    // Call custom error handler if provided
    if (options.onError) {
      options.onError(appError);
    }

    // Show toast notification if available
    if (options.showToast) {
      options.showToast(appError.message, 'error');
    }

    // Log error for debugging
    console.error('Error handled:', appError);

    return appError;
  }, [options]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    fallbackValue?: T
  ): Promise<T | undefined> => {
    try {
      return await asyncFn();
    } catch (error) {
      const appError = handleError(error);
      
      // Return fallback value for recoverable errors
      if (appError.recoverable && fallbackValue !== undefined) {
        return fallbackValue;
      }
      
      // Re-throw for non-recoverable errors
      throw appError;
    }
  }, [handleError]);

  const withRetry = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> => {
    let lastError: AppError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFn();
      } catch (error) {
        lastError = handleError(error);
        
        // Don't retry if error is not retryable or this is the last attempt
        if (!lastError.retryable || attempt === maxRetries) {
          throw lastError;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
    
    throw lastError!;
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    withRetry,
  };
}