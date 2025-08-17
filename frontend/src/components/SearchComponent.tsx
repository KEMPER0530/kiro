import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import { SearchParams, Category } from '../types';
import { ApiError } from '../utils/api';

interface SearchComponentProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
  categories: Category[];
  error?: ApiError | null;
  onRetry?: () => void;
}

export const SearchComponent: React.FC<SearchComponentProps> = ({
  onSearch,
  loading,
  categories,
  error,
  onRetry
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const searchFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate component entrance
    if (searchFormRef.current) {
      anime({
        targets: searchFormRef.current.children,
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(100),
        duration: 600,
        easing: 'easeOutExpo'
      });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() || selectedCategory) {
      onSearch({
        query: query.trim(),
        category: selectedCategory,
        maxResults: 20
      });
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    onSearch({
      query: query.trim(),
      category: category,
      maxResults: 20
    });
  };

  const handleClearSearch = () => {
    setQuery('');
    setSelectedCategory('');
  };

  return (
    <div ref={searchFormRef} className="card mb-8">
      <div className="mb-6 fade-in">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          eFootball 動画検索
        </h2>
        <p className="text-gray-600">
          YouTubeからeFootball関連の動画を検索して視聴できます。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 fade-in">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              検索キーワード
            </label>
            <input
              type="text"
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="eFootball関連のキーワードを入力..."
              className="input-field"
              disabled={loading}
            />
          </div>
          
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={loading || (!query.trim() && !selectedCategory)}
              className={`btn-primary ${
                loading || (!query.trim() && !selectedCategory)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  検索中...
                </div>
              ) : (
                '検索'
              )}
            </button>
            
            {(query || selectedCategory) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="btn-secondary"
                disabled={loading}
              >
                クリア
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="fade-in">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          カテゴリから選択
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.name)}
              disabled={loading}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                selectedCategory === category.name
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-sm font-medium">{category.name}</div>
            </button>
          ))}
        </div>
      </div>

      {selectedCategory && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg fade-in">
          <p className="text-sm text-blue-700">
            選択中のカテゴリ: <span className="font-semibold">{selectedCategory}</span>
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg fade-in">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                検索エラー
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {error.message}
              </p>
              {error.retryable && onRetry && (
                <div className="mt-3">
                  <button
                    onClick={onRetry}
                    className="text-sm bg-red-100 text-red-800 px-3 py-1.5 rounded-md border border-red-300 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    再試行
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};