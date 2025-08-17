import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useStatistics from '../useStatistics';
import * as api from '../../utils/api';

// Mock the API
vi.mock('../../utils/api', () => ({
  getStatistics: vi.fn()
}));

const mockStatistics = {
  totalVideosWatched: 127,
  totalFavorites: 23,
  totalSearches: 89,
  hoursWatched: 45.2,
  categoryDistribution: {
    gameplay: 12,
    tips: 8,
    reviews: 2,
    news: 1
  },
  searchHistory: [
    { date: '2023-01-01', searches: 12 },
    { date: '2023-01-02', searches: 8 },
    { date: '2023-01-03', searches: 15 },
    { date: '2023-01-04', searches: 6 },
    { date: '2023-01-05', searches: 20 },
    { date: '2023-01-06', searches: 18 },
    { date: '2023-01-07', searches: 10 }
  ],
  topSearchQueries: [
    { query: 'eFootball gameplay', count: 15 },
    { query: 'eFootball tips', count: 12 },
    { query: 'eFootball review', count: 8 }
  ]
};

describe('useStatistics', () => {
  const mockUserId = 'test-user-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useStatistics(mockUserId));
    
    expect(result.current.statistics).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads statistics on mount', async () => {
    vi.mocked(api.getStatistics).mockResolvedValue({
      success: true,
      statistics: mockStatistics
    });

    const { result } = renderHook(() => useStatistics(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(api.getStatistics).toHaveBeenCalledWith(mockUserId);
    expect(result.current.statistics).toEqual(mockStatistics);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles loading state correctly', async () => {
    vi.mocked(api.getStatistics).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        statistics: mockStatistics
      }), 100))
    );

    const { result } = renderHook(() => useStatistics(mockUserId));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.statistics).toEqual(mockStatistics);
  });

  it('handles error when loading statistics fails', async () => {
    const errorMessage = 'Failed to load statistics';
    vi.mocked(api.getStatistics).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useStatistics(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.statistics).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('refreshes statistics successfully', async () => {
    const updatedStatistics = {
      ...mockStatistics,
      totalVideosWatched: 150
    };

    vi.mocked(api.getStatistics)
      .mockResolvedValueOnce({
        success: true,
        statistics: mockStatistics
      })
      .mockResolvedValueOnce({
        success: true,
        statistics: updatedStatistics
      });

    const { result } = renderHook(() => useStatistics(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.statistics?.totalVideosWatched).toBe(127);

    await act(async () => {
      await result.current.refreshStatistics();
    });

    expect(result.current.statistics?.totalVideosWatched).toBe(150);
    expect(api.getStatistics).toHaveBeenCalledTimes(2);
  });

  it('handles error when refreshing statistics fails', async () => {
    vi.mocked(api.getStatistics)
      .mockResolvedValueOnce({
        success: true,
        statistics: mockStatistics
      })
      .mockRejectedValueOnce(new Error('Refresh failed'));

    const { result } = renderHook(() => useStatistics(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.statistics).toEqual(mockStatistics);

    await act(async () => {
      await result.current.refreshStatistics();
    });

    expect(result.current.error).toBe('Refresh failed');
    expect(result.current.statistics).toEqual(mockStatistics); // Should remain unchanged
  });

  it('does not load statistics if userId is empty', () => {
    renderHook(() => useStatistics(''));
    
    expect(api.getStatistics).not.toHaveBeenCalled();
  });

  it('reloads statistics when userId changes', async () => {
    vi.mocked(api.getStatistics).mockResolvedValue({
      success: true,
      statistics: mockStatistics
    });

    const { rerender } = renderHook(
      ({ userId }) => useStatistics(userId),
      { initialProps: { userId: 'user1' } }
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(api.getStatistics).toHaveBeenCalledWith('user1');

    rerender({ userId: 'user2' });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(api.getStatistics).toHaveBeenCalledWith('user2');
    expect(api.getStatistics).toHaveBeenCalledTimes(2);
  });

  it('provides chart data for category distribution', async () => {
    vi.mocked(api.getStatistics).mockResolvedValue({
      success: true,
      statistics: mockStatistics
    });

    const { result } = renderHook(() => useStatistics(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.getCategoryChartData()).toEqual({
      labels: ['Gameplay', 'Tips', 'Reviews', 'News'],
      datasets: [{
        data: [12, 8, 2, 1],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444'
        ],
        borderWidth: 0
      }]
    });
  });

  it('provides chart data for search history', async () => {
    vi.mocked(api.getStatistics).mockResolvedValue({
      success: true,
      statistics: mockStatistics
    });

    const { result } = renderHook(() => useStatistics(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.getSearchHistoryChartData()).toEqual({
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Searches',
        data: [12, 8, 15, 6, 20, 18, 10],
        backgroundColor: '#3B82F6',
        borderColor: '#2563EB',
        borderWidth: 2
      }]
    });
  });

  it('returns empty chart data when statistics are not loaded', () => {
    const { result } = renderHook(() => useStatistics(mockUserId));

    expect(result.current.getCategoryChartData()).toEqual({
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderWidth: 0
      }]
    });

    expect(result.current.getSearchHistoryChartData()).toEqual({
      labels: [],
      datasets: [{
        label: 'Searches',
        data: [],
        backgroundColor: '#3B82F6',
        borderColor: '#2563EB',
        borderWidth: 2
      }]
    });
  });

  it('handles statistics with missing category distribution', async () => {
    const statisticsWithoutCategories = {
      ...mockStatistics,
      categoryDistribution: {}
    };

    vi.mocked(api.getStatistics).mockResolvedValue({
      success: true,
      statistics: statisticsWithoutCategories
    });

    const { result } = renderHook(() => useStatistics(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.getCategoryChartData()).toEqual({
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderWidth: 0
      }]
    });
  });

  it('handles statistics with missing search history', async () => {
    const statisticsWithoutHistory = {
      ...mockStatistics,
      searchHistory: []
    };

    vi.mocked(api.getStatistics).mockResolvedValue({
      success: true,
      statistics: statisticsWithoutHistory
    });

    const { result } = renderHook(() => useStatistics(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.getSearchHistoryChartData()).toEqual({
      labels: [],
      datasets: [{
        label: 'Searches',
        data: [],
        backgroundColor: '#3B82F6',
        borderColor: '#2563EB',
        borderWidth: 2
      }]
    });
  });

  it('clears error when starting new statistics load', async () => {
    // First, cause an error
    vi.mocked(api.getStatistics).mockRejectedValueOnce(new Error('First error'));

    const { result } = renderHook(() => useStatistics(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('First error');

    // Then, make a successful load
    vi.mocked(api.getStatistics).mockResolvedValueOnce({
      success: true,
      statistics: mockStatistics
    });

    await act(async () => {
      await result.current.refreshStatistics();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.statistics).toEqual(mockStatistics);
  });
});