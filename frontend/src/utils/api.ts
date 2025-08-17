import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// Enhanced error types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  retryable: boolean;
  details?: any;
}

// Retry configuration
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

const defaultRetryConfig: RetryConfig = {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    // Retry on network errors, timeouts, and 5xx server errors
    return !error.response || 
           error.code === 'NETWORK_ERROR' || 
           error.code === 'ECONNABORTED' ||
           (error.response.status >= 500 && error.response.status < 600);
  }
};

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://api.your-domain.com' 
    : 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add retry functionality to axios instance
api.defaults.retry = defaultRetryConfig.retries;
api.defaults.retryDelay = defaultRetryConfig.retryDelay;

// Request interceptor for adding auth tokens or other headers
api.interceptors.request.use(
  (config) => {
    // Add retry count to config
    config.retryCount = config.retryCount || 0;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors and retries
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as any;
    
    // Check if we should retry
    if (config && defaultRetryConfig.retryCondition?.(error) && config.retryCount < defaultRetryConfig.retries) {
      config.retryCount += 1;
      
      // Calculate delay with exponential backoff
      const delay = defaultRetryConfig.retryDelay * Math.pow(2, config.retryCount - 1);
      
      console.log(`Retrying request (attempt ${config.retryCount}/${defaultRetryConfig.retries}) after ${delay}ms`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return api(config);
    }
    
    // Transform error to our ApiError format
    const apiError: ApiError = transformError(error);
    return Promise.reject(apiError);
  }
);

// Transform axios error to our ApiError format
const transformError = (error: AxiosError): ApiError => {
  if (!error.response) {
    // Network error
    return {
      message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
      code: error.code || 'NETWORK_ERROR',
      retryable: true
    };
  }

  const status = error.response.status;
  const data = error.response.data as any;

  switch (status) {
    case 400:
      return {
        message: data?.message || 'リクエストが無効です。',
        code: 'BAD_REQUEST',
        status,
        retryable: false,
        details: data
      };
    case 401:
      return {
        message: '認証が必要です。',
        code: 'UNAUTHORIZED',
        status,
        retryable: false
      };
    case 403:
      return {
        message: 'アクセスが拒否されました。',
        code: 'FORBIDDEN',
        status,
        retryable: false
      };
    case 404:
      return {
        message: 'リソースが見つかりません。',
        code: 'NOT_FOUND',
        status,
        retryable: false
      };
    case 429:
      return {
        message: 'リクエスト回数の上限に達しました。しばらく待ってから再試行してください。',
        code: 'RATE_LIMITED',
        status,
        retryable: true
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        message: 'サーバーエラーが発生しました。しばらく待ってから再試行してください。',
        code: 'SERVER_ERROR',
        status,
        retryable: true
      };
    default:
      return {
        message: data?.message || 'エラーが発生しました。',
        code: 'UNKNOWN_ERROR',
        status,
        retryable: status >= 500,
        details: data
      };
  }
};

// Enhanced API wrapper with better error handling
export const apiRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  options?: {
    onRetry?: (attempt: number, error: ApiError) => void;
    customErrorMessage?: string;
  }
): Promise<T> => {
  try {
    const response = await requestFn();
    return response.data;
  } catch (error) {
    const apiError = error as ApiError;
    
    if (options?.customErrorMessage) {
      apiError.message = options.customErrorMessage;
    }
    
    throw apiError;
  }
};

// API endpoints
export const endpoints = {
  videos: {
    search: '/api/videos/search',
    popular: '/api/videos/popular',
    related: (videoId: string) => `/api/videos/related/${videoId}`,
  },
  favorites: {
    list: '/api/favorites',
    add: '/api/favorites',
    remove: (videoId: string) => `/api/favorites/${videoId}`,
  },
  searchHistory: {
    list: '/api/search-history',
    add: '/api/search-history',
    clear: '/api/search-history',
    delete: (timestamp: string) => `/api/search-history/${timestamp}`,
  },
};

export default api;