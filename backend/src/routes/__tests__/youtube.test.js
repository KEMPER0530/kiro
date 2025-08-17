const request = require('supertest');
const express = require('express');

// Mock dependencies before requiring the router
const mockYouTubeService = {
    searchVideos: jest.fn(),
    getPopularVideos: jest.fn(),
    getRelatedVideos: jest.fn()
};

const mockRedisClient = {
    generateSearchKey: jest.fn(),
    generatePopularKey: jest.fn(),
    generateRelatedKey: jest.fn(),
    get: jest.fn(),
    set: jest.fn()
};

jest.mock('../../services/youtubeService', () => {
    return jest.fn().mockImplementation(() => mockYouTubeService);
});

jest.mock('../../config/redis', () => mockRedisClient);

const youtubeRouter = require('../youtube');

const app = express();
app.use(express.json());
app.use('/api/videos', youtubeRouter);

// Error handling middleware
app.use((error, req, res, next) => {
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
    });
});

describe('YouTube API Routes', () => {
    const mockSearchResult = {
        videos: [{
            id: 'test-video-1',
            title: 'eFootball Test Video',
            description: 'Test description',
            thumbnail: {
                default: 'https://example.com/thumb1.jpg',
                medium: 'https://example.com/thumb1_medium.jpg',
                high: 'https://example.com/thumb1_high.jpg'
            },
            channelTitle: 'Test Channel',
            publishedAt: '2023-01-01T00:00:00Z',
            duration: 'PT5M30S',
            viewCount: 1000,
            category: 'gameplay'
        }],
        totalResults: 1,
        nextPageToken: null
    };

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        mockRedisClient.generateSearchKey.mockReturnValue('search:test:key');
        mockRedisClient.generatePopularKey.mockReturnValue('popular:test:key');
        mockRedisClient.generateRelatedKey.mockReturnValue('related:test:key');
        mockRedisClient.get.mockResolvedValue(null);
        mockRedisClient.set.mockResolvedValue('OK');
    });

    describe('GET /api/videos/search', () => {
        it('should return search results successfully', async () => {
            mockYouTubeService.searchVideos.mockResolvedValue(mockSearchResult);

            const response = await request(app)
                .get('/api/videos/search')
                .query({
                    q: 'eFootball',
                    maxResults: 25
                });

            expect(response.status).toBe(200);
            expect(response.body.cached).toBe(false);
            expect(mockYouTubeService.searchVideos).toHaveBeenCalledWith('eFootball', undefined, 25);
            expect(mockRedisClient.set).toHaveBeenCalledWith('search:test:key', mockSearchResult, 300);
        });

        it('should return cached results when available', async () => {
            const cachedResult = {
                ...mockSearchResult,
                cached: true
            };
            mockRedisClient.get.mockResolvedValue(cachedResult);

            const response = await request(app)
                .get('/api/videos/search')
                .query({
                    q: 'eFootball'
                });

            expect(response.status).toBe(200);
            expect(response.body.cached).toBe(true);
            expect(mockYouTubeService.searchVideos).not.toHaveBeenCalled();
        });

        it('should handle search with category filter', async () => {
            mockYouTubeService.searchVideos.mockResolvedValue(mockSearchResult);

            const response = await request(app)
                .get('/api/videos/search')
                .query({
                    q: 'eFootball',
                    category: 'gameplay',
                    maxResults: 10
                });

            expect(response.status).toBe(200);
            expect(mockYouTubeService.searchVideos).toHaveBeenCalledWith('eFootball', 'gameplay', 10);
        });

        it('should validate query parameters', async () => {
            const response = await request(app)
                .get('/api/videos/search')
                .query({
                    maxResults: 'invalid'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation Error');
        });

        it('should validate category parameter', async () => {
            const response = await request(app)
                .get('/api/videos/search')
                .query({
                    category: 'invalid-category'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation Error');
        });

        it('should handle service errors', async () => {
            mockYouTubeService.searchVideos.mockRejectedValue(new Error('YouTube API Error'));

            const response = await request(app)
                .get('/api/videos/search')
                .query({
                    q: 'eFootball'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal Server Error');
        });
    });

    describe('GET /api/videos/popular', () => {
        const mockPopularResult = {
            videos: [{
                id: 'popular-video-1',
                title: 'Popular eFootball Video',
                description: 'Popular video description',
                thumbnail: {
                    default: 'https://example.com/popular1.jpg'
                },
                channelTitle: 'Popular Channel',
                publishedAt: '2023-01-01T00:00:00Z',
                duration: 'PT10M15S',
                viewCount: 50000,
                category: 'review'
            }],
            totalResults: 1
        };

        it('should return popular videos successfully', async () => {
            mockYouTubeService.getPopularVideos.mockResolvedValue(mockPopularResult);

            const response = await request(app)
                .get('/api/videos/popular')
                .query({
                    maxResults: 25
                });

            expect(response.status).toBe(200);
            expect(response.body.cached).toBe(false);
            expect(mockYouTubeService.getPopularVideos).toHaveBeenCalledWith(undefined, 25);
        });

        it('should return cached popular videos when available', async () => {
            const cachedResult = {
                ...mockPopularResult,
                cached: true
            };
            mockRedisClient.get.mockResolvedValue(cachedResult);

            const response = await request(app)
                .get('/api/videos/popular');

            expect(response.status).toBe(200);
            expect(response.body.cached).toBe(true);
            expect(mockYouTubeService.getPopularVideos).not.toHaveBeenCalled();
        });

        it('should handle popular videos with category filter', async () => {
            mockYouTubeService.getPopularVideos.mockResolvedValue(mockPopularResult);

            const response = await request(app)
                .get('/api/videos/popular')
                .query({
                    category: 'tips',
                    maxResults: 10
                });

            expect(response.status).toBe(200);
            expect(mockYouTubeService.getPopularVideos).toHaveBeenCalledWith('tips', 10);
        });
    });

    describe('GET /api/videos/related/:videoId', () => {
        const mockRelatedResult = {
            videos: [{
                id: 'related-video-1',
                title: 'Related eFootball Video',
                description: 'Related video description',
                thumbnail: {
                    default: 'https://example.com/related1.jpg'
                },
                channelTitle: 'Related Channel',
                publishedAt: '2023-01-01T00:00:00Z',
                duration: 'PT7M45S',
                viewCount: 25000,
                category: 'gameplay'
            }],
            totalResults: 1
        };

        it('should return related videos successfully', async () => {
            mockYouTubeService.getRelatedVideos.mockResolvedValue(mockRelatedResult);

            const response = await request(app)
                .get('/api/videos/related/test-video-id')
                .query({
                    maxResults: 10
                });

            expect(response.status).toBe(200);
            expect(response.body.cached).toBe(false);
            expect(mockYouTubeService.getRelatedVideos).toHaveBeenCalledWith('test-video-id', 10);
        });

        it('should return cached related videos when available', async () => {
            const cachedResult = {
                ...mockRelatedResult,
                cached: true
            };
            mockRedisClient.get.mockResolvedValue(cachedResult);

            const response = await request(app)
                .get('/api/videos/related/test-video-id');

            expect(response.status).toBe(200);
            expect(response.body.cached).toBe(true);
            expect(mockYouTubeService.getRelatedVideos).not.toHaveBeenCalled();
        });

        it('should validate videoId parameter', async () => {
            const response = await request(app)
                .get('/api/videos/related/');

            expect(response.status).toBe(404);
        });

        it('should validate maxResults parameter', async () => {
            const response = await request(app)
                .get('/api/videos/related/test-video-id')
                .query({
                    maxResults: 'invalid'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation Error');
        });

        it('should handle service errors', async () => {
            mockYouTubeService.getRelatedVideos.mockRejectedValue(new Error('Related videos error'));

            const response = await request(app)
                .get('/api/videos/related/test-video-id');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal Server Error');
        });
    });
});