import React, { useEffect, useRef } from 'react';
import anime from 'animejs';
import { Category } from '../types';

interface CategoryFilterComponentProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  loading?: boolean;
}

export const CategoryFilterComponent: React.FC<CategoryFilterComponentProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  loading = false
}) => {
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate component entrance
    if (filterRef.current) {
      anime({
        targets: filterRef.current.querySelectorAll('.category-item'),
        opacity: [0, 1],
        translateY: [20, 0],
        scale: [0.9, 1],
        delay: anime.stagger(50),
        duration: 400,
        easing: 'easeOutExpo'
      });
    }
  }, [categories]);

  const handleCategoryClick = (categoryName: string) => {
    if (loading) return;
    
    // If clicking the same category, clear the filter
    const newCategory = selectedCategory === categoryName ? '' : categoryName;
    onCategoryChange(newCategory);
  };

  const handleClearAll = () => {
    if (loading) return;
    onCategoryChange('');
  };

  return (
    <div ref={filterRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 sm:mb-0">
          カテゴリフィルター
        </h3>
        
        {selectedCategory && (
          <button
            onClick={handleClearAll}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            すべてクリア
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.name;
          
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.name)}
              disabled={loading}
              className={`category-item p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
              } ${
                loading 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer transform hover:scale-105 active:scale-95'
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                <span className="text-center leading-tight">
                  {category.name}
                </span>
                {isSelected && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedCategory && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-700">
                選択中: <span className="font-semibold">{selectedCategory}</span>
              </span>
            </div>
            <button
              onClick={handleClearAll}
              disabled={loading}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};