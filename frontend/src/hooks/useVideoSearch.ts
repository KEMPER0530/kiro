import { useState, useCallback } from 'react';
import { Video, SearchParams, ApiResponse, VideoSearchResponse } from '../types';
import { api, endpoints, apiRequest, ApiError } from '../utils/api';
import { useAsyncOperation } from './useAsyncOperation';

interface UseVideoSearchReturn {
  videos: Video[];
  loading: boolean;
  error: ApiError | null;
  searchVideos: (params: SearchParams) => Promise<void>;
  clearResults: () => void;
  retry: () => Promise<void>;
}

export const useVideoSearch = (): UseVideoSearchReturn => {
  const [videos, setVideos] = useState<Video[]>([]);

  const searchOperation = useAsyncOperation(
    async (params: SearchParams) => {
      const response = await apiRequest(
        () => api.get<ApiResponse<VideoSearchResponse>>(
          endpoints.videos.search,
          {
            params: {
              q: params.query,
              category: params.category,
              maxResults: params.maxResults || 20
            }
          }
        ),
        {
          customErrorMessage: '動画の検索中にエラーが発生しました。'
        }
      );

      if (response.success) {
        return response.data.videos;
      } else {
        throw new Error(response.message || '検索に失敗しました');
      }
    },
    {
      customErrorTitle: '検索エラー',
      onSuccess: () => {
        // Success handled by setting videos
      }
    }
  );

  const searchVideos = useCallback(async (params: SearchParams) => {
    const result = await searchOperation.execute(params);
    if (result) {
      setVideos(result);
    }
  }, [searchOperation.execute]);

  const retry = useCallback(async () => {
    const result = await searchOperation.retry();
    if (result) {
      setVideos(result);
    }
  }, [searchOperation.retry]);

  const clearResults = useCallback(() => {
    setVideos([]);
    searchOperation.reset();
  }, [searchOperation.reset]);

  return {
    videos,
    loading: searchOperation.loading,
    error: searchOperation.error,
    searchVideos,
    clearResults,
    retry
  };
};