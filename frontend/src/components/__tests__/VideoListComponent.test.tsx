import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VideoListComponent from '../VideoListComponent';
import { Video } from '../../types';

describe('VideoListComponent', () => {
  const mockOnVideoSelect = vi.fn();
  const mockOnFavoriteToggle = vi.fn();

  const mockVideos: Video[] = [
    {
      id: 'video1',
      title: 'eFootball Gameplay Video 1',
      description: 'Amazing gameplay footage',
      thumbnail: {
        default: 'https://example.com/thumb1.jpg',
        medium: 'https://example.com/thumb1_medium.jpg',
        high: 'https://example.com/thumb1_high.jpg'
      },
      channelTitle: 'Gaming Channel',
      publishedAt: '2023-01-01T00:00:00Z',
      duration: 'PT5M30S',
      viewCount: 1000,
      category: 'gameplay'
    },
    {
      id: 'video2',
      title: 'eFootball Tips and Tricks',
      description: 'Learn the best strategies',
      thumbnail: {
        default: 'https://example.com/thumb2.jpg',
        medium: 'https://example.com/thumb2_medium.jpg',
        high: 'https://example.com/thumb2_high.jpg'
      },
      channelTitle: 'Tips Channel',
      publishedAt: '2023-01-02T00:00:00Z',
      duration: 'PT10M15S',
      viewCount: 5000,
      category: 'tips'
    }
  ];

  const defaultProps = {
    videos: mockVideos,
    onVideoSelect: mockOnVideoSelect,
    onFavoriteToggle: mockOnFavoriteToggle,
    favorites: [],
    loading: false
  };

  beforeEach(() => {
    mockOnVideoSelect.mockClear();
    mockOnFavoriteToggle.mockClear();
  });

  it('renders list of videos', () => {
    render(<VideoListComponent {...defaultProps} />);
    
    expect(screen.getByText('eFootball Gameplay Video 1')).toBeInTheDocument();
    expect(screen.getByText('eFootball Tips and Tricks')).toBeInTheDocument();
    expect(screen.getByText('Gaming Channel')).toBeInTheDocument();
    expect(screen.getByText('Tips Channel')).toBeInTheDocument();
  });

  it('displays video thumbnails', () => {
    render(<VideoListComponent {...defaultProps} />);
    
    const thumbnails = screen.getAllByRole('img');
    expect(thumbnails).toHaveLength(2);
    expect(thumbnails[0]).toHaveAttribute('src', 'https://example.com/thumb1_medium.jpg');
    expect(thumbnails[1]).toHaveAttribute('src', 'https://example.com/thumb2_medium.jpg');
  });

  it('calls onVideoSelect when video is clicked', () => {
    render(<VideoListComponent {...defaultProps} />);
    
    const videoCard = screen.getByText('eFootball Gameplay Video 1').closest('div');
    fireEvent.click(videoCard!);
    
    expect(mockOnVideoSelect).toHaveBeenCalledWith('video1');
  });

  it('calls onFavoriteToggle when favorite button is clicked', () => {
    render(<VideoListComponent {...defaultProps} />);
    
    const favoriteButtons = screen.getAllByTestId('favorite-button');
    fireEvent.click(favoriteButtons[0]);
    
    expect(mockOnFavoriteToggle).toHaveBeenCalledWith(mockVideos[0]);
  });

  it('shows filled heart for favorited videos', () => {
    const propsWithFavorites = {
      ...defaultProps,
      favorites: ['video1']
    };
    
    render(<VideoListComponent {...propsWithFavorites} />);
    
    const favoriteButtons = screen.getAllByTestId('favorite-button');
    expect(favoriteButtons[0]).toHaveClass('text-red-500');
    expect(favoriteButtons[1]).toHaveClass('text-gray-400');
  });

  it('displays video duration', () => {
    render(<VideoListComponent {...defaultProps} />);
    
    expect(screen.getByText('5:30')).toBeInTheDocument();
    expect(screen.getByText('10:15')).toBeInTheDocument();
  });

  it('displays view count', () => {
    render(<VideoListComponent {...defaultProps} />);
    
    expect(screen.getByText('1,000 views')).toBeInTheDocument();
    expect(screen.getByText('5,000 views')).toBeInTheDocument();
  });

  it('displays category badges', () => {
    render(<VideoListComponent {...defaultProps} />);
    
    expect(screen.getByText('Gameplay')).toBeInTheDocument();
    expect(screen.getByText('Tips')).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    render(<VideoListComponent {...defaultProps} loading={true} />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading videos...')).toBeInTheDocument();
  });

  it('shows empty state when no videos are provided', () => {
    render(<VideoListComponent {...defaultProps} videos={[]} />);
    
    expect(screen.getByText('No videos found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
  });

  it('handles video cards with missing thumbnails gracefully', () => {
    const videosWithMissingThumbnail = [
      {
        ...mockVideos[0],
        thumbnail: {
          default: '',
          medium: '',
          high: ''
        }
      }
    ];
    
    render(<VideoListComponent {...defaultProps} videos={videosWithMissingThumbnail} />);
    
    const thumbnail = screen.getByRole('img');
    expect(thumbnail).toHaveAttribute('src', '');
    expect(thumbnail).toHaveAttribute('alt', 'eFootball Gameplay Video 1');
  });

  it('formats published date correctly', () => {
    render(<VideoListComponent {...defaultProps} />);
    
    // Check that dates are displayed (format may vary based on implementation)
    expect(screen.getByText(/2023/)).toBeInTheDocument();
  });

  it('applies hover effects on video cards', () => {
    render(<VideoListComponent {...defaultProps} />);
    
    const videoCards = screen.getAllByTestId('video-card');
    videoCards.forEach(card => {
      expect(card).toHaveClass('hover:shadow-lg', 'transition-shadow');
    });
  });

  it('has proper accessibility attributes', () => {
    render(<VideoListComponent {...defaultProps} />);
    
    const videoCards = screen.getAllByTestId('video-card');
    videoCards.forEach(card => {
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
    
    const thumbnails = screen.getAllByRole('img');
    thumbnails.forEach((thumbnail, index) => {
      expect(thumbnail).toHaveAttribute('alt', mockVideos[index].title);
    });
  });

  it('supports keyboard navigation', () => {
    render(<VideoListComponent {...defaultProps} />);
    
    const firstVideoCard = screen.getAllByTestId('video-card')[0];
    
    fireEvent.keyDown(firstVideoCard, { key: 'Enter', code: 'Enter' });
    expect(mockOnVideoSelect).toHaveBeenCalledWith('video1');
    
    fireEvent.keyDown(firstVideoCard, { key: ' ', code: 'Space' });
    expect(mockOnVideoSelect).toHaveBeenCalledWith('video1');
  });
});