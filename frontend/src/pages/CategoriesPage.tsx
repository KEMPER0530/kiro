import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CategoryFilterComponent } from '../components/CategoryFilterComponent';
import { VideoListComponent } from '../components/VideoListComponent';
import { SearchParams, Category } from '../types';
import { useVideoSearch } from '../hooks/useVideoSearch';
import { useFavorites } from '../hooks/useFavorites';

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
  },
  {
    id: 'skills',
    name: 'スキル・テクニック',
    searchTerms: ['skill', 'technique', 'スキル', 'テクニック', 'ドリブル', 'シュート']
  },
  {
    id: 'players',
    name: '選手・チーム',
    searchTerms: ['player', 'team', '選手', 'チーム', 'レジェンド']
  }
];

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { videos, loading, error, searchVideos, clearResults } = useVideoSearch();
  const { favoriteVideoIds, toggleFavorite } = useFavorites();
  
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || ''
  );

  // Load initial category from URL params
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl && categoryFromUrl !== selectedCategory) {
      setSelectedCategory(categoryFromUrl);
      handleCategorySearch(categoryFromUrl);
    }
  }, []);

  const handleCategorySearch = async (categoryName: string) => {
    if (!categoryName) {
      clearResults();
      return;
    }

    const category = defaultCategories.find(cat => cat.name === categoryName);
    if (!category) return;

    const searchParams: SearchParams = {
      query: category.searchTerms.join(' OR '),
      category: categoryName,
      maxResults: 25
    };

    await searchVideos(searchParams);
  };

  const handleCategoryChange = async (categoryName: string) => {
    setSelectedCategory(categoryName);
    
    // Update URL params
    if (categoryName) {
      setSearchParams({ category: categoryName });
    } else {
      setSearchParams({});
    }

    await handleCategorySearch(categoryName);
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
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          カテゴリ別動画
        </h1>
        <p className="text-gray-600">
          eFootball関連動画をカテゴリ別に探索できます。興味のあるカテゴリを選択してください。
        </p>
      </div>

      {/* Category Filter */}
      <CategoryFilterComponent
        categories={defaultCategories}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        loading={loading}
      />

      {/* Category Description */}
      {selectedCategory && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            {selectedCategory}の動画
          </h2>
          <p className="text-blue-700 text-sm">
            {(() => {
              const category = defaultCategories.find(cat => cat.name === selectedCategory);
              switch (category?.id) {
                case 'gameplay':
                  return 'eFootballのゲームプレイ動画、実況プレイ、対戦動画などをご覧いただけます。';
                case 'tips':
                  return '上達のコツ、攻略法、テクニック解説など、スキルアップに役立つ動画を集めました。';
                case 'review':
                  return 'ゲームのレビュー、評価、感想などの動画をまとめています。';
                case 'news':
                  return '最新のアップデート情報、ニュース、新機能の紹介動画などをお届けします。';
                case 'skills':
                  return 'ドリブル、シュート、パスなどの具体的なスキル・テクニック動画を集めました。';
                case 'players':
                  return '注目選手の紹介、チーム戦術、レジェンド選手の解説動画などをご覧いただけます。';
                default:
                  return 'このカテゴリの動画を表示しています。';
              }
            })()}
          </p>
        </div>
      )}

      {/* Video Results */}
      <VideoListComponent
        videos={videos}
        onVideoSelect={handleVideoSelect}
        onFavoriteToggle={handleFavoriteToggle}
        loading={loading}
        error={error}
        favoriteVideoIds={favoriteVideoIds}
      />

      {/* Empty State for No Category Selected */}
      {!selectedCategory && !loading && videos.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            カテゴリを選択してください
          </h3>
          <p className="text-gray-600 mb-6">
            上のカテゴリフィルターから興味のあるカテゴリを選択すると、関連する動画が表示されます。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {defaultCategories.slice(0, 6).map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.name)}
                className="p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all duration-200 text-sm font-medium text-gray-700 hover:text-blue-700"
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};