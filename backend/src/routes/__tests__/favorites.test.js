const request = require('supertest');
const express = require('express');

// Mock the FavoriteRepository before importing the router
const mockFavoriteRepository = {
    getUserFavorites: jest.fn(),
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
    getFavoriteCount: jest.fn()
};

jest.mock('../../repositories/FavoriteRepository', () => {
    return jest.fn().mockImplementation(() => mockFavoriteRepository);
});

const favoritesRouter = require('../favorites');

const app = express();
app.use(express.json());
app.use('/api/favorites', favoritesRouter);

// Error handler middleware
app.use((error, req, res, next) => {
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
    });
});

describe('Favorites API', () => {
    const mockVideo = {
        id: 'video1',
        title: 'Test Video 1',
        description: 'Test description',
        thumbnail: {
            default: 'https://example.com/thumb1.jpg',
            medium: 'https://example.com/thumb1_medium.jpg',
            high: 'https://example.com/thumb1_high.jpg'
        },
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00.000Z',
        duration: 'PT5M30S',
        viewCount: 1000,
        category: 'gameplay'
    };

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('GET /api/favorites', () => {
        it('should return user favorites successfully', async () => {
            const mockFavorites = [{
                videoId: 'video1',
                video: mockVideo,
                addedAt: '2023-01-01T00:00:00Z'
            }];

            mockFavoriteRepository.getUserFavorites.mockResolvedValue(mockFavorites);

            const response = await request(app)
                .get('/api/favorites')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.favorites).toHaveLength(1);
            expect(response.body.favorites[0].videoId).toBe('video1');
            expect(mockFavoriteRepository.getUserFavorites).toHaveBeenCalledWith('user123', 100);
        });

        it('should validate userId parameter', async () => {
            const response = await request(app)
                .get('/api/favorites');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation Error');
        });

        it('should handle repository errors', async () => {
            mockFavoriteRepository.getUserFavorites.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/favorites')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal Server Error');
        });
    });

    describe('POST /api/favorites', () => {
        it('should add video to favorites successfully', async () => {
            const mockFavorite = {
                videoId: 'video1',
                video: mockVideo,
                addedAt: '2023-01-01T00:00:00Z'
            };

            mockFavoriteRepository.getFavoriteCount.mockResolvedValue(5);
            mockFavoriteRepository.addFavorite.mockResolvedValue(mockFavorite);

            const response = await request(app)
                .post('/api/favorites')
                .send({
                    userId: 'user123',
                    video: mockVideo
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.favorite.videoId).toBe('video1');
            expect(mockFavoriteRepository.addFavorite).toHaveBeenCalledWith('user123', mockVideo);
        });

        it('should return error when favorite limit is reached', async () => {
            mockFavoriteRepository.getFavoriteCount.mockResolvedValue(100);

            const response = await request(app)
                .post('/api/favorites')
                .send({
                    userId: 'user123',
                    video: mockVideo
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Limit Exceeded');
        });

        it('should return conflict error when video is already in favorites', async () => {
            mockFavoriteRepository.getFavoriteCount.mockResolvedValue(5);
            mockFavoriteRepository.addFavorite.mockRejectedValue(new Error('Video is already in favorites'));

            const response = await request(app)
                .post('/api/favorites')
                .send({
                    userId: 'user123',
                    video: mockVideo
                });

            expect(response.status).toBe(409);
            expect(response.body.error).toBe('Conflict');
        });

        it('should validate request body', async () => {
            const response = await request(app)
                .post('/api/favorites')
                .send({
                    userId: 'user123'
                    // Missing video
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation Error');
        });
    });

    describe('DELETE /api/favorites/:videoId', () => {
        it('should remove video from favorites successfully', async () => {
            mockFavoriteRepository.removeFavorite.mockResolvedValue(true);

            const response = await request(app)
                .delete('/api/favorites/video1')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(mockFavoriteRepository.removeFavorite).toHaveBeenCalledWith('user123', 'video1');
        });

        it('should return 404 when video not found in favorites', async () => {
            mockFavoriteRepository.removeFavorite.mockResolvedValue(false);

            const response = await request(app)
                .delete('/api/favorites/video1')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Not Found');
        });

        it('should validate userId parameter', async () => {
            const response = await request(app)
                .delete('/api/favorites/video1');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation Error');
        });

        it('should handle repository errors', async () => {
            mockFavoriteRepository.removeFavorite.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .delete('/api/favorites/video1')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal Server Error');
        });
    });
});