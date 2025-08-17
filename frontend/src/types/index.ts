// Video related types
export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: {
    default: string;
    medium: string;
    high: string;
  };
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  category: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  searchTerms: string[];
}

// Favorite types
export interface Favorite {
  videoId: string;
  addedAt: string;
  video: Video;
}

// Search related types
export interface SearchParams {
  query?: string;
  category?: string;
  maxResults?: number;
}

export interface SearchHistory {
  userId: string;
  query: string;
  timestamp: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface VideoSearchResponse {
  videos: Video[];
  nextPageToken?: string;
  totalResults: number;
}

// Component prop types
export interface SearchComponentProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

export interface VideoListProps {
  videos: Video[];
  onVideoSelect: (videoId: string) => void;
  onFavoriteToggle: (video: Video) => void;
}

export interface VideoPlayerProps {
  videoId: string;
  onVideoEnd: () => void;
  onError: (error: string) => void;
}

export interface FavoritesProps {
  favorites: Favorite[];
  onVideoSelect: (videoId: string) => void;
  onRemoveFavorite: (videoId: string) => void;
}

export interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}