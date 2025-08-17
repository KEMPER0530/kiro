import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsyncOperation } from '../useAsyncOperation';
import { ApiError } from '../../utils/api';

// Mock the ErrorContext
vi.mock('../../contexts/ErrorContext', () => ({
  useError: () => ({
    showError: vi.fn()
  })
}));

describe('useAsyncOperation', () => {
  it('should handle successful async operation', async () => {
    const mockAsyncFunction = vi.fn().mockResolvedValue('success result');
    
    const { result } = renderHook(() => 
      useAsyncOperation(mockAsyncFunction)
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    // Execute the operation
    await act(async () => {
      const data = await result.current.execute('test-arg');
      expect(data).toBe('success result');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('success result');
    expect(result.current.error).toBe(null);
    expect(mockAsyncFunction).toHaveBeenCalledWith('test-arg');
  });

  it('should handle failed async operation', async () => {
    const mockError: ApiError = {
      message: 'Test error',
      retryable: true
    };
    const mockAsyncFunction = vi.fn().mockRejectedValue(mockError);
    
    const { result } = renderHook(() => 
      useAsyncOperation(mockAsyncFunction)
    );

    // Execute the operation
    await act(async () => {
      const data = await result.current.execute('test-arg');
      expect(data).toBe(null);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(mockError);
  });

  it('should set loading state correctly during execution', async () => {
    let resolvePromise: (value: string) => void;
    const mockAsyncFunction = vi.fn().mockImplementation(() => 
      new Promise<string>((resolve) => {
        resolvePromise = resolve;
      })
    );
    
    const { result } = renderHook(() => 
      useAsyncOperation(mockAsyncFunction)
    );

    expect(result.current.loading).toBe(false);

    // Start execution
    act(() => {
      result.current.execute('test-arg');
    });

    expect(result.current.loading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!('success');
    });

    expect(result.current.loading).toBe(false);
  });

  it('should retry with last arguments', async () => {
    const mockAsyncFunction = vi.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce('success on retry');
    
    const { result } = renderHook(() => 
      useAsyncOperation(mockAsyncFunction)
    );

    // First execution fails
    await act(async () => {
      await result.current.execute('test-arg-1', 'test-arg-2');
    });

    expect(result.current.error).toBeTruthy();

    // Retry should use the same arguments
    await act(async () => {
      const data = await result.current.retry();
      expect(data).toBe('success on retry');
    });

    expect(mockAsyncFunction).toHaveBeenCalledTimes(2);
    expect(mockAsyncFunction).toHaveBeenNthCalledWith(1, 'test-arg-1', 'test-arg-2');
    expect(mockAsyncFunction).toHaveBeenNthCalledWith(2, 'test-arg-1', 'test-arg-2');
  });

  it('should reset state correctly', async () => {
    const mockAsyncFunction = vi.fn().mockResolvedValue('success result');
    
    const { result } = renderHook(() => 
      useAsyncOperation(mockAsyncFunction)
    );

    // Execute operation
    await act(async () => {
      await result.current.execute('test-arg');
    });

    expect(result.current.data).toBe('success result');

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });
});