import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs';
import { useFavorites } from '../hooks/useFavorites';
import { FavoritesComponent } from '../components/FavoritesComponent';

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { favorites, loading, error, removeFavorite } = useFavorites();

  useEffect(() => {
    // Animate page entrance with anime.js
    if (containerRef.current) {
      anime({
        targets: containerRef.current.children,
        opacity: [0, 1],
        translateY: [30, 0],
        delay: anime.stagger(100),
        duration: 800,
        easing: 'easeOutExpo'
      });
    }
  }, [favorites]);

  const handleVideoSelect = (videoId: string) => {
    navigate(`/watch/${videoId}`);
  };

  const handleRemoveFavorite = async (videoId: string) => {
    try {
      await removeFavorite(videoId);
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto">
      <div className="card mb-8 fade-in">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          お気に入り動画
        </h1>
        <p className="text-gray-600">
          保存したeFootball動画の一覧です。
        </p>
      </div>

      <div className="fade-in">
        <FavoritesComponent
          favorites={favorites}
          onVideoSelect={handleVideoSelect}
          onRemoveFavorite={handleRemoveFavorite}
          loading={loading}
          error={error}
        />
        
        {favorites.length === 0 && !loading && !error && (
          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/search')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              動画を検索
            </button>
          </div>
        )}
      </div>
    </div>
  );
};