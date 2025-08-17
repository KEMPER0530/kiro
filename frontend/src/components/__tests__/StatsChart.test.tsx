import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatsChart } from '../StatsChart';

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)}>
      Doughnut Chart - {options?.plugins?.title?.text}
    </div>
  ),
  Pie: ({ data, options }: any) => (
    <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)}>
      Pie Chart - {options?.plugins?.title?.text}
    </div>
  ),
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      Line Chart - {options?.plugins?.title?.text}
    </div>
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      Bar Chart - {options?.plugins?.title?.text}
    </div>
  ),
}));

describe('StatsChart', () => {
  const mockCategoryData = [
    { name: 'ゲームプレイ', count: 15, percentage: 50 },
    { name: '攻略・コツ', count: 9, percentage: 30 },
    { name: 'レビュー', count: 6, percentage: 20 },
  ];

  const mockSearchHistoryData = [
    { date: '1/1', count: 5, queries: ['eFootball', 'gameplay'] },
    { date: '1/2', count: 8, queries: ['tips', 'tricks'] },
    { date: '1/3', count: 3, queries: ['review'] },
  ];

  it('renders doughnut chart for category type', () => {
    render(
      <StatsChart 
        type="category" 
        data={mockCategoryData}
        title="Category Distribution"
      />
    );
    
    const chart = screen.getByTestId('doughnut-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveTextContent('Category Distribution');
  });

  it('renders pie chart for category-pie type', () => {
    render(
      <StatsChart 
        type="category-pie" 
        data={mockCategoryData}
        title="Category Pie Chart"
      />
    );
    
    const chart = screen.getByTestId('pie-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveTextContent('Category Pie Chart');
  });

  it('renders line chart for search-history type', () => {
    render(
      <StatsChart 
        type="search-history" 
        data={mockSearchHistoryData}
        title="Search History"
      />
    );
    
    const chart = screen.getByTestId('line-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveTextContent('Search History');
  });

  it('renders bar chart for search-bar type', () => {
    render(
      <StatsChart 
        type="search-bar" 
        data={mockSearchHistoryData}
        title="Search Bar Chart"
      />
    );
    
    const chart = screen.getByTestId('bar-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveTextContent('Search Bar Chart');
  });

  it('uses default height when not specified', () => {
    render(<StatsChart type="category" data={mockCategoryData} />);
    
    const container = screen.getByTestId('doughnut-chart').parentElement;
    expect(container).toHaveClass('h-64');
  });

  it('uses custom height when specified', () => {
    render(
      <StatsChart 
        type="category" 
        data={mockCategoryData} 
        height="h-96"
      />
    );
    
    const container = screen.getByTestId('doughnut-chart').parentElement;
    expect(container).toHaveClass('h-96');
  });

  it('renders with sample data when no data provided', () => {
    render(<StatsChart type="category" />);
    
    const chart = screen.getByTestId('doughnut-chart');
    expect(chart).toBeInTheDocument();
    
    // Should render with sample data
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
    expect(chartData.labels).toBeDefined();
    expect(chartData.datasets).toBeDefined();
  });

  it('processes category data correctly', () => {
    render(<StatsChart type="category" data={mockCategoryData} />);
    
    const chart = screen.getByTestId('doughnut-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
    
    expect(chartData.labels).toEqual([
      'ゲームプレイ (50%)',
      '攻略・コツ (30%)',
      'レビュー (20%)'
    ]);
    expect(chartData.datasets[0].data).toEqual([15, 9, 6]);
  });

  it('processes search history data correctly', () => {
    render(<StatsChart type="search-history" data={mockSearchHistoryData} />);
    
    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
    
    expect(chartData.labels).toEqual(['1/1', '1/2', '1/3']);
    expect(chartData.datasets[0].data).toEqual([5, 8, 3]);
  });
});