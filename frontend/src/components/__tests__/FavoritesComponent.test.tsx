import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FavoritesComponent } from '../FavoritesComponent';
import { Favorite } from '../../types';

// Mock anime.js
vi.mock('animejs', () => ({
  default: vi.fn(() => ({}))
}));

const mockFavorites: Favorite[] = [
  {
    videoId: 'test-video-1',
    addedAt: '2024-01-15T10:00:00Z',
    video: {
      id: 'test-video-1',
      title: 'eFootball 2024 ゲームプレイ',
      description: 'Test description',
      thumbnail: {
        default: 'https://example.com/thumb1.jpg',
        medium: 'https://example.com/thumb1_medium.jpg',
        high: 'https://example.com/thumb1_high.jpg'
      },
      channelTitle: 'Test Channel',
      publishedAt: '2024-01-10T10:00:00Z',
      duration: 'PT10M30S',
      viewCount: 15000,
      category: 'ゲームプレイ'
    }
  },
  {
    videoId: 'test-video-2',
    addedAt: '2024-01-16T10:00:00Z',
    video: {
      id: 'test-video-2',
      title: 'eFootball 攻略ガイド',
      description: 'Test description 2',
      thumbnail: {
        default: 'https://example.com/thumb2.jpg',
        medium: 'https://example.com/thumb2_medium.jpg',
        high: 'https://example.com/thumb2_high.jpg'
      },
      channelTitle: 'Guide Channel',
      publishedAt: '2024-01-12T10:00:00Z',
      duration: 'PT5M45S',
      viewCount: 8500,
      category: '攻略・コツ'
    }
  }
];

describe('FavoritesComponent', () => {
  const mockOnVideoSelect = vi.fn();
  const mockOnRemoveFavorite = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    render(
      <FavoritesComponent
        favorites={[]}
        onVideoSelect={mockOnVideoSelect}
        onRemoveFavorite={mockOnRemoveFavorite}
        loading={true}
        error={null}
      />
    );

    expect(screen.getByText('お気に入りを読み込み中...')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    const errorMessage = 'Failed to load favorites';
    render(
      <FavoritesComponent
        favorites={[]}
        onVideoSelect={mockOnVideoSelect}
        onRemoveFavorite={mockOnRemoveFavorite}
        loading={false}
        error={errorMessage}
      />
    );

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    render(
      <FavoritesComponent
        favorites={[]}
        onVideoSelect={mockOnVideoSelect}
        onRemoveFavorite={mockOnRemoveFavorite}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('お気に入りがありません')).toBeInTheDocument();
    expect(screen.getByText('動画を検索してお気に入りに追加してみましょう')).toBeInTheDocument();
  });

  it('renders favorites list correctly', () => {
    render(
      <FavoritesComponent
        favorites={mockFavorites}
        onVideoSelect={mockOnVideoSelect}
        onRemoveFavorite={mockOnRemoveFavorite}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('お気に入り動画 (2件)')).toBeInTheDocument();
    expect(screen.getByText('eFootball 2024 ゲームプレイ')).toBeInTheDocument();
    expect(screen.getByText('eFootball 攻略ガイド')).toBeInTheDocument();
    expect(screen.getByText('Test Channel')).toBeInTheDocument();
    expect(screen.getByText('Guide Channel')).toBeInTheDocument();
  });

  it('formats duration correctly', () => {
    render(
      <FavoritesComponent
        favorites={mockFavorites}
        onVideoSelect={mockOnVideoSelect}
        onRemoveFavorite={mockOnRemoveFavorite}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('5:45')).toBeInTheDocument();
  });

  it('formats view count correctly', () => {
    render(
      <FavoritesComponent
        favorites={mockFavorites}
        onVideoSelect={mockOnVideoSelect}
        onRemoveFavorite={mockOnRemoveFavorite}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('15.0K回視聴')).toBeInTheDocument();
    expect(screen.getByText('8.5K回視聴')).toBeInTheDocument();
  });

  it('displays categories correctly', () => {
    render(
      <FavoritesComponent
        favorites={mockFavorites}
        onVideoSelect={mockOnVideoSelect}
        onRemoveFavorite={mockOnRemoveFavorite}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('ゲームプレイ')).toBeInTheDocument();
    expect(screen.getByText('攻略・コツ')).toBeInTheDocument();
  });

  it('calls onVideoSelect when video card is clicked', async () => {
    render(
      <FavoritesComponent
        favorites={mockFavorites}
        onVideoSelect={mockOnVideoSelect}
        onRemoveFavorite={mockOnRemoveFavorite}
        loading={false}
        error={null}
      />
    );

    const videoCard = screen.getByText('eFootball 2024 ゲームプレイ').closest('.favorite-card');
    fireEvent.click(videoCard!);

    await waitFor(() => {
      expect(mockOnVideoSelect).toHaveBeenCalledWith('test-video-1');
    });
  });

  it('calls onRemoveFavorite when remove button is clicked', async () => {
    render(
      <FavoritesComponent
        favorites={mockFavorites}
        onVideoSelect={mockOnVideoSelect}
        onRemoveFavorite={mockOnRemoveFavorite}
        loading={false}
        error={null}
      />
    );

    const removeButtons = screen.getAllByTitle('お気に入りから削除');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockOnRemoveFavorite).toHaveBeenCalledWith('test-video-1');
    });
  });

  it('prevents video selection when remove button is clicked', async () => {
    render(
      <FavoritesComponent
        favorites={mockFavorites}
        onVideoSelect={mockOnVideoSelect}
        onRemoveFavorite={mockOnRemoveFavorite}
        loading={false}
        error={null}
      />
    );

    const removeButtons = screen.getAllByTitle('お気に入りから削除');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockOnRemoveFavorite).toHaveBeenCalledWith('test-video-1');
      expect(mockOnVideoSelect).not.toHaveBeenCalled();
    });
  });

  it('formats added date correctly', () => {
    render(
      <FavoritesComponent
        favorites={mockFavorites}
        onVideoSelect={mockOnVideoSelect}
        onRemoveFavorite={mockOnRemoveFavorite}
        loading={false}
        error={null}
      />
    );

    // Check that date formatting is working (exact format may vary by locale)
    expect(screen.getByText(/追加:/)).toBeInTheDocument();
  });
});