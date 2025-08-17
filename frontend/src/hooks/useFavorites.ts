import { useState, useCallback, useEffect } from 'react';
import { Video, Favorite, ApiResponse } from '../types';
import { api, endpoints, apiRequest, ApiError } from '../utils/api';
import { useApiOperation } from './useAsyncOperation';

interface UseFavoritesReturn {
  favorites: Favorite[];
  favoriteVideoIds: string[];
  loading: boolean;
  error: ApiError | null;
  addFavorite: (video: Video) => Promise<void>;
  removeFavorite: (videoId: string) => Promise<void>;
  toggleFavorite: (video: Video) => Promise<void>;
  loadFavorites: () => Promise<void>;
}

export const useFavorites = (): UseFavoritesReturn => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const favoriteVideoIds = favorites.map(fav => fav.videoId);

  // Simple user ID management - in a real app, this would come from authentication
  const getUserId = () => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', userId);
    }
    return userId;
  };

  // Load favorites operation
  const loadOperation = useApiOperation(
    async () => {
      const userId = getUserId();
      const response = await apiRequest(
        () => api.get<{success: boolean, favorites: Favorite[], count: number}>(endpoints.favorites.list, {
          params: { userId }
        }),
        { customErrorMessage: 'お気に入りの読み込み中にエラーが発生しました。' }
      );

      if (response.success) {
        return response.favorites;
      } else {
        throw new Error('お気に入りの読み込みに失敗しました');
      }
    },
    {
      customErrorTitle: 'お気に入り読み込みエラー',
      showErrorToast: true
    }
  );

  // Add favorite operation
  const addOperation = useApiOperation(
    async (video: Video) => {
      const userId = getUserId();
      const response = await apiRequest(
        () => api.post<{success: boolean, favorite: Favorite, message: string}>(endpoints.favorites.add, { 
          userId, 
          video 
        }),
        { customErrorMessage: 'お気に入りの追加中にエラーが発生しました。' }
      );

      if (response.success) {
        return response.favorite;
      } else {
        throw new Error(response.message || 'お気に入りの追加に失敗しました');
      }
    },
    {
      customErrorTitle: 'お気に入り追加エラー',
      successMessage: 'お気に入りに追加しました',
      showErrorToast: true
    }
  );

  // Remove favorite operation
  const removeOperation = useApiOperation(
    async (videoId: string) => {
      const userId = getUserId();
      const response = await apiRequest(
        () => api.delete<{success: boolean, message: string}>(endpoints.favorites.remove(videoId), {
          params: { userId }
        }),
        { customErrorMessage: 'お気に入りの削除中にエラーが発生しました。' }
      );

      if (!response.success) {
        throw new Error(response.message || 'お気に入りの削除に失敗しました');
      }
    },
    {
      customErrorTitle: 'お気に入り削除エラー',
      successMessage: 'お気に入りから削除しました',
      showErrorToast: true
    }
  );

  const loadFavorites = useCallback(async () => {
    const result = await loadOperation.execute();
    if (result) {
      setFavorites(result);
    }
  }, [loadOperation.execute]);

  const addFavorite = useCallback(async (video: Video) => {
    // Optimistic update
    const optimisticFavorite: Favorite = {
      videoId: video.id,
      addedAt: new Date().toISOString(),
      video
    };
    
    setFavorites(prev => [...prev, optimisticFavorite]);

    try {
      const result = await addOperation.execute(video);
      if (result) {
        // Update with server response
        setFavorites(prev => 
          prev.map(fav => 
            fav.videoId === video.id ? result : fav
          )
        );
      }
    } catch (error) {
      // Revert optimistic update
      setFavorites(prev => prev.filter(fav => fav.videoId !== video.id));
      throw error;
    }
  }, [addOperation.execute]);

  const removeFavorite = useCallback(async (videoId: string) => {
    // Store the favorite for potential rollback
    const removedFavorite = favorites.find(fav => fav.videoId === videoId);
    
    // Optimistic update
    setFavorites(prev => prev.filter(fav => fav.videoId !== videoId));

    try {
      await removeOperation.execute(videoId);
    } catch (error) {
      // Revert optimistic update
      if (removedFavorite) {
        setFavorites(prev => [...prev, removedFavorite]);
      }
      throw error;
    }
  }, [favorites, removeOperation.execute]);

  const toggleFavorite = useCallback(async (video: Video) => {
    const isFavorite = favoriteVideoIds.includes(video.id);
    
    if (isFavorite) {
      await removeFavorite(video.id);
    } else {
      await addFavorite(video);
    }
  }, [favoriteVideoIds, addFavorite, removeFavorite]);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    favorites,
    favoriteVideoIds,
    loading: loadOperation.loading || addOperation.loading || removeOperation.loading,
    error: loadOperation.error || addOperation.error || removeOperation.error,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    loadFavorites
  };
};