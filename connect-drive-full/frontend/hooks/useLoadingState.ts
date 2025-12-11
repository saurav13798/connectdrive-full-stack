import { useState, useCallback } from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: any;
}

export function useLoadingState<T = any>(initialData?: T) {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    data: initialData || null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading, error: null }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const setData = useCallback((data: T) => {
    setState({ isLoading: false, error: null, data });
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, data: initialData || null });
  }, [initialData]);

  const execute = useCallback(async <R>(
    asyncFn: () => Promise<R>,
    options: {
      onSuccess?: (data: R) => void;
      onError?: (error: string) => void;
      resetOnStart?: boolean;
    } = {}
  ): Promise<R | null> => {
    try {
      if (options.resetOnStart) {
        reset();
      }
      
      setLoading(true);
      const result = await asyncFn();
      
      setData(result as any);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      
      if (options.onError) {
        options.onError(errorMessage);
      }
      
      return null;
    }
  }, [setLoading, setError, setData, reset]);

  return {
    ...state,
    setLoading,
    setError,
    setData,
    reset,
    execute,
  };
}