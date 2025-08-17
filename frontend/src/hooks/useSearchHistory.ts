import { useState, useCallback } from 'react';
import { SearchHistory, ApiResponse } from '../types';
import { api, endpoints } from '../utils/api';

interface UseSearchHistoryReturn {
  searchHistory: SearchHistory[];
  loading: boolean;
  error: string | null;
  addSearchHistory: (query: string) => Promise<void>;
  loadSearchHistory: () => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  deleteSearchHistory: (timestamp: string) => Promise<void>;
}

export const useSearchHistory = (): UseSearchHistoryReturn => {
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple user ID management - in a real app, this would come from authentication
  const getUserId = () => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', userId);
    }
    return userId;
  };

  const loadSearchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<ApiResponse<SearchHistory[]>>(
        endpoints.searchHistory.list,
        {
          params: { userId: getUserId() }
        }
      );

      if (response.data.success) {
        setSearchHistory(response.data.history || []);
      } else {
        setError(response.data.message || '検索履歴の読み込みに失敗しました');
      }
    } catch (err: any) {
      console.error('Load search history error:', err);
      setError('検索履歴の読み込み中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  const addSearchHistory = useCallback(async (query: string) => {
    if (!query.trim()) return;

    try {
      const response = await api.post<ApiResponse<SearchHistory>>(
        endpoints.searchHistory.add,
        {
          userId: getUserId(),
          query: query.trim(),
          timestamp: new Date().toISOString()
        }
      );

      if (response.data.success) {
        // Add to local state (optimistic update)
        setSearchHistory(prev => [response.data.searchHistory, ...prev.slice(0, 9)]); // Keep only last 10
      } else {
        console.warn('Failed to save search history:', response.data.message);
      }
    } catch (err: any) {
      console.error('Add search history error:', err);
      // Don't show error to user for search history failures
    }
  }, []);

  const clearSearchHistory = useCallback(async () => {
    try {
      const response = await api.delete<ApiResponse<void>>(
        endpoints.searchHistory.clear,
        {
          params: { userId: getUserId() }
        }
      );

      if (response.data.success) {
        setSearchHistory([]);
      } else {
        throw new Error(response.data.message || '検索履歴のクリアに失敗しました');
      }
    } catch (err: any) {
      console.error('Clear search history error:', err);
      throw new Error('検索履歴のクリア中にエラーが発生しました。');
    }
  }, []);

  const deleteSearchHistory = useCallback(async (timestamp: string) => {
    try {
      const response = await api.delete<ApiResponse<void>>(
        endpoints.searchHistory.delete(timestamp),
        {
          params: { userId: getUserId() }
        }
      );

      if (response.data.success) {
        setSearchHistory(prev => prev.filter(item => item.timestamp !== timestamp));
      } else {
        throw new Error(response.data.message || '検索履歴の削除に失敗しました');
      }
    } catch (err: any) {
      console.error('Delete search history error:', err);
      throw new Error('検索履歴の削除中にエラーが発生しました。');
    }
  }, []);

  return {
    searchHistory,
    loading,
    error,
    addSearchHistory,
    loadSearchHistory,
    clearSearchHistory,
    deleteSearchHistory
  };
};