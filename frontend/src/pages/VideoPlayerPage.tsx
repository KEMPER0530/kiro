import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayerComponent from '../components/VideoPlayerComponent';
import { VideoListComponent } from '../components/VideoListComponent';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { useFavorites } from '../hooks/useFavorites';
import { Video } from '../types';
import { api } from '../utils/api';

export const VideoPlayerPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRelated, setShowRelated] = useState(false);

  useEffect(() => {
    if (videoId) {
      loadVideoData(videoId);
    }
  }, [videoId]);

  const loadVideoData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Load related videos
      const relatedResponse = await api.get(`/videos/related/${id}`);
      setRelatedVideos(relatedResponse.data.videos || []);
      
      // Try to find current video info from related videos or search
      // Since we don't have a direct video info endpoint, we'll use the first related video
      // or try to get it from search results
      if (relatedResponse.data.videos && relatedResponse.data.videos.length > 0) {
        // Try to find the current video in related videos
        const current = relatedResponse.data.videos.find((v: Video) => v.id === id);
        if (current) {
          setCurrentVideo(current);
        } else {
          // If not found, create a minimal video object
          setCurrentVideo({
            id: id,
            title: 'Loading video...',
            description: '',
            thumbnail: {
              default: '',
              medium: '',
              high: ''
            },
            channelTitle: '',
            publishedAt: '',
            duration: '',
            viewCount: 0,
            category: 'gameplay'
          });
        }
      }
    } catch (err) {
      console.error('Error loading video data:', err);
      setError('Failed to load video data');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoEnd = () => {
    setShowRelated(true);
  };

  const handlePlayerError = (errorMessage: string) => {
    setError(`Video player error: ${errorMessage}`);
  };

  const handleVideoSelect = (selectedVideoId: string) => {
    navigate(`/watch/${selectedVideoId}`);
    setShowRelated(false);
  };

  const handleFavoriteToggle = (video: Video) => {
    const isFavorite = favorites.some(fav => fav.videoId === video.id);
    if (isFavorite) {
      removeFavorite(video.id);
    } else {
      addFavorite(video);
    }
  };

  const handleBackToSearch = () => {
    navigate('/search');
  };

  if (!videoId) {
    return (
      <div className="text-center py-8">
        <ErrorMessage message="No video ID provided" />
        <button
          onClick={handleBackToSearch}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Back to Search
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={handleBackToSearch}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Search
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Player */}
        <div className="lg:col-span-2">
          <VideoPlayerComponent
            videoId={videoId}
            onVideoEnd={handleVideoEnd}
            onError={handlePlayerError}
          />
          
          {/* Video Info */}
          {currentVideo && (
            <div className="mt-4 bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl font-bold text-gray-900 flex-1 mr-4">
                  {currentVideo.title}
                </h1>
                <button
                  onClick={() => handleFavoriteToggle(currentVideo)}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    favorites.some(fav => fav.videoId === currentVideo.id)
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  {favorites.some(fav => fav.videoId === currentVideo.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                </button>
              </div>
              
              <div className="flex items-center text-gray-600 mb-4">
                <span className="mr-4">{currentVideo.channelTitle}</span>
                <span className="mr-4">•</span>
                <span className="mr-4">{currentVideo.viewCount.toLocaleString()} views</span>
                <span className="mr-4">•</span>
                <span>{new Date(currentVideo.publishedAt).toLocaleDateString()}</span>
              </div>
              
              {currentVideo.description && (
                <div className="text-gray-700">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="whitespace-pre-wrap">{currentVideo.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4">
              <ErrorMessage message={error} />
            </div>
          )}
        </div>

        {/* Related Videos Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {showRelated ? 'Up Next' : 'Related Videos'}
            </h2>
            
            {showRelated && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  Video ended! Choose your next video:
                </p>
              </div>
            )}
            
            {relatedVideos.length > 0 ? (
              <div className="space-y-4">
                {relatedVideos.slice(0, 10).map((video) => (
                  <div
                    key={video.id}
                    className="flex cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    onClick={() => handleVideoSelect(video.id)}
                  >
                    <img
                      src={video.thumbnail.medium}
                      alt={video.title}
                      className="w-24 h-16 object-cover rounded flex-shrink-0"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                        {video.title}
                      </h3>
                      <p className="text-xs text-gray-600 mb-1">{video.channelTitle}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{video.viewCount.toLocaleString()} views</span>
                        <span className="mx-1">•</span>
                        <span>{video.duration}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No related videos found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};