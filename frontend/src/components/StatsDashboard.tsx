import React, { useState } from 'react';
import { LazyStatsChart } from './LazyStatsChart';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { useStatistics } from '../hooks/useStatistics';

interface StatsDashboardProps {
  className?: string;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ className = '' }) => {
  const {
    categoryStats,
    searchHistoryStats,
    viewingStats,
    loading,
    error,
    refreshStats
  } = useStatistics();

  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [selectedDataPoint, setSelectedDataPoint] = useState<any>(null);

  const handleDataPointClick = (dataPoint: any, index: number) => {
    setSelectedDataPoint({ ...dataPoint, index });
  };

  const handleRefresh = async () => {
    await refreshStats();
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorMessage 
          message={error} 
          onRetry={handleRefresh}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">視聴統計ダッシュボード</h2>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>更新</span>
        </button>
      </div>

      {/* Summary Statistics Cards */}
      {viewingStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">お気に入り総数</p>
                <p className="text-2xl font-bold text-gray-900">{viewingStats.totalFavorites}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">検索総数</p>
                <p className="text-2xl font-bold text-gray-900">{viewingStats.totalSearches}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">人気カテゴリ</p>
                <p className="text-lg font-bold text-gray-900">{viewingStats.mostPopularCategory}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">日平均検索数</p>
                <p className="text-2xl font-bold text-gray-900">{viewingStats.averageSearchesPerDay}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">カテゴリ別お気に入り分布</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedChart(selectedChart === 'category-doughnut' ? null : 'category-doughnut')}
                className={`px-3 py-1 text-sm rounded ${
                  selectedChart === 'category-doughnut' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ドーナツ
              </button>
              <button
                onClick={() => setSelectedChart(selectedChart === 'category-pie' ? null : 'category-pie')}
                className={`px-3 py-1 text-sm rounded ${
                  selectedChart === 'category-pie' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                円グラフ
              </button>
            </div>
          </div>
          <LazyStatsChart
            type={selectedChart === 'category-pie' ? 'category-pie' : 'category'}
            data={categoryStats}
            height="h-80"
            onDataPointClick={handleDataPointClick}
          />
        </div>

        {/* Search History Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">検索履歴 (過去7日間)</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedChart(selectedChart === 'search-line' ? null : 'search-line')}
                className={`px-3 py-1 text-sm rounded ${
                  selectedChart === 'search-line' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                線グラフ
              </button>
              <button
                onClick={() => setSelectedChart(selectedChart === 'search-bar' ? null : 'search-bar')}
                className={`px-3 py-1 text-sm rounded ${
                  selectedChart === 'search-bar' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                棒グラフ
              </button>
            </div>
          </div>
          <LazyStatsChart
            type={selectedChart === 'search-bar' ? 'search-bar' : 'search-history'}
            data={searchHistoryStats}
            height="h-80"
            onDataPointClick={handleDataPointClick}
          />
        </div>
      </div>

      {/* Top Search Queries */}
      {viewingStats && viewingStats.topSearchQueries.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">人気検索キーワード</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {viewingStats.topSearchQueries.map((query, index) => (
              <div key={query.query} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-sm font-bold rounded-full">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">{query.query}</span>
                </div>
                <span className="text-sm text-gray-600">{query.count}回</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Data Point Details */}
      {selectedDataPoint && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">選択されたデータ</h4>
          <div className="text-sm text-blue-800">
            {selectedDataPoint.name ? (
              <div>
                <p><strong>カテゴリ:</strong> {selectedDataPoint.name}</p>
                <p><strong>お気に入り数:</strong> {selectedDataPoint.count}件</p>
                <p><strong>割合:</strong> {selectedDataPoint.percentage}%</p>
              </div>
            ) : (
              <div>
                <p><strong>日付:</strong> {selectedDataPoint.date}</p>
                <p><strong>検索回数:</strong> {selectedDataPoint.count}回</p>
                {selectedDataPoint.queries && (
                  <p><strong>検索語:</strong> {selectedDataPoint.queries.join(', ')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};