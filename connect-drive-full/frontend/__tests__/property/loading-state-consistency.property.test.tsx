/**
 * **Feature: frontend-quality-improvements, Property 5: Loading State Consistency**
 * **Validates: Requirements 2.3**
 * 
 * Property-based tests for loading state consistency across components
 */

import * as fc from 'fast-check';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { useLoadingState } from '../../hooks/useLoadingState';

// Mock components that demonstrate loading states
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };
  
  return (
    <div 
      className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}
      data-testid="loading-spinner"
      role="status"
      aria-label="Loading"
    />
  );
};

const LoadingSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="animate-pulse space-y-2" data-testid="loading-skeleton">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded loading-skeleton" />
      ))}
    </div>
  );
};

const TestComponentWithLoading: React.FC<{
  loadingType: 'spinner' | 'skeleton' | 'text';
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
}> = ({ loadingType, size, delay = 100 }) => {
  const { isLoading, error, data, execute } = useLoadingState();

  const handleLoad = () => {
    execute(async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return 'loaded data';
    });
  };

  return (
    <div data-testid="test-component">
      <button onClick={handleLoad} data-testid="load-button">
        Load Data
      </button>
      
      {isLoading && (
        <div data-testid="loading-container" className="loading-state">
          {loadingType === 'spinner' && <LoadingSpinner size={size} />}
          {loadingType === 'skeleton' && <LoadingSkeleton />}
          {loadingType === 'text' && (
            <div data-testid="loading-text" className="text-gray-600">
              Loading...
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div data-testid="error-message" className="text-red-600">
          {error}
        </div>
      )}
      
      {data && !isLoading && (
        <div data-testid="loaded-data" className="text-green-600">
          {data}
        </div>
      )}
    </div>
  );
};

const FileUploadProgress: React.FC<{
  files: Array<{ name: string; progress: number; status: 'uploading' | 'success' | 'error' }>;
}> = ({ files }) => {
  return (
    <div data-testid="upload-progress">
      {files.map((file, index) => (
        <div key={index} className="upload-item" data-testid={`upload-item-${index}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{file.name}</span>
            <span className="text-sm text-gray-500">{file.progress}%</span>
          </div>
          
          <div className="progress-container w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`progress-bar h-2 rounded-full transition-all duration-200 ${
                file.status === 'error' ? 'bg-red-500' : 
                file.status === 'success' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${file.progress}%` }}
              data-testid={`progress-bar-${index}`}
            />
          </div>
          
          {file.status === 'uploading' && (
            <div className="loading-indicator mt-1" data-testid={`loading-indicator-${index}`}>
              <LoadingSpinner size="sm" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

describe('Loading State Consistency Properties', () => {
  beforeEach(() => {
    cleanup();
  });

  /**
   * Property: All loading indicators should have consistent styling and accessibility attributes
   */
  test('loading indicators have consistent styling and accessibility', () => {
    fc.assert(fc.property(
      fc.constantFrom('spinner', 'skeleton', 'text'),
      fc.constantFrom('sm', 'md', 'lg'),
      (loadingType, size) => {
        const testId = Math.random().toString(36).substr(2, 9);
        
        const { container, unmount } = render(
          <TestComponentWithLoading 
            loadingType={loadingType}
            size={size}
            delay={50}
          />
        );
        
        try {
          const loadButton = screen.getByTestId('load-button');
          fireEvent.click(loadButton);
          
          // Should show loading state immediately
          const loadingContainer = screen.getByTestId('loading-container');
          expect(loadingContainer).toBeInTheDocument();
          expect(loadingContainer).toHaveClass('loading-state');
          
          if (loadingType === 'spinner') {
            const spinner = screen.getByTestId('loading-spinner');
            expect(spinner).toBeInTheDocument();
            expect(spinner).toHaveAttribute('role', 'status');
            expect(spinner).toHaveAttribute('aria-label', 'Loading');
            expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-b-2', 'border-blue-600');
          }
          
          if (loadingType === 'skeleton') {
            const skeleton = screen.getByTestId('loading-skeleton');
            expect(skeleton).toBeInTheDocument();
            expect(skeleton).toHaveClass('animate-pulse', 'space-y-2');
            
            // Should have skeleton lines with consistent styling
            const skeletonLines = container.querySelectorAll('.loading-skeleton');
            skeletonLines.forEach(line => {
              expect(line).toHaveClass('h-4', 'bg-gray-200', 'rounded', 'loading-skeleton');
            });
          }
          
          if (loadingType === 'text') {
            const loadingText = screen.getByTestId('loading-text');
            expect(loadingText).toBeInTheDocument();
            expect(loadingText).toHaveClass('text-gray-600');
            expect(loadingText).toHaveTextContent('Loading...');
          }
        } finally {
          unmount();
        }
      }
    ), { numRuns: 30 });
  });

  /**
   * Property: Progress indicators should display consistent progress values and styling
   */
  test('progress indicators display consistent progress values and styling', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          progress: fc.integer({ min: 0, max: 100 }),
          status: fc.constantFrom('uploading', 'success', 'error')
        }),
        { minLength: 1, maxLength: 3 }
      ),
      (files) => {
        const { container, unmount } = render(<FileUploadProgress files={files} />);
        
        try {
          files.forEach((file, index) => {
            const uploadItem = screen.getByTestId(`upload-item-${index}`);
            expect(uploadItem).toBeInTheDocument();
            
            // Should display file name and progress percentage
            expect(uploadItem).toHaveTextContent(file.name.trim());
            expect(uploadItem).toHaveTextContent(`${file.progress}%`);
            
            // Progress bar should have correct width and color
            const progressBar = screen.getByTestId(`progress-bar-${index}`);
            expect(progressBar).toHaveStyle(`width: ${file.progress}%`);
            expect(progressBar).toHaveClass('h-2', 'rounded-full', 'transition-all', 'duration-200');
            
            // Progress bar color should match status
            if (file.status === 'error') {
              expect(progressBar).toHaveClass('bg-red-500');
            } else if (file.status === 'success') {
              expect(progressBar).toHaveClass('bg-green-500');
            } else {
              expect(progressBar).toHaveClass('bg-blue-500');
            }
            
            // Should show loading indicator for uploading files
            if (file.status === 'uploading') {
              const loadingIndicator = screen.getByTestId(`loading-indicator-${index}`);
              expect(loadingIndicator).toBeInTheDocument();
              
              const spinner = loadingIndicator.querySelector('[data-testid="loading-spinner"]');
              expect(spinner).toBeInTheDocument();
            }
          });
        } finally {
          unmount();
        }
      }
    ), { numRuns: 30 });
  });

  /**
   * Property: Loading states should be accessible and provide screen reader feedback
   */
  test('loading states provide proper accessibility and screen reader support', () => {
    fc.assert(fc.property(
      fc.constantFrom('spinner', 'skeleton', 'text'),
      fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 1),
      (loadingType, loadingMessage) => {
        const TestComponent: React.FC = () => {
          const [isLoading, setIsLoading] = React.useState(true);
          
          return (
            <div>
              {isLoading && (
                <div 
                  data-testid={`loading-container-${loadingType}`}
                  role="status"
                  aria-live="polite"
                  aria-label={loadingMessage.trim()}
                >
                  {loadingType === 'spinner' && <LoadingSpinner />}
                  {loadingType === 'skeleton' && <LoadingSkeleton />}
                  {loadingType === 'text' && (
                    <span className="sr-only">{loadingMessage.trim()}</span>
                  )}
                </div>
              )}
            </div>
          );
        };

        const { unmount } = render(<TestComponent />);
        
        try {
          const loadingContainer = screen.getByTestId(`loading-container-${loadingType}`);
          
          // Should have proper ARIA attributes
          expect(loadingContainer).toHaveAttribute('role', 'status');
          expect(loadingContainer).toHaveAttribute('aria-live', 'polite');
          expect(loadingContainer).toHaveAttribute('aria-label', loadingMessage.trim());
          
          // Spinner should have accessibility attributes
          if (loadingType === 'spinner') {
            const spinner = screen.getByTestId('loading-spinner');
            expect(spinner).toHaveAttribute('role', 'status');
            expect(spinner).toHaveAttribute('aria-label', 'Loading');
          }
          
          // Text loading should have screen reader content
          if (loadingType === 'text') {
            const srText = loadingContainer.querySelector('.sr-only');
            expect(srText).toBeInTheDocument();
            expect(srText).toHaveTextContent(loadingMessage.trim());
          }
        } finally {
          unmount();
        }
      }
    ), { numRuns: 20 });
  });

  /**
   * Property: Loading states should transition consistently to completion states
   */
  test('loading states transition consistently to completion states', async () => {
    await fc.assert(fc.asyncProperty(
      fc.boolean(),
      fc.integer({ min: 10, max: 50 }),
      async (shouldSucceed, delay) => {
        const testId = Math.random().toString(36).substr(2, 9);
        
        const TestComponent: React.FC = () => {
          const { isLoading, error, data, execute } = useLoadingState();

          const handleLoad = () => {
            execute(async () => {
              await new Promise(resolve => setTimeout(resolve, delay));
              if (!shouldSucceed) {
                throw new Error('Test error');
              }
              return 'success data';
            });
          };

          return (
            <div>
              <button onClick={handleLoad} data-testid={`load-button-${testId}`}>Load</button>
              {isLoading && <div data-testid={`loading-${testId}`}>Loading...</div>}
              {error && <div data-testid={`error-${testId}`}>{error}</div>}
              {data && !isLoading && <div data-testid={`success-${testId}`}>{data}</div>}
            </div>
          );
        };

        const { unmount } = render(<TestComponent />);
        
        try {
          const loadButton = screen.getByTestId(`load-button-${testId}`);
          fireEvent.click(loadButton);
          
          // Should show loading initially
          expect(screen.getByTestId(`loading-${testId}`)).toBeInTheDocument();
          
          // Wait for completion
          await waitFor(() => {
            expect(screen.queryByTestId(`loading-${testId}`)).not.toBeInTheDocument();
          }, { timeout: delay + 200 });
          
          // Should show appropriate end state
          if (shouldSucceed) {
            expect(screen.getByTestId(`success-${testId}`)).toBeInTheDocument();
            expect(screen.queryByTestId(`error-${testId}`)).not.toBeInTheDocument();
          } else {
            expect(screen.getByTestId(`error-${testId}`)).toBeInTheDocument();
            expect(screen.queryByTestId(`success-${testId}`)).not.toBeInTheDocument();
          }
        } finally {
          unmount();
        }
      }
    ), { numRuns: 20 });
  });
});