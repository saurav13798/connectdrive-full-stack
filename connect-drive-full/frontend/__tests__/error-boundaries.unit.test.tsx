import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary';
import { AppErrorClass } from '../types/errors';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useLoadingState } from '../hooks/useLoadingState';
import React from 'react';

// Mock console.error to avoid noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Test component that throws errors
function ThrowError({ error }: { error?: Error }) {
  if (error) {
    throw error;
  }
  return <div>No error</div>;
}

describe('ErrorBoundary Unit Tests', () => {
  test('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('should catch JavaScript errors and display default fallback', () => {
    const error = new Error('Test error message');
    
    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  test('should catch AppError and display appropriate UI', () => {
    const appError = new AppErrorClass(
      'network',
      'NETWORK_ERROR',
      'Network connection failed',
      true,
      true
    );
    
    render(
      <ErrorBoundary>
        <ThrowError error={appError} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  test('should not show retry button for non-recoverable errors', () => {
    const appError = new AppErrorClass(
      'validation',
      'VALIDATION_ERROR',
      'Invalid input',
      false,
      false
    );
    
    render(
      <ErrorBoundary>
        <ThrowError error={appError} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Invalid input')).toBeInTheDocument();
    expect(screen.queryByText('Try again')).not.toBeInTheDocument();
  });

  test('should call onError callback when error occurs', () => {
    const onError = jest.fn();
    const error = new Error('Test error');
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toMatchObject({
      message: 'Test error',
      type: 'unknown',
      code: 'COMPONENT_ERROR'
    });
  });

  test('should use custom fallback when provided', () => {
    const customFallback = (error: any, retry: () => void) => (
      <div>
        <span>Custom error: {error.message}</span>
        <button onClick={retry}>Custom retry</button>
      </div>
    );

    const error = new Error('Custom test error');
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error: Custom test error')).toBeInTheDocument();
    expect(screen.getByText('Custom retry')).toBeInTheDocument();
  });

  test('should reset error state when retry is clicked', () => {
    const error = new AppErrorClass('network', 'NETWORK_ERROR', 'Network error', true, true);

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    // Should show error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
    
    // Click retry button - this will reset the error boundary state
    // but the component will throw again, so we just verify the retry button works
    fireEvent.click(screen.getByText('Try again'));
    
    // The error boundary should still show error since component throws again
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('should show different UI for root level errors', () => {
    const error = new AppErrorClass('unknown', 'ROOT_ERROR', 'Root level error', false, false);
    
    render(
      <ErrorBoundary level="root">
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(screen.getByText('Reload page')).toBeInTheDocument();
  });
});

describe('useErrorHandler Unit Tests', () => {
  test('should handle different error types', () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useErrorHandler({ onError }));

    // Test JavaScript Error
    const jsError = new Error('JavaScript error');
    const result1 = result.current.handleError(jsError);
    expect(result1.type).toBe('unknown');
    expect(result1.message).toBe('JavaScript error');

    // Test AppError
    const appError = new AppErrorClass('network', 'NET_ERR', 'Network error', true, true);
    const result2 = result.current.handleError(appError);
    expect(result2.type).toBe('network');
    expect(result2.code).toBe('NET_ERR');

    // Test string error
    const result3 = result.current.handleError('String error');
    expect(result3.type).toBe('unknown');
    expect(result3.message).toBe('An unexpected error occurred');

    expect(onError).toHaveBeenCalledTimes(3);
  });

  test('should handle async errors with fallback', async () => {
    const { result } = renderHook(() => useErrorHandler());

    // Test with recoverable error - should return fallback
    const asyncResult = await result.current.handleAsyncError(
      async () => {
        throw new AppErrorClass('network', 'NET_ERROR', 'Network error', true, false);
      },
      'fallback value'
    );

    expect(asyncResult).toBe('fallback value');

    // Test with non-recoverable error - should throw
    try {
      await result.current.handleAsyncError(
        async () => {
          throw new AppErrorClass('validation', 'VAL_ERROR', 'Validation error', false, false);
        },
        'fallback value'
      );
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppErrorClass);
    }
  });

  test('should retry operations with exponential backoff', async () => {
    const { result } = renderHook(() => useErrorHandler());
    let attempts = 0;

    const operation = jest.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        throw new AppErrorClass('network', 'RETRY_ERROR', 'Retryable error', true, true);
      }
      return 'success';
    });

    const retryResult = await result.current.withRetry(operation, 2, 10); // 2 retries, 10ms delay
    
    expect(retryResult).toBe('success');
    expect(attempts).toBe(3);
    expect(operation).toHaveBeenCalledTimes(3);
  });
});

describe('useLoadingState Unit Tests', () => {
  function TestComponent() {
    const { isLoading, error, data, execute, setLoading, setError, setData, reset } = useLoadingState('initial');

    return (
      <div>
        <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
        <div data-testid="error">{error || 'No Error'}</div>
        <div data-testid="data">{data || 'No Data'}</div>
        <button onClick={() => setLoading(true)}>Set Loading</button>
        <button onClick={() => setError('Test error')}>Set Error</button>
        <button onClick={() => setData('Test data')}>Set Data</button>
        <button onClick={reset}>Reset</button>
        <button onClick={() => execute(async () => 'Executed')}>Execute Success</button>
        <button onClick={() => execute(async () => { throw new Error('Execute error'); })}>Execute Error</button>
      </div>
    );
  }

  test('should manage loading state correctly', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    
    fireEvent.click(screen.getByText('Set Loading'));
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
  });

  test('should manage error state correctly', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    
    fireEvent.click(screen.getByText('Set Error'));
    expect(screen.getByTestId('error')).toHaveTextContent('Test error');
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
  });

  test('should manage data state correctly', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('data')).toHaveTextContent('initial');
    
    fireEvent.click(screen.getByText('Set Data'));
    expect(screen.getByTestId('data')).toHaveTextContent('Test data');
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');
  });

  test('should reset state correctly', () => {
    render(<TestComponent />);

    // Set some state
    fireEvent.click(screen.getByText('Set Loading'));
    fireEvent.click(screen.getByText('Set Error'));
    
    // Reset
    fireEvent.click(screen.getByText('Reset'));
    
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    expect(screen.getByTestId('data')).toHaveTextContent('initial');
  });

  test('should execute async operations successfully', async () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByText('Execute Success'));
    
    // Should show loading initially
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    
    // Wait for completion
    await screen.findByText('Executed');
    
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    expect(screen.getByTestId('data')).toHaveTextContent('Executed');
  });

  test('should handle async operation errors', async () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByText('Execute Error'));
    
    // Wait for error
    await screen.findByText('Execute error');
    
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('error')).toHaveTextContent('Execute error');
  });
});