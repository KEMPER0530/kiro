import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Default chart options
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
    },
  },
};

// Color palette for charts
export const chartColors = {
  primary: 'rgb(59, 130, 246)', // blue-500
  secondary: 'rgb(16, 185, 129)', // emerald-500
  accent: 'rgb(245, 158, 11)', // amber-500
  danger: 'rgb(239, 68, 68)', // red-500
  info: 'rgb(139, 92, 246)', // violet-500
};

// Extended color palette for charts
export const extendedChartColors = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.accent,
  chartColors.danger,
  chartColors.info,
  'rgb(168, 85, 247)', // purple-500
  'rgb(236, 72, 153)', // pink-500
  'rgb(34, 197, 94)',  // green-500
  'rgb(251, 146, 60)', // orange-400
  'rgb(156, 163, 175)', // gray-400
];

// Chart data generators
export const generateCategoryData = (categories: { name: string; count: number }[]) => ({
  labels: categories.map(cat => cat.name),
  datasets: [
    {
      label: 'お気に入り数',
      data: categories.map(cat => cat.count),
      backgroundColor: extendedChartColors.slice(0, categories.length),
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverBorderWidth: 3,
      hoverBorderColor: '#374151',
    },
  ],
});

export const generateSearchHistoryData = (history: { date: string; count: number }[]) => ({
  labels: history.map(item => item.date),
  datasets: [
    {
      label: '検索回数',
      data: history.map(item => item.count),
      borderColor: chartColors.primary,
      backgroundColor: `${chartColors.primary}20`,
      tension: 0.4,
      fill: true,
      pointBackgroundColor: chartColors.primary,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
    },
  ],
});

// Advanced chart options for interactive features
export const interactiveChartOptions = {
  ...defaultChartOptions,
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  plugins: {
    ...defaultChartOptions.plugins,
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: chartColors.primary,
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
    },
  },
  animation: {
    duration: 1000,
    easing: 'easeInOutQuart' as const,
  },
};

// Utility function to generate gradient backgrounds
export const createGradient = (ctx: CanvasRenderingContext2D, color: string) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, `${color}80`);
  gradient.addColorStop(1, `${color}10`);
  return gradient;
};