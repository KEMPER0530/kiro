import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useVideoSearch from '../useVideoSearch';
import * as api from '../../utils/api';
import { Video } from '../../types';

// Mock the API
vi.mock('../../utils/api', () => ({
  searchVideos: vi.fn(),
  getPopularVideos: vi.fn(),
  getRelatedVideos: vi.fn()
}));

const mockVideo: Video = {
  id: 'test-video-1',
  title: 'Test eFootball Video',
  description: 'Test description',
  thumbnail: {
    default: 'https://example.com/thumb.jpg',
    medium: 'https://example.com/thumb_medium.jpg',
    high: 'https://example.com/thumb_high.jpg'
  },
  channelTitle: 'Test Channel',
  publishedAt: '2023-01-01T00:00:00Z',
  duration: 'PT5M30S',
  viewCount: 1000,
  category: 'gameplay'
};

describe('useVideoSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useVideoSearch());
    
    expect(result.current.videos).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedCategory).toBe('');
  });

  it('searches videos successfully', async () => {
    const mockSearchResult = {
      videos: [mockVideo],
      totalResults: 1,
      nextPageToken: null,
      cached: false
    };

    vi.mocked(api.searchVideos).mockResolvedValue(mockSearchResult);

    const { result } = renderHook(() => useVideoSearch());

    await act(async () => {
      await result.current.searchVideos('eFootball', 'gameplay');
    });

    expect(api.searchVideos).toHaveBeenCalledWith('eFootball', 'gameplay', 25);
    expect(result.current.videos).toEqual([mockVideo]);
    expect(result.current.searchQuery).toBe('eFootball');
    expect(result.current.selectedCategory).toBe('gameplay');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles loading state correctly during search', async () => {
    vi.mocked(api.searchVideos).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        videos: [],
        totalResults: 0,
        nextPageToken: null,
        cached: false
      }), 100))
    );

    const { result } = renderHook(() => useVideoSearch());

    act(() => {
      result.current.searchVideos('test');
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.loading).toBe(false);
  });

  it('handles search error', async () => {
    const errorMessage = 'Search failed';
    vi.mocked(api.searchVideos).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useVideoSearch());

    await act(async () => {
      await result.current.searchVideos('test');
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.videos).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('gets popular videos successfully', async () => {
    const mockPopularResult = {
      videos: [mockVideo],
      totalResults: 1,
      cached: false
    };

    vi.mocked(api.getPopularVideos).mockResolvedValue(mockPopularResult);

    const { result } = renderHook(() => useVideoSearch());

    await act(async () => {
      await result.current.getPopularVideos('gameplay');
    });

    expect(api.getPopularVideos).toHaveBeenCalledWith('gameplay', 25);
    expect(result.current.videos).toEqual([mockVideo]);
    expect(result.current.selectedCategory).toBe('gameplay');
    expect(result.current.loading).toBe(false);
  });

  it('handles popular videos error', async () => {
    const errorMessage = 'Failed to get popular videos';
    vi.mocked(api.getPopularVideos).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useVideoSearch());

    await act(async () => {
      await result.current.getPopularVideos();
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.videos).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('gets related videos successfully', async () => {
    const mockRelatedResult = {
      videos: [mockVideo],
      totalResults: 1,
      cached: false
    };

    vi.mocked(api.getRelatedVideos).mockResolvedValue(mockRelatedResult);

    const { result } = renderHook(() => useVideoSearch());

    await act(async () => {
      await result.current.getRelatedVideos('test-video-id');
    });

    expect(api.getRelatedVideos).toHaveBeenCalledWith('test-video-id', 10);
    expect(result.current.videos).toEqual([mockVideo]);
    expect(result.current.loading).toBe(false);
  });

  it('handles related videos error', async () => {
    const errorMessage = 'Failed to get related videos';
    vi.mocked(api.getRelatedVideos).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useVideoSearch());

    await act(async () => {
      await result.current.getRelatedVideos('test-video-id');
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.videos).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('clears search results', () => {
    const { result } = renderHook(() => useVideoSearch());

    // Set some initial state
    act(() => {
      result.current.searchVideos('test');
    });

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.videos).toEqual([]);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedCategory).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('sets category correctly', () => {
    const { result } = renderHook(() => useVideoSearch());

    act(() => {
      result.current.setCategory('tips');
    });

    expect(result.current.selectedCategory).toBe('tips');
  });

  it('uses default maxResults when not specified', async () => {
    vi.mocked(api.searchVideos).mockResolvedValue({
      videos: [],
      totalResults: 0,
      nextPageToken: null,
      cached: false
    });

    const { result } = renderHook(() => useVideoSearch());

    await act(async () => {
      await result.current.searchVideos('test');
    });

    expect(api.searchVideos).toHaveBeenCalledWith('test', '', 25);
  });

  it('uses custom maxResults when specified', async () => {
    vi.mocked(api.searchVideos).mockResolvedValue({
      videos: [],
      totalResults: 0,
      nextPageToken: null,
      cached: false
    });

    const { result } = renderHook(() => useVideoSearch());

    await act(async () => {
      await result.current.searchVideos('test', 'gameplay', 10);
    });

    expect(api.searchVideos).toHaveBeenCalledWith('test', 'gameplay', 10);
  });

  it('handles empty search query', async () => {
    vi.mocked(api.searchVideos).mockResolvedValue({
      videos: [],
      totalResults: 0,
      nextPageToken: null,
      cached: false
    });

    const { result } = renderHook(() => useVideoSearch());

    await act(async () => {
      await result.current.searchVideos('');
    });

    expect(api.searchVideos).toHaveBeenCalledWith('', '', 25);
    expect(result.current.searchQuery).toBe('');
  });

  it('handles undefined category', async () => {
    vi.mocked(api.searchVideos).mockResolvedValue({
      videos: [],
      totalResults: 0,
      nextPageToken: null,
      cached: false
    });

    const { result } = renderHook(() => useVideoSearch());

    await act(async () => {
      await result.current.searchVideos('test', undefined);
    });

    expect(api.searchVideos).toHaveBeenCalledWith('test', '', 25);
    expect(result.current.selectedCategory).toBe('');
  });

  it('clears error when starting new search', async () => {
    // First, cause an error
    vi.mocked(api.searchVideos).mockRejectedValueOnce(new Error('First error'));

    const { result } = renderHook(() => useVideoSearch());

    await act(async () => {
      await result.current.searchVideos('test');
    });

    expect(result.current.error).toBe('First error');

    // Then, make a successful search
    vi.mocked(api.searchVideos).mockResolvedValueOnce({
      videos: [mockVideo],
      totalResults: 1,
      nextPageToken: null,
      cached: false
    });

    await act(async () => {
      await result.current.searchVideos('new test');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.videos).toEqual([mockVideo]);
  });
});