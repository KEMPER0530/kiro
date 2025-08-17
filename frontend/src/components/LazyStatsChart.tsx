import React, { Suspense } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

// Lazy load the heavy Chart.js component
const StatsChart = React.lazy(() => import('./StatsChart').then(module => ({ default: module.StatsChart })));

interface LazyStatsChartProps {
  type: 'category' | 'search-history' | 'category-pie' | 'search-bar';
  data?: any[];
  title?: string;
  height?: string;
  interactive?: boolean;
  onDataPointClick?: (dataPoint: any, index: number) => void;
}

export const LazyStatsChart: React.FC<LazyStatsChartProps> = (props) => {
  return (
    <Suspense fallback={
      <div className={`${props.height || 'h-64'} flex items-center justify-center bg-gray-50 rounded-lg`}>
        <LoadingSpinner />
      </div>
    }>
      <StatsChart {...props} />
    </Suspense>
  );
};