import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { ErrorProvider } from './contexts/ErrorContext';
import { GlobalErrorHandler } from './components/GlobalErrorHandler';
import { LoadingSpinner } from './components/LoadingSpinner';
import './styles/globals.css';

// Lazy load pages for code splitting
const SearchPage = React.lazy(() => import('./pages/SearchPage').then(module => ({ default: module.SearchPage })));
const CategoriesPage = React.lazy(() => import('./pages/CategoriesPage').then(module => ({ default: module.CategoriesPage })));
const FavoritesPage = React.lazy(() => import('./pages/FavoritesPage').then(module => ({ default: module.FavoritesPage })));
const VideoPlayerPage = React.lazy(() => import('./pages/VideoPlayerPage').then(module => ({ default: module.VideoPlayerPage })));
const StatisticsPage = React.lazy(() => import('./pages/StatisticsPage').then(module => ({ default: module.StatisticsPage })));

const App: React.FC = () => {
  return (
    <ErrorProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Navigation />
          <main className="container mx-auto px-4 py-8">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<SearchPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/watch/:videoId" element={<VideoPlayerPage />} />
              </Routes>
            </Suspense>
          </main>
          <GlobalErrorHandler />
        </div>
      </Router>
    </ErrorProvider>
  );
};

export default App;