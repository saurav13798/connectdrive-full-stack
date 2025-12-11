/**
 * **Feature: frontend-quality-improvements, Property 2: Comprehensive error handling**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 * 
 * Property: For any error condition (JavaScript errors, API failures, timeouts, validation failures), 
 * the application should provide appropriate user feedback, recovery options, and maintain application stability
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary';
import { AppErrorClass } from '../types/errors';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useLoadingState } from '../hooks/useLoadingState';
import React from 'react';

// Test component that can throw errors
function ErrorThrowingComponent({ shouldThrow, errorType }: { shouldThrow: boolean; errorType: string }) {
  if (shouldThrow) {
    if (errorType === 'network') {
      throw new AppErrorClass('network', 'NETWORK_ERROR', 'Network connection failed', true, true);
    } else if (errorType === 'validation') {
      throw new AppErrorClass('validation', 'VALIDATION_ERROR', 'Invalid input provided', false, false);
    } else if (errorType === 'authentication') {
      throw new AppErrorClass('authentication', 'AUTH_ERROR', 'Authentication failed', true, false);
    } else {
      throw new Error('Generic JavaScript error');
    }
  }
  
  return <div>Component rendered successfully</div>;
}

// Test component using error handler hook
function ComponentWithErrorHandler() {
  const { handleError, handleAsyncError, withRetry } = useErrorHandler({
    onError: (error) => {
      // Error should be handled
    }
  });

  const [lastError, setLastError] = React.useState<any>(null);

  const handleClick = async () => {
    try {
      await handleAsyncError(async () => {
        throw new Error('Test async error');
      });
    } catch (error) {
      setLastError(error);
    }
  };

  return (
    <div>
      <button onClick={handleClick}>Trigger Error</button>
      {lastError && <div data-testid="error-message">{lastError.message}</div>}
    </div>
  );
}

// Test component using loading state
function ComponentWithLoadingState() {
  const { isLoading, error, execute } = useLoadingState();

  const handleAsyncOperation = () => {
    execute(async () => {
      throw new Error('Async operation failed');
    });
  };

  return (
    <div>
      <button onClick={handleAsyncOperation}>Start Operation</button>
      {isLoading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}
    </div>
  );
}

describe('Error Handling Property Tests', () => {
  // Property 2.1: Error boundaries should catch and display all types of errors
  test('Property 2.1: Error boundaries catch and display errors appropriately', () => {
    fc.assert(fc.property(
      fc.constantFrom('network', 'validation', 'authentication', 'unknown'),
      fc.boolean(),
      (errorType, shouldThrow) => {
        const onError = jest.fn();
        
        const { container } = render(
          <ErrorBoundary onError={onError} level="component">
            <ErrorThrowingComponent shouldThrow={shouldThrow} errorType={errorType} />
          </ErrorBoundary>
        );

        if (shouldThrow) {
          // Error boundary should catch the error and display fallback UI
          expect(container.textContent).toContain('Something went wrong');
          expect(onError).toHaveBeenCalled();
          
          // Should show retry button for recoverable errors
          if (errorType === 'network' || errorType === 'authentication') {
            expect(screen.getByText('Try again')).toBeInTheDocument();
          }
        } else {
          // Component should render normally
          expect(container.textContent).toContain('Component rendered successfully');
          expect(onError).not.toHaveBeenCalled();
        }
      }
    ), { numRuns: 50 });
  });

  // Property 2.2: Error handler hook should process all error types consistently
  test('Property 2.2: Error handler processes different error types consistently', () => {
    fc.assert(fc.property(
      fc.constantFrom('Error', 'AppError', 'string', 'object'),
      (errorInputType) => {
        const onError = jest.fn();
        const { handleError } = useErrorHandler({ onError });

        let testError: any;
        switch (errorInputType) {
          case 'Error':
            testError = new Error('Test error message');
            break;
          case 'AppError':
            testError = new AppErrorClass('network', 'TEST_ERROR', 'Test app error', true, true);
            break;
          case 'string':
            testError = 'String error message';
            break;
          case 'object':
            testError = { message: 'Object error' };
            break;
        }

        const result = handleError(testError);

        // Should always return an AppError
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('code');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('recoverable');
        expect(result).toHaveProperty('retryable');

        // Should call onError callback
        expect(onError).toHaveBeenCalledWith(result);
      }
    ), { numRuns: 50 });
  });

  // Property 2.3: Loading states should handle errors and provide feedback
  test('Property 2.3: Loading states handle errors and provide appropriate feedback', async () => {
    fc.assert(fc.asyncProperty(
      fc.boolean(),
      fc.integer({ min: 100, max: 1000 }),
      async (shouldFail, delay) => {
        render(<ComponentWithLoadingState />);
        
        const button = screen.getByText('Start Operation');
        fireEvent.click(button);

        // Should show loading state initially
        expect(screen.getByTestId('loading')).toBeInTheDocument();

        // Wait for operation to complete
        await waitFor(() => {
          expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        }, { timeout: 2000 });

        // Should show error message
        expect(screen.getByTestId('error')).toBeInTheDocument();
        expect(screen.getByTestId('error').textContent).toContain('Async operation failed');
      }
    ), { numRuns: 20 });
  });

  // Property 2.4: Error recovery mechanisms should work for retryable errors
  test('Property 2.4: Error recovery works for retryable errors', () => {
    fc.assert(fc.property(
      fc.boolean(),
      fc.constantFrom('network', 'authentication', 'validation'),
      (isRecoverable, errorType) => {
        const retryable = errorType === 'network';
        const recoverable = errorType !== 'validation';
        
        const onError = jest.fn();
        
        render(
          <ErrorBoundary onError={onError} level="component">
            <ErrorThrowingComponent shouldThrow={true} errorType={errorType} />
          </ErrorBoundary>
        );

        // Should display error UI
        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();

        if (recoverable) {
          // Should show retry button for recoverable errors
          const retryButton = screen.queryByText('Try again');
          expect(retryButton).toBeInTheDocument();
          
          if (retryButton) {
            // Clicking retry should attempt recovery
            fireEvent.click(retryButton);
            // After retry, should either show success or error again
            // (In this test, it will show error again since component always throws)
          }
        } else {
          // Should not show retry button for non-recoverable errors
          expect(screen.queryByText('Try again')).not.toBeInTheDocument();
        }
      }
    ), { numRuns: 30 });
  });

  // Property 2.5: Application stability should be maintained during errors
  test('Property 2.5: Application maintains stability during error conditions', () => {
    fc.assert(fc.property(
      fc.array(fc.constantFrom('network', 'validation', 'authentication', 'unknown'), { minLength: 1, maxLength: 5 }),
      (errorTypes) => {
        const onError = jest.fn();
        let errorCount = 0;

        // Render multiple error boundaries with different error types
        const { container } = render(
          <div>
            {errorTypes.map((errorType, index) => (
              <ErrorBoundary key={index} onError={onError} level="component">
                <ErrorThrowingComponent shouldThrow={true} errorType={errorType} />
              </ErrorBoundary>
            ))}
          </div>
        );

        // Each error boundary should catch its error independently
        expect(onError).toHaveBeenCalledTimes(errorTypes.length);
        
        // Application should still be responsive (container should exist)
        expect(container).toBeInTheDocument();
        
        // Should show error UI for each boundary
        const errorMessages = screen.getAllByText(/Something went wrong/);
        expect(errorMessages).toHaveLength(errorTypes.length);
      }
    ), { numRuns: 20 });
  });
});