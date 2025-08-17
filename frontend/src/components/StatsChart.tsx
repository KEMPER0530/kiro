import React, { useState, useCallback } from 'react';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import { 
  defaultChartOptions, 
  generateCategoryData, 
  generateSearchHistoryData,
  chartColors 
} from '../utils/chartConfig';
import { CategoryStats, SearchHistoryStats } from '../hooks/useStatistics';

interface StatsChartProps {
  type: 'category' | 'search-history' | 'category-pie' | 'search-bar';
  data?: CategoryStats[] | SearchHistoryStats[];
  title?: string;
  height?: string;
  interactive?: boolean;
  onDataPointClick?: (dataPoint: any, index: number) => void;
}

export const StatsChart: React.FC<StatsChartProps> = ({ 
  type, 
  data, 
  title,
  height = 'h-64',
  interactive = true,
  onDataPointClick
}) => {
  const [selectedDataPoint, setSelectedDataPoint] = useState<number | null>(null);

  // Handle chart click events
  const handleChartClick = useCallback((event: any, elements: any[]) => {
    if (!interactive || elements.length === 0) return;

    const elementIndex = elements[0].index;
    setSelectedDataPoint(elementIndex);
    
    if (onDataPointClick && data) {
      onDataPointClick(data[elementIndex], elementIndex);
    }
  }, [interactive, onDataPointClick, data]);

  // Generate chart data based on type and actual data
  const getChartData = () => {
    if (!data || data.length === 0) {
      // Return sample data for demonstration
      if (type === 'category' || type === 'category-pie') {
        return generateCategoryData([
          { name: 'ゲームプレイ', count: 15 },
          { name: '攻略・コツ', count: 8 },
          { name: 'レビュー', count: 5 },
          { name: 'ニュース', count: 3 },
        ]);
      } else {
        return generateSearchHistoryData([
          { date: '1/1', count: 5 },
          { date: '1/2', count: 8 },
          { date: '1/3', count: 3 },
          { date: '1/4', count: 12 },
          { date: '1/5', count: 7 },
        ]);
      }
    }

    // Process real data
    if (type === 'category' || type === 'category-pie') {
      const categoryData = data as CategoryStats[];
      return {
        labels: categoryData.map(item => `${item.name} (${item.percentage}%)`),
        datasets: [
          {
            label: 'お気に入り数',
            data: categoryData.map(item => item.count),
            backgroundColor: [
              chartColors.primary,
              chartColors.secondary,
              chartColors.accent,
              chartColors.danger,
              chartColors.info,
              'rgb(168, 85, 247)', // purple-500
              'rgb(236, 72, 153)', // pink-500
            ].slice(0, categoryData.length),
            borderWidth: 2,
            borderColor: selectedDataPoint !== null ? 
              categoryData.map((_, index) => 
                index === selectedDataPoint ? '#374151' : 'transparent'
              ) : 'transparent',
            hoverBorderWidth: 3,
            hoverBorderColor: '#374151',
          },
        ],
      };
    } else {
      const searchData = data as SearchHistoryStats[];
      return {
        labels: searchData.map(item => item.date),
        datasets: [
          {
            label: '検索回数',
            data: searchData.map(item => item.count),
            borderColor: chartColors.primary,
            backgroundColor: type === 'search-bar' ? 
              `${chartColors.primary}80` : `${chartColors.primary}20`,
            tension: 0.4,
            fill: type !== 'search-bar',
            pointBackgroundColor: chartColors.primary,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
          },
        ],
      };
    }
  };

  // Generate chart options based on type
  const getChartOptions = () => {
    const baseOptions = {
      ...defaultChartOptions,
      onClick: handleChartClick,
      plugins: {
        ...defaultChartOptions.plugins,
        title: {
          display: !!title,
          text: title || (type === 'category' || type === 'category-pie' ? 
            'カテゴリ別お気に入り分布' : '検索履歴'),
          font: {
            size: 16,
            weight: 'bold' as const,
          },
          color: '#374151',
        },
        legend: {
          ...defaultChartOptions.plugins.legend,
          display: type === 'category-pie' || type === 'category',
          position: type === 'category-pie' ? 'bottom' as const : 'top' as const,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: chartColors.primary,
          borderWidth: 1,
          callbacks: {
            label: (context: any) => {
              if (type === 'category' || type === 'category-pie') {
                const categoryData = data as CategoryStats[];
                const item = categoryData?.[context.dataIndex];
                return item ? 
                  `${item.name}: ${item.count}件 (${item.percentage}%)` :
                  `${context.label}: ${context.parsed}件`;
              } else {
                const searchData = data as SearchHistoryStats[];
                const item = searchData?.[context.dataIndex];
                const queriesText = item?.queries.length > 0 ? 
                  `\n検索語: ${item.queries.slice(0, 3).join(', ')}${item.queries.length > 3 ? '...' : ''}` : '';
                return `${context.label}: ${context.parsed}回${queriesText}`;
              }
            },
          },
        },
      },
      scales: type === 'search-bar' ? {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      } : undefined,
    };

    return baseOptions;
  };

  const chartData = getChartData();
  const chartOptions = getChartOptions();

  // Render appropriate chart type
  const renderChart = () => {
    switch (type) {
      case 'category':
        return <Doughnut data={chartData} options={chartOptions} />;
      case 'category-pie':
        return <Pie data={chartData} options={chartOptions} />;
      case 'search-history':
        return <Line data={chartData} options={chartOptions} />;
      case 'search-bar':
        return <Bar data={chartData} options={chartOptions} />;
      default:
        return <Doughnut data={chartData} options={chartOptions} />;
    }
  };

  return (
    <div className={`${height} relative`}>
      {renderChart()}
      {interactive && selectedDataPoint !== null && (
        <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
          選択中: {selectedDataPoint + 1}
        </div>
      )}
    </div>
  );
};