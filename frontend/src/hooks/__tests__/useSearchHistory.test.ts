import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useSearchHistory from '../useSearchHistory';
import * as api from '../../utils/api';

// Mock the API
vi.mock('../../utils/api', () => ({
  getSearchHistory: vi.fn(),
  addSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  deleteSearchHistory: vi.fn(),
  getSearchHistoryByCategory: vi.fn()
}));

const mockSearchHistory = [
  {
    query: 'eFootball gameplay',
    category: 'gameplay',
    timestamp: '2023-01-01T00:00:00Z',
    resultCount: 25
  },
  {
    query: 'eFootball tips',
    category: 'tips',
    timestamp: '2023-01-02T00:00:00Z',
    resultCount: 15
  }
];

const mockStatistics = {
  totalSearches: 50,
  uniqueQueries: 30,
  averageResultsPerSearch: 20,
  mostSearchedCategory: 'gameplay'
};

describe('useSearchHistory', () => {
  const mockUserId = 'test-user-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useSearchHistory(mockUserId));
    
    expect(result.current.history).toEqual([]);
    expect(result.current.recentQueries).toEqual([]);
    expect(result.current.statistics).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads search history on mount', async () => {
    vi.mocked(api.getSearchHistory).mockResolvedValue({
      success: true,
      history: mockSearchHistory,
      recentQueries: ['eFootball gameplay', 'eFootball tips'],
      statistics: mockStatistics,
      count: 2
    });

    const { result } = renderHook(() => useSearchHistory(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(api.getSearchHistory).toHaveBeenCalledWith(mockUserId);
    expect(result.current.history).toEqual(mockSearchHistory);
    expect(result.current.recentQueries).toEqual(['eFootball gameplay', 'eFootball tips']);
    expect(result.current.statistics).toEqual(mockStatistics);
    expect(result.current.loading).toBe(false);
  });

  it('handles loading state correctly', async () => {
    vi.mocked(api.getSearchHistory).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        history: [],
        recentQueries: [],
        statistics: null,
        count: 0
      }), 100))
    );

    const { result } = renderHook(() => useSearchHistory(mockUserId));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.loading).toBe(false);
  });

  it('handles error when loading search history fails', async () => {
    const errorMessage = 'Failed to load search history';
    vi.mocked(api.getSearchHistory).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSearchHistory(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.history).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('adds search history entry successfully', async () => {
    vi.mocked(api.getSearchHistory).mockResolvedValue({
      success: true,
      history: [],
      recentQueries: [],
      statistics: null,
      count: 0
    });

    vi.mocked(api.addSearchHistory).mockResolvedValue({
      success: true,
      message: 'Search query added to history',
      searchHistory: {
        query: 'new search',
        category: 'gameplay',
        timestamp: '2023-01-03T00:00:00Z',
        resultCount: 10
      }
    });

    const { result } = renderHook(() => useSearchHistory(mockUserId));

    await act(async () => {
      await result.current.addSearchHistory('new search', 'gameplay', 10);
    });

    expect(api.addSearchHistory).toHaveBeenCalledWith(mockUserId, 'new search', 'gameplay', 10);
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].query).toBe('new search');
  });

  it('handles error when adding search history fails', async () => {
    vi.mocked(api.getSearchHistory).mockResolvedValue({
      success: true,
      history: [],
      recentQueries: [],
      statistics: null,
      count: 0
    });

    const errorMessage = 'Failed to add search history';
    vi.mocked(api.addSearchHistory).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSearchHistory(mockUserId));

    await act(async () => {
      await result.current.addSearchHistory('test', 'gameplay', 5);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('clears search history successfully', async () => {
    const initialHistory = [mockSearchHistory[0]];
    
    vi.mocked(api.getSearchHistory).mockResolvedValue({
      success: true,
      history: initialHistory,
      recentQueries: ['test'],
      statistics: mockStatistics,
      count: 1
    });

    vi.mocked(api.clearSearchHistory).mockResolvedValue({
      success: true,
      message: 'Cleared 1 search history entries',
      deletedCount: 1
    });

    const { result } = renderHook(() => useSearchHistory(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.history).toHaveLength(1);

    await act(async () => {
      await result.current.clearHistory();
    });

    expect(api.clearSearchHistory).toHaveBeenCalledWith(mockUserId);
    expect(result.current.history).toEqual([]);
    expect(result.current.recentQueries).toEqual([]);
  });

  it('handles error when clearing search history fails', async () => {
    vi.mocked(api.getSearchHistory).mockResolvedValue({
      success: true,
      history: mockSearchHistory,
      recentQueries: ['test'],
      statistics: mockStatistics,
      count: 2
    });

    const errorMessage = 'Failed to clear search history';
    vi.mocked(api.clearSearchHistory).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSearchHistory(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.clearHistory();
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.history).toEqual(mockSearchHistory); // Should remain unchanged
  });

  it('deletes specific search history entry successfully', async () => {
    vi.mocked(api.getSearchHistory).mockResolvedValue({
      success: true,
      history: mockSearchHistory,
      recentQueries: ['test1', 'test2'],
      statistics: mockStatistics,
      count: 2
    });

    vi.mocked(api.deleteSearchHistory).mockResolvedValue({
      success: true,
      message: 'Search history entry deleted'
    });

    const { result } = renderHook(() => useSearchHistory(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.history).toHaveLength(2);

    await act(async () => {
      await result.current.deleteHistoryEntry('2023-01-01T00:00:00Z');
    });

    expect(api.deleteSearchHistory).toHaveBeenCalledWith(mockUserId, '2023-01-01T00:00:00Z');
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].timestamp).toBe('2023-01-02T00:00:00Z');
  });

  it('handles error when deleting search history entry fails', async () => {
    vi.mocked(api.getSearchHistory).mockResolvedValue({
      success: true,
      history: mockSearchHistory,
      recentQueries: ['test'],
      statistics: mockStatistics,
      count: 2
    });

    const errorMessage = 'Failed to delete search history entry';
    vi.mocked(api.deleteSearchHistory).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSearchHistory(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.deleteHistoryEntry('2023-01-01T00:00:00Z');
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.history).toHaveLength(2); // Should remain unchanged
  });

  it('gets search history by category successfully', async () => {
    const gameplayHistory = [mockSearchHistory[0]];
    
    vi.mocked(api.getSearchHistory).mockResolvedValue({
      success: true,
      history: [],
      recentQueries: [],
      statistics: null,
      count: 0
    });

    vi.mocked(api.getSearchHistoryByCategory).mockResolvedValue({
      success: true,
      history: gameplayHistory,
      count: 1
    });

    const { result } = renderHook(() => useSearchHistory(mockUserId));

    await act(async () => {
      await result.current.getHistoryByCategory('gameplay');
    });

    expect(api.getSearchHistoryByCategory).toHaveBeenCalledWith(mockUserId, 'gameplay');
    expect(result.current.history).toEqual(gameplayHistory);
  });

  it('does not load search history if userId is empty', () => {
    renderHook(() => useSearchHistory(''));
    
    expect(api.getSearchHistory).not.toHaveBeenCalled();
  });

  it('reloads search history when userId changes', async () => {
    vi.mocked(api.getSearchHistory).mockResolvedValue({
      success: true,
      history: [],
      recentQueries: [],
      statistics: null,
      count: 0
    });

    const { rerender } = renderHook(
      ({ userId }) => useSearchHistory(userId),
      { initialProps: { userId: 'user1' } }
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(api.getSearchHistory).toHaveBeenCalledWith('user1');

    rerender({ userId: 'user2' });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(api.getSearchHistory).toHaveBeenCalledWith('user2');
    expect(api.getSearchHistory).toHaveBeenCalledTimes(2);
  });

  it('refreshes search history', async () => {
    vi.mocked(api.getSearchHistory).mockResolvedValue({
      success: true,
      history: mockSearchHistory,
      recentQueries: ['test'],
      statistics: mockStatistics,
      count: 2
    });

    const { result } = renderHook(() => useSearchHistory(mockUserId));

    await act(async () => {
      await result.current.refreshHistory();
    });

    expect(api.getSearchHistory).toHaveBeenCalledWith(mockUserId);
    expect(result.current.history).toEqual(mockSearchHistory);
  });
});