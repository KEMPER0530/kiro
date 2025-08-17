import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useFavorites from '../useFavorites';
import * as api from '../../utils/api';
import { Video } from '../../types';

// Mock the API
vi.mock('../../utils/api', () => ({
  getFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn()
}));

const mockVideo: Video = {
  id: 'test-video-1',
  title: 'Test Video',
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

describe('useFavorites', () => {
  const mockUserId = 'test-user-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty favorites and loading false', () => {
    const { result } = renderHook(() => useFavorites(mockUserId));
    
    expect(result.current.favorites).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads favorites on mount', async () => {
    const mockFavorites = [
      { videoId: 'video1', video: mockVideo, addedAt: '2023-01-01T00:00:00Z' }
    ];
    
    vi.mocked(api.getFavorites).mockResolvedValue({
      success: true,
      favorites: mockFavorites,
      count: 1
    });

    const { result } = renderHook(() => useFavorites(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(api.getFavorites).toHaveBeenCalledWith(mockUserId);
    expect(result.current.favorites).toEqual(mockFavorites);
    expect(result.current.loading).toBe(false);
  });

  it('handles loading state correctly', async () => {
    vi.mocked(api.getFavorites).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        favorites: [],
        count: 0
      }), 100))
    );

    const { result } = renderHook(() => useFavorites(mockUserId));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.loading).toBe(false);
  });

  it('handles error when loading favorites fails', async () => {
    const errorMessage = 'Failed to load favorites';
    vi.mocked(api.getFavorites).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useFavorites(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.favorites).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('adds favorite successfully', async () => {
    vi.mocked(api.getFavorites).mockResolvedValue({
      success: true,
      favorites: [],
      count: 0
    });

    vi.mocked(api.addFavorite).mockResolvedValue({
      success: true,
      message: 'Video added to favorites',
      favorite: {
        videoId: mockVideo.id,
        video: mockVideo,
        addedAt: '2023-01-01T00:00:00Z'
      }
    });

    const { result } = renderHook(() => useFavorites(mockUserId));

    await act(async () => {
      await result.current.addFavorite(mockVideo);
    });

    expect(api.addFavorite).toHaveBeenCalledWith(mockUserId, mockVideo);
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].videoId).toBe(mockVideo.id);
  });

  it('handles error when adding favorite fails', async () => {
    vi.mocked(api.getFavorites).mockResolvedValue({
      success: true,
      favorites: [],
      count: 0
    });

    const errorMessage = 'Failed to add favorite';
    vi.mocked(api.addFavorite).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useFavorites(mockUserId));

    await act(async () => {
      await result.current.addFavorite(mockVideo);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('removes favorite successfully', async () => {
    const initialFavorites = [
      { videoId: mockVideo.id, video: mockVideo, addedAt: '2023-01-01T00:00:00Z' }
    ];

    vi.mocked(api.getFavorites).mockResolvedValue({
      success: true,
      favorites: initialFavorites,
      count: 1
    });

    vi.mocked(api.removeFavorite).mockResolvedValue({
      success: true,
      message: 'Video removed from favorites'
    });

    const { result } = renderHook(() => useFavorites(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.favorites).toHaveLength(1);

    await act(async () => {
      await result.current.removeFavorite(mockVideo.id);
    });

    expect(api.removeFavorite).toHaveBeenCalledWith(mockUserId, mockVideo.id);
    expect(result.current.favorites).toHaveLength(0);
  });

  it('handles error when removing favorite fails', async () => {
    const initialFavorites = [
      { videoId: mockVideo.id, video: mockVideo, addedAt: '2023-01-01T00:00:00Z' }
    ];

    vi.mocked(api.getFavorites).mockResolvedValue({
      success: true,
      favorites: initialFavorites,
      count: 1
    });

    const errorMessage = 'Failed to remove favorite';
    vi.mocked(api.removeFavorite).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useFavorites(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.removeFavorite(mockVideo.id);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.favorites).toHaveLength(1); // Should remain unchanged
  });

  it('checks if video is favorite correctly', async () => {
    const initialFavorites = [
      { videoId: 'video1', video: mockVideo, addedAt: '2023-01-01T00:00:00Z' }
    ];

    vi.mocked(api.getFavorites).mockResolvedValue({
      success: true,
      favorites: initialFavorites,
      count: 1
    });

    const { result } = renderHook(() => useFavorites(mockUserId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isFavorite('video1')).toBe(true);
    expect(result.current.isFavorite('video2')).toBe(false);
  });

  it('toggles favorite correctly', async () => {
    vi.mocked(api.getFavorites).mockResolvedValue({
      success: true,
      favorites: [],
      count: 0
    });

    vi.mocked(api.addFavorite).mockResolvedValue({
      success: true,
      message: 'Video added to favorites',
      favorite: {
        videoId: mockVideo.id,
        video: mockVideo,
        addedAt: '2023-01-01T00:00:00Z'
      }
    });

    vi.mocked(api.removeFavorite).mockResolvedValue({
      success: true,
      message: 'Video removed from favorites'
    });

    const { result } = renderHook(() => useFavorites(mockUserId));

    // Add favorite
    await act(async () => {
      await result.current.toggleFavorite(mockVideo);
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(api.addFavorite).toHaveBeenCalledWith(mockUserId, mockVideo);

    // Remove favorite
    await act(async () => {
      await result.current.toggleFavorite(mockVideo);
    });

    expect(result.current.favorites).toHaveLength(0);
    expect(api.removeFavorite).toHaveBeenCalledWith(mockUserId, mockVideo.id);
  });

  it('does not reload favorites if userId is empty', () => {
    renderHook(() => useFavorites(''));
    
    expect(api.getFavorites).not.toHaveBeenCalled();
  });

  it('reloads favorites when userId changes', async () => {
    vi.mocked(api.getFavorites).mockResolvedValue({
      success: true,
      favorites: [],
      count: 0
    });

    const { rerender } = renderHook(
      ({ userId }) => useFavorites(userId),
      { initialProps: { userId: 'user1' } }
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(api.getFavorites).toHaveBeenCalledWith('user1');

    rerender({ userId: 'user2' });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(api.getFavorites).toHaveBeenCalledWith('user2');
    expect(api.getFavorites).toHaveBeenCalledTimes(2);
  });
});