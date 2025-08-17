import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatisticsDemo from '../StatisticsDemo';

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  BarElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  ArcElement: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
}));

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Bar Chart Mock
    </div>
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Doughnut Chart Mock
    </div>
  ),
}));

describe('StatisticsDemo', () => {
  it('renders statistics demo component', () => {
    render(<StatisticsDemo />);
    
    expect(screen.getByText('Statistics Demo')).toBeInTheDocument();
  });

  it('displays demo statistics cards', () => {
    render(<StatisticsDemo />);
    
    expect(screen.getByText('Total Videos Watched')).toBeInTheDocument();
    expect(screen.getByText('Favorite Videos')).toBeInTheDocument();
    expect(screen.getByText('Search Queries')).toBeInTheDocument();
    expect(screen.getByText('Hours Watched')).toBeInTheDocument();
  });

  it('shows demo statistics values', () => {
    render(<StatisticsDemo />);
    
    expect(screen.getByText('127')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
    expect(screen.getByText('45.2')).toBeInTheDocument();
  });

  it('renders bar chart for search history', () => {
    render(<StatisticsDemo />);
    
    const barChart = screen.getByTestId('bar-chart');
    expect(barChart).toBeInTheDocument();
    expect(screen.getByText('Search History (Last 7 Days)')).toBeInTheDocument();
  });

  it('renders doughnut chart for category distribution', () => {
    render(<StatisticsDemo />);
    
    const doughnutChart = screen.getByTestId('doughnut-chart');
    expect(doughnutChart).toBeInTheDocument();
    expect(screen.getByText('Favorite Videos by Category')).toBeInTheDocument();
  });

  it('displays chart data correctly', () => {
    render(<StatisticsDemo />);
    
    const barChart = screen.getByTestId('bar-chart');
    const barChartData = JSON.parse(barChart.getAttribute('data-chart-data') || '{}');
    
    expect(barChartData.labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(barChartData.datasets[0].data).toEqual([12, 8, 15, 6, 20, 18, 10]);
    
    const doughnutChart = screen.getByTestId('doughnut-chart');
    const doughnutChartData = JSON.parse(doughnutChart.getAttribute('data-chart-data') || '{}');
    
    expect(doughnutChartData.labels).toEqual(['Gameplay', 'Tips', 'Reviews', 'News']);
    expect(doughnutChartData.datasets[0].data).toEqual([12, 8, 2, 1]);
  });

  it('applies correct styling classes', () => {
    render(<StatisticsDemo />);
    
    const container = screen.getByTestId('statistics-demo');
    expect(container).toHaveClass('p-6', 'bg-white', 'rounded-lg', 'shadow-md');
  });

  it('shows demo disclaimer', () => {
    render(<StatisticsDemo />);
    
    expect(screen.getByText(/This is demo data/i)).toBeInTheDocument();
    expect(screen.getByText(/Real statistics will be available/i)).toBeInTheDocument();
  });

  it('renders statistics cards with proper icons', () => {
    render(<StatisticsDemo />);
    
    expect(screen.getByTestId('video-icon')).toBeInTheDocument();
    expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });

  it('has responsive grid layout', () => {
    render(<StatisticsDemo />);
    
    const statsGrid = screen.getByTestId('stats-grid');
    expect(statsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-4');
  });

  it('has responsive chart layout', () => {
    render(<StatisticsDemo />);
    
    const chartsGrid = screen.getByTestId('charts-grid');
    expect(chartsGrid).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-6');
  });

  it('displays chart titles correctly', () => {
    render(<StatisticsDemo />);
    
    expect(screen.getByText('Search History (Last 7 Days)')).toBeInTheDocument();
    expect(screen.getByText('Favorite Videos by Category')).toBeInTheDocument();
  });

  it('renders with proper accessibility attributes', () => {
    render(<StatisticsDemo />);
    
    const heading = screen.getByRole('heading', { name: 'Statistics Demo' });
    expect(heading).toBeInTheDocument();
    
    const statsCards = screen.getAllByTestId(/stat-card/);
    statsCards.forEach(card => {
      expect(card).toHaveAttribute('role', 'region');
    });
  });
});