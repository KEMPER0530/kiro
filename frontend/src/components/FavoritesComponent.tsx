import React, { useEffect, useRef } from 'react';
import anime from 'animejs';
import { Favorite } from '../types';

interface FavoritesComponentProps {
  favorites: Favorite[];
  onVideoSelect: (videoId: string) => void;
  onRemoveFavorite: (videoId: string) => void;
  loading: boolean;
  error: string | null;
}

export const FavoritesComponent: React.FC<FavoritesComponentProps> = ({
  favorites,
  onVideoSelect,
  onRemoveFavorite,
  loading,
  error
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate favorites entrance with anime.js
    if (containerRef.current && favorites.length > 0) {
      const favoriteCards = containerRef.current.querySelectorAll('.favorite-card');
      anime({
        targets: favoriteCards,
        opacity: [0, 1],
        translateY: [30, 0],
        scale: [0.95, 1],
        delay: anime.stagger(100),
        duration: 800,
        easing: 'easeOutExpo'
      });
    }
  }, [favorites]);

  const formatDuration = (duration: string) => {
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

  const formatAddedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">お気に入りを読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">エラーが発生しました</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="card">
        <div className="text-center text-gray-500 py-12">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">お気に入りがありません</h3>
          <p className="text-gray-600 mb-4">動画を検索してお気に入りに追加してみましょう</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          お気に入り動画 ({favorites.length}件)
        </h3>
        <p className="text-gray-600">
          保存したeFootball動画の一覧です。
        </p>
      </div>

      <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((favorite) => (
          <div
            key={favorite.videoId}
            className="favorite-card bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
            onClick={() => onVideoSelect(favorite.videoId)}
          >
            <div className="relative">
              <img
                src={favorite.video.thumbnail.medium}
                alt={favorite.video.title}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
              />
              
              {/* Duration overlay */}
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {formatDuration(favorite.video.duration)}
              </div>
              
              {/* Remove favorite button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFavorite(favorite.videoId);
                }}
                className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                title="お気に入りから削除"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Favorite indicator */}
              <div className="absolute top-2 left-2 p-2 rounded-full bg-red-500 text-white">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>

              {/* Play overlay on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-white bg-opacity-90 rounded-full p-3">
                    <svg className="w-8 h-8 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <h4 className="font-semibold text-gray-800 mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                {favorite.video.title}
              </h4>
              
              <p className="text-sm text-gray-600 mb-2">
                {favorite.video.channelTitle}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>{formatViewCount(favorite.video.viewCount)}</span>
                <span>追加: {formatAddedDate(favorite.addedAt)}</span>
              </div>
              
              {favorite.video.category && (
                <div className="mt-2">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {favorite.video.category}
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