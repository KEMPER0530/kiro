import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchComponent } from '../components/SearchComponent';
import { CategoryFilterComponent } from '../components/CategoryFilterComponent';
import { VideoListComponent } from '../components/VideoListComponent';
import { SearchParams, Category } from '../types';
import { useVideoSearch } from '../hooks/useVideoSearch';
import { useFavorites } from '../hooks/useFavorites';
import { useSearchHistory } from '../hooks/useSearchHistory';

// Default categories for eFootball content
const defaultCategories: Category[] = [
  {
    id: 'gameplay',
    name: 'ゲームプレイ',
    searchTerms: ['gameplay', 'プレイ', 'プレー', '実況', '対戦']
  },
  {
    id: 'tips',
    name: '攻略・コツ',
    searchTerms: ['tips', 'guide', '攻略', 'コツ', 'テクニック', 'tutorial', '解説']
  },
  {
    id: 'review',
    name: 'レビュー',
    searchTerms: ['review', 'レビュー', '評価', '感想']
  },
  {
    id: 'news',
    name: 'ニュース',
    searchTerms: ['news', 'update', 'ニュース', '最新', 'アップデート']
  }
];

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { videos, loading, error, searchVideos, clearResults, retry } = useVideoSearch();
  const { favoriteVideoIds, toggleFavorite } = useFavorites();
  const { addSearchHistory } = useSearchHistory();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [lastSearchParams, setLastSearchParams] = useState<SearchParams>({});

  const handleSearch = async (params: SearchParams) => {
    setLastSearchParams(params);
    setSelectedCategory(params.category || '');
    
    // Save search history if there's a query
    if (params.query && params.query.trim()) {
      await addSearchHistory(params.query.trim());
    }
    
    await searchVideos(params);
  };

  const handleCategoryChange = async (categoryName: string) => {
    setSelectedCategory(categoryName);
    
    // Combine category filter with existing search query
    const searchParams: SearchParams = {
      ...lastSearchParams,
      category: categoryName,
      maxResults: 20
    };

    await searchVideos(searchParams);
  };

  const handleVideoSelect = (videoId: string) => {
    navigate(`/watch/${videoId}`);
  };

  const handleFavoriteToggle = async (video: any) => {
    try {
      await toggleFavorite(video);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // TODO: Show error toast
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <SearchComponent
        onSearch={handleSearch}
        loading={loading}
        categories={defaultCategories}
        error={error}
        onRetry={retry}
      />

      {/* Category Filter - only show if there are search results or a search has been performed */}
      {(videos.length > 0 || lastSearchParams.query || lastSearchParams.category) && (
        <CategoryFilterComponent
          categories={defaultCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          loading={loading}
        />
      )}

      <VideoListComponent
        videos={videos}
        onVideoSelect={handleVideoSelect}
        onFavoriteToggle={handleFavoriteToggle}
        loading={loading}
        error={error}
        favoriteVideoIds={favoriteVideoIds}
        onRetry={retry}
      />
    </div>
  );
};