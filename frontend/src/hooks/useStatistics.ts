import { useState, useCallback, useEffect } from 'react';
import { Favorite, SearchHistory, ApiResponse } from '../types';
import { api, endpoints } from '../utils/api';

// Statistics data types
export interface CategoryStats {
  name: string;
  count: number;
  percentage: number;
}

export interface SearchHistoryStats {
  date: string;
  count: number;
  queries: string[];
}

export interface ViewingStats {
  totalFavorites: number;
  totalSearches: number;
  mostPopularCategory: string;
  averageSearchesPerDay: number;
  topSearchQueries: { query: string; count: number }[];
}

interface UseStatisticsReturn {
  categoryStats: CategoryStats[];
  searchHistoryStats: SearchHistoryStats[];
  viewingStats: ViewingStats | null;
  loading: boolean;
  error: string | null;
  loadStatistics: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useStatistics = (): UseStatisticsReturn => {
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [searchHistoryStats, setSearchHistoryStats] = useState<SearchHistoryStats[]>([]);
  const [viewingStats, setViewingStats] = useState<ViewingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processCategoryStats = useCallback((favorites: Favorite[]): CategoryStats[] => {
    const categoryCount: { [key: string]: number } = {};
    
    // Count favorites by category
    favorites.forEach(favorite => {
      const category = favorite.video.category || 'その他';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const total = favorites.length;
    
    return Object.entries(categoryCount).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  }, []);

  const processSearchHistoryStats = useCallback((searchHistory: SearchHistory[]): SearchHistoryStats[] => {
    const dailyStats: { [date: string]: { count: number; queries: Set<string> } } = {};
    
    searchHistory.forEach(search => {
      const date = new Date(search.timestamp).toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric'
      });
      
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, queries: new Set() };
      }
      
      dailyStats[date].count++;
      dailyStats[date].queries.add(search.query);
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        queries: Array.from(stats.queries)
      }))
      .sort((a, b) => {
        // Sort by date (assuming format is M/D)
        const [aMonth, aDay] = a.date.split('/').map(Number);
        const [bMonth, bDay] = b.date.split('/').map(Number);
        return (aMonth * 100 + aDay) - (bMonth * 100 + bDay);
      })
      .slice(-7); // Last 7 days
  }, []);

  const calculateViewingStats = useCallback((
    favorites: Favorite[], 
    searchHistory: SearchHistory[]
  ): ViewingStats => {
    const categoryCount: { [key: string]: number } = {};
    const queryCount: { [key: string]: number } = {};
    
    // Process favorites
    favorites.forEach(favorite => {
      const category = favorite.video.category || 'その他';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    // Process search history
    searchHistory.forEach(search => {
      queryCount[search.query] = (queryCount[search.query] || 0) + 1;
    });

    // Find most popular category
    const mostPopularCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'なし';

    // Calculate average searches per day (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSearches = searchHistory.filter(
      search => new Date(search.timestamp) >= sevenDaysAgo
    );
    const averageSearchesPerDay = Math.round(recentSearches.length / 7 * 10) / 10;

    // Top search queries
    const topSearchQueries = Object.entries(queryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));

    return {
      totalFavorites: favorites.length,
      totalSearches: searchHistory.length,
      mostPopularCategory,
      averageSearchesPerDay,
      topSearchQueries
    };
  }, []);

  const loadStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load favorites and search history in parallel
      const [favoritesResponse, searchHistoryResponse] = await Promise.all([
        api.get<ApiResponse<Favorite[]>>(endpoints.favorites.list),
        api.get<ApiResponse<SearchHistory[]>>(endpoints.searchHistory.list, {
          params: { userId: 'default-user' } // TODO: Replace with actual user ID
        })
      ]);

      if (favoritesResponse.data.success && searchHistoryResponse.data.success) {
        const favorites = favoritesResponse.data.data;
        const searchHistory = searchHistoryResponse.data.data;

        // Process statistics
        const categoryStats = processCategoryStats(favorites);
        const searchHistoryStats = processSearchHistoryStats(searchHistory);
        const viewingStats = calculateViewingStats(favorites, searchHistory);

        setCategoryStats(categoryStats);
        setSearchHistoryStats(searchHistoryStats);
        setViewingStats(viewingStats);
      } else {
        const errorMsg = favoritesResponse.data.message || searchHistoryResponse.data.message;
        setError(errorMsg || '統計データの読み込みに失敗しました');
      }
    } catch (err: any) {
      console.error('Load statistics error:', err);
      setError('統計データの読み込み中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, [processCategoryStats, processSearchHistoryStats, calculateViewingStats]);

  const refreshStats = useCallback(async () => {
    await loadStatistics();
  }, [loadStatistics]);

  // Load statistics on mount
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  return {
    categoryStats,
    searchHistoryStats,
    viewingStats,
    loading,
    error,
    loadStatistics,
    refreshStats
  };
};