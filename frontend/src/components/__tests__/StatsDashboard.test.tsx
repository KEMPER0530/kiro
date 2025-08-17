import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatsDashboard } from '../StatsDashboard';
import { useStatistics } from '../../hooks/useStatistics';

// Mock the useStatistics hook
jest.mock('../../hooks/useStatistics');
const mockUseStatistics = useStatistics as jest.MockedFunction<typeof useStatistics>;

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>,
  Pie: () => <div data-testid="pie-chart">Pie Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
}));

describe('StatsDashboard', () => {
  const mockStatisticsData = {
    categoryStats: [
      { name: 'ゲームプレイ', count: 15, percentage: 50 },
      { name: '攻略・コツ', count: 9, percentage: 30 },
      { name: 'レビュー', count: 6, percentage: 20 },
    ],
    searchHistoryStats: [
      { date: '1/1', count: 5, queries: ['eFootball', 'gameplay'] },
      { date: '1/2', count: 8, queries: ['tips', 'tricks'] },
      { date: '1/3', count: 3, queries: ['review'] },
    ],
    viewingStats: {
      totalFavorites: 30,
      totalSearches: 16,
      mostPopularCategory: 'ゲームプレイ',
      averageSearchesPerDay: 2.3,
      topSearchQueries: [
        { query: 'eFootball', count: 5 },
        { query: 'gameplay', count: 4 },
        { query: 'tips', count: 3 },
      ],
    },
    loading: false,
    error: null,
    loadStatistics: jest.fn(),
    refreshStats: jest.fn(),
  };

  beforeEach(() => {
    mockUseStatistics.mockReturnValue(mockStatisticsData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard title', () => {
    render(<StatsDashboard />);
    expect(screen.getByText('視聴統計ダッシュボード')).toBeInTheDocument();
  });

  it('displays summary statistics cards', () => {
    render(<StatsDashboard />);
    
    expect(screen.getByText('お気に入り総数')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    
    expect(screen.getByText('検索総数')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
    
    expect(screen.getByText('人気カテゴリ')).toBeInTheDocument();
    expect(screen.getByText('ゲームプレイ')).toBeInTheDocument();
    
    expect(screen.getByText('日平均検索数')).toBeInTheDocument();
    expect(screen.getByText('2.3')).toBeInTheDocument();
  });

  it('displays chart sections', () => {
    render(<StatsDashboard />);
    
    expect(screen.getByText('カテゴリ別お気に入り分布')).toBeInTheDocument();
    expect(screen.getByText('検索履歴 (過去7日間)')).toBeInTheDocument();
  });

  it('displays top search queries', () => {
    render(<StatsDashboard />);
    
    expect(screen.getByText('人気検索キーワード')).toBeInTheDocument();
    expect(screen.getByText('eFootball')).toBeInTheDocument();
    expect(screen.getByText('5回')).toBeInTheDocument();
    expect(screen.getByText('gameplay')).toBeInTheDocument();
    expect(screen.getByText('4回')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseStatistics.mockReturnValue({
      ...mockStatisticsData,
      loading: true,
    });

    render(<StatsDashboard />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseStatistics.mockReturnValue({
      ...mockStatisticsData,
      loading: false,
      error: 'Failed to load statistics',
    });

    render(<StatsDashboard />);
    expect(screen.getByText('Failed to load statistics')).toBeInTheDocument();
  });

  it('calls refreshStats when refresh button is clicked', () => {
    const mockRefreshStats = jest.fn();
    mockUseStatistics.mockReturnValue({
      ...mockStatisticsData,
      refreshStats: mockRefreshStats,
    });

    render(<StatsDashboard />);
    
    const refreshButton = screen.getByText('更新');
    refreshButton.click();
    
    expect(mockRefreshStats).toHaveBeenCalledTimes(1);
  });
});