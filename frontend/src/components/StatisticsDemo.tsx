import React, { useState } from 'react';
import { StatsChart } from './StatsChart';
import { CategoryStats, SearchHistoryStats } from '../hooks/useStatistics';

export const StatisticsDemo: React.FC = () => {
  const [selectedChart, setSelectedChart] = useState<string>('category');

  // Demo data for category statistics
  const demoCategories: CategoryStats[] = [
    { name: 'ゲームプレイ', count: 25, percentage: 45 },
    { name: '攻略・コツ', count: 15, percentage: 27 },
    { name: 'レビュー', count: 10, percentage: 18 },
    { name: 'ニュース', count: 5, percentage: 9 },
  ];

  // Demo data for search history
  const demoSearchHistory: SearchHistoryStats[] = [
    { date: '12/20', count: 3, queries: ['eFootball 2024', 'gameplay'] },
    { date: '12/21', count: 7, queries: ['攻略', 'tips', 'コツ'] },
    { date: '12/22', count: 5, queries: ['レビュー', 'review'] },
    { date: '12/23', count: 12, queries: ['eFootball', 'プレイ', '実況', 'gameplay'] },
    { date: '12/24', count: 8, queries: ['ニュース', 'アップデート'] },
    { date: '12/25', count: 4, queries: ['tutorial', '解説'] },
    { date: '12/26', count: 9, queries: ['eFootball 2024', 'tips', 'プレイ'] },
  ];

  const handleDataPointClick = (dataPoint: any, index: number) => {
    console.log('Clicked data point:', dataPoint, 'at index:', index);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Chart.js 統計機能デモ
        </h1>
        <p className="text-gray-600">
          インタラクティブなチャート機能の実装例
        </p>
      </div>

      {/* Chart Type Selector */}
      <div className="flex justify-center space-x-4 mb-8">
        <button
          onClick={() => setSelectedChart('category')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedChart === 'category'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          カテゴリ分布 (ドーナツ)
        </button>
        <button
          onClick={() => setSelectedChart('category-pie')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedChart === 'category-pie'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          カテゴリ分布 (円グラフ)
        </button>
        <button
          onClick={() => setSelectedChart('search-history')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedChart === 'search-history'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          検索履歴 (線グラフ)
        </button>
        <button
          onClick={() => setSelectedChart('search-bar')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedChart === 'search-bar'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          検索履歴 (棒グラフ)
        </button>
      </div>

      {/* Chart Display */}
      <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {selectedChart === 'category' && 'カテゴリ別お気に入り分布 (ドーナツチャート)'}
            {selectedChart === 'category-pie' && 'カテゴリ別お気に入り分布 (円グラフ)'}
            {selectedChart === 'search-history' && '検索履歴 (線グラフ)'}
            {selectedChart === 'search-bar' && '検索履歴 (棒グラフ)'}
          </h2>
          <p className="text-gray-600">
            {selectedChart.includes('category') 
              ? 'お気に入り動画のカテゴリ別分布を表示します。データポイントをクリックして詳細を確認できます。'
              : '過去7日間の検索履歴を表示します。各日の検索回数と検索キーワードを確認できます。'
            }
          </p>
        </div>

        <StatsChart
          type={selectedChart as any}
          data={selectedChart.includes('category') ? demoCategories : demoSearchHistory}
          height="h-96"
          interactive={true}
          onDataPointClick={handleDataPointClick}
        />
      </div>

      {/* Feature List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">実装済み機能</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              インタラクティブなチャート機能
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              カテゴリ別お気に入り分布グラフ
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              検索履歴の可視化機能
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              複数のチャートタイプ対応
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              視聴統計ダッシュボード
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">技術仕様</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Chart.js v4.2.0
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              react-chartjs-2 v5.2.0
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              TypeScript対応
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              レスポンシブデザイン
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              カスタムフック活用
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};