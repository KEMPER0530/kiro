import { useState, useCallback, useRef } from 'react';
import { useError } from '../contexts/ErrorContext';
import { ApiError } from '../utils/api';

interface UseAsyncOperationOptions {
  showErrorToast?: boolean;
  customErrorTitle?: string;
  onSuccess?: () => void;
  onError?: (error: ApiError) => void;
}

interface UseAsyncOperationReturn<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: (...args: any[]) => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
}

export const useAsyncOperation = <T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions = {}
): UseAsyncOperationReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const { showError } = useError();
  
  // Store the last arguments for retry functionality
  const lastArgsRef = useRef<any[]>([]);

  const {
    showErrorToast = true,
    customErrorTitle = 'エラーが発生しました',
    onSuccess,
    onError
  } = options;

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    setLoading(true);
    setError(null);
    lastArgsRef.current = args;

    try {
      const result = await asyncFunction(...args);
      setData(result);
      onSuccess?.();
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      
      if (showErrorToast) {
        showError({
          type: 'error',
          title: customErrorTitle,
          message: apiError.message,
          retryAction: apiError.retryable ? () => retry() : undefined
        });
      }
      
      onError?.(apiError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction, showError, showErrorToast, customErrorTitle, onSuccess, onError]);

  const retry = useCallback(async (): Promise<T | null> => {
    return execute(...lastArgsRef.current);
  }, [execute]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    lastArgsRef.current = [];
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    retry,
    reset
  };
};

// Specialized hook for API operations with common patterns
export const useApiOperation = <T>(
  apiCall: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions & {
    loadingMessage?: string;
    successMessage?: string;
  } = {}
) => {
  const { showError } = useError();
  const [operationId, setOperationId] = useState<string | null>(null);

  const asyncOperation = useAsyncOperation(apiCall, {
    ...options,
    onSuccess: () => {
      if (options.successMessage) {
        showError({
          type: 'info',
          title: '成功',
          message: options.successMessage,
          dismissible: true
        });
      }
      options.onSuccess?.();
    }
  });

  const executeWithLoading = useCallback(async (...args: any[]) => {
    if (options.loadingMessage) {
      const id = showError({
        type: 'info',
        title: '処理中',
        message: options.loadingMessage,
        dismissible: false
      });
      setOperationId(id);
    }

    try {
      const result = await asyncOperation.execute(...args);
      return result;
    } finally {
      if (operationId) {
        // The loading message will be auto-dismissed by the context
        setOperationId(null);
      }
    }
  }, [asyncOperation.execute, options.loadingMessage, showError, operationId]);

  return {
    ...asyncOperation,
    execute: executeWithLoading
  };
};