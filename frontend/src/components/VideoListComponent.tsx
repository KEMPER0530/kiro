import React, { useEffect, useRef } from 'react';
import anime from 'animejs';
import { Video } from '../types';
import { ApiError } from '../utils/api';
import { LoadingSpinner, VideoCardSkeleton } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface VideoListComponentProps {
  videos: Video[];
  onVideoSelect: (videoId: string) => void;
  onFavoriteToggle: (video: Video) => void;
  loading: boolean;
  error: ApiError | null;
  favoriteVideoIds: string[];
  onRetry?: () => void;
}

export const VideoListComponent: React.FC<VideoListComponentProps> = ({
  videos,
  onVideoSelect,
  onFavoriteToggle,
  loading,
  error,
  favoriteVideoIds,
  onRetry
}) => {
  const videoListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate video cards entrance
    if (videoListRef.current && videos.length > 0) {
      const videoCards = videoListRef.current.querySelectorAll('.video-card');
      anime({
        targets: videoCards,
        opacity: [0, 1],
        translateY: [30, 0],
        scale: [0.9, 1],
        delay: anime.stagger(100),
        duration: 600,
        easing: 'easeOutExpo'
      });
    }
  }, [videos]);

  const formatDuration = (duration: string) => {
    // Convert ISO 8601 duration to readable format
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return duration;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M回視聴`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K回視聴`;
    }
    return `${count}回視聴`;
  };

  const formatPublishedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1日前';
    if (diffDays < 7) return `${diffDays}日前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  };

  const isFavorite = (videoId: string) => favoriteVideoIds.includes(videoId);

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold text-gray-800 mb-6">
          動画を検索中...
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, index) => (
            <VideoCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        title="動画検索エラー"
        message={error.message}
        onRetry={error.retryable && onRetry ? onRetry : undefined}
      />
    );
  }

  if (videos.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">動画が見つかりませんでした</h3>
          <p className="text-gray-600">別のキーワードで検索してみてください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-6">
        検索結果 ({videos.length}件)
      </h3>
      
      <div ref={videoListRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div
            key={video.id}
            className="video-card bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            onClick={() => onVideoSelect(video.id)}
          >
            <div className="relative">
              <img
                src={video.thumbnail.medium}
                alt={video.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {formatDuration(video.duration)}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFavoriteToggle(video);
                }}
                className={`favorite-button absolute top-2 right-2 p-2 rounded-full ${
                  isFavorite(video.id)
                    ? 'bg-red-500 text-white shadow-lg is-favorite'
                    : 'bg-white bg-opacity-75 text-gray-600 hover:bg-opacity-100 hover:text-red-500'
                }`}
                title={isFavorite(video.id) ? 'お気に入りから削除' : 'お気に入りに追加'}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <h4 className="font-semibold text-gray-800 mb-2 line-clamp-2 leading-tight">
                {video.title}
              </h4>
              
              <p className="text-sm text-gray-600 mb-2">
                {video.channelTitle}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatViewCount(video.viewCount)}</span>
                <span>{formatPublishedDate(video.publishedAt)}</span>
              </div>
              
              {video.category && (
                <div className="mt-2">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {video.category}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};