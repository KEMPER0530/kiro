const request = require('supertest');
const express = require('express');

// Mock the SearchHistoryRepository before importing the router
const mockSearchHistoryRepository = {
    getUserSearchHistory: jest.fn(),
    getSearchHistoryByCategory: jest.fn(),
    addSearchHistory: jest.fn(),
    clearUserSearchHistory: jest.fn(),
    deleteSearchHistory: jest.fn(),
    getRecentUniqueQueries: jest.fn(),
    getSearchStatistics: jest.fn()
};

jest.mock('../../repositories/SearchHistoryRepository', () => {
    return jest.fn().mockImplementation(() => mockSearchHistoryRepository);
});

const searchHistoryRouter = require('../searchHistory');

const app = express();
app.use(express.json());
app.use('/api/search-history', searchHistoryRouter);

// Error handler middleware
app.use((error, req, res, next) => {
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
    });
});

describe('Search History API', () => {
    const mockSearchHistory = [{
        query: 'eFootball gameplay',
        category: 'gameplay',
        timestamp: '2023-01-01T00:00:00Z',
        resultCount: 25
    }];

    const mockStatistics = {
        totalSearches: 50,
        uniqueQueries: 30,
        averageResultsPerSearch: 20,
        mostSearchedCategory: 'gameplay'
    };

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('GET /api/search-history', () => {
        it('should return user search history successfully', async () => {
            mockSearchHistoryRepository.getUserSearchHistory.mockResolvedValue(mockSearchHistory);
            mockSearchHistoryRepository.getRecentUniqueQueries.mockResolvedValue(['eFootball gameplay']);
            mockSearchHistoryRepository.getSearchStatistics.mockResolvedValue(mockStatistics);

            const response = await request(app)
                .get('/api/search-history')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.history).toHaveLength(1);
            expect(response.body.history[0].query).toBe('eFootball gameplay');
            expect(mockSearchHistoryRepository.getUserSearchHistory).toHaveBeenCalledWith('user123', 10);
        });

        it('should return search history filtered by category', async () => {
            mockSearchHistoryRepository.getSearchHistoryByCategory.mockResolvedValue(mockSearchHistory);
            mockSearchHistoryRepository.getRecentUniqueQueries.mockResolvedValue(['eFootball gameplay']);
            mockSearchHistoryRepository.getSearchStatistics.mockResolvedValue(mockStatistics);

            const response = await request(app)
                .get('/api/search-history')
                .query({
                    userId: 'user123',
                    category: 'gameplay'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(mockSearchHistoryRepository.getSearchHistoryByCategory).toHaveBeenCalledWith('user123', 'gameplay', 10);
        });

        it('should validate userId parameter', async () => {
            const response = await request(app)
                .get('/api/search-history');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation Error');
        });

        it('should handle repository errors', async () => {
            mockSearchHistoryRepository.getUserSearchHistory.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/search-history')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal Server Error');
        });
    });

    describe('POST /api/search-history', () => {
        it('should add search query to history successfully', async () => {
            const mockSearchHistoryEntry = {
                query: 'eFootball gameplay',
                category: 'gameplay',
                timestamp: '2023-01-01T00:00:00Z',
                resultCount: 25
            };

            mockSearchHistoryRepository.addSearchHistory.mockResolvedValue(mockSearchHistoryEntry);

            const response = await request(app)
                .post('/api/search-history')
                .send({
                    userId: 'user123',
                    query: 'eFootball gameplay',
                    category: 'gameplay',
                    resultCount: 25
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.searchHistory.query).toBe('eFootball gameplay');
            expect(mockSearchHistoryRepository.addSearchHistory).toHaveBeenCalledWith('user123', 'eFootball gameplay', 'gameplay', 25);
        });

        it('should validate request body', async () => {
            const response = await request(app)
                .post('/api/search-history')
                .send({
                    userId: 'user123'
                    // Missing query
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation Error');
        });

        it('should handle repository errors', async () => {
            mockSearchHistoryRepository.addSearchHistory.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/search-history')
                .send({
                    userId: 'user123',
                    query: 'eFootball gameplay',
                    category: 'gameplay',
                    resultCount: 25
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal Server Error');
        });
    });

    describe('DELETE /api/search-history', () => {
        it('should clear user search history successfully', async () => {
            mockSearchHistoryRepository.clearUserSearchHistory.mockResolvedValue(5);

            const response = await request(app)
                .delete('/api/search-history')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.deletedCount).toBe(5);
            expect(mockSearchHistoryRepository.clearUserSearchHistory).toHaveBeenCalledWith('user123');
        });

        it('should validate userId parameter', async () => {
            const response = await request(app)
                .delete('/api/search-history');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation Error');
        });

        it('should handle repository errors', async () => {
            mockSearchHistoryRepository.clearUserSearchHistory.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .delete('/api/search-history')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal Server Error');
        });
    });

    describe('DELETE /api/search-history/:timestamp', () => {
        it('should delete specific search history entry successfully', async () => {
            mockSearchHistoryRepository.deleteSearchHistory.mockResolvedValue(true);

            const response = await request(app)
                .delete('/api/search-history/2023-01-01T00:00:00Z')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(mockSearchHistoryRepository.deleteSearchHistory).toHaveBeenCalledWith('user123', '2023-01-01T00:00:00Z');
        });

        it('should return 404 when entry not found', async () => {
            mockSearchHistoryRepository.deleteSearchHistory.mockResolvedValue(false);

            const response = await request(app)
                .delete('/api/search-history/2023-01-01T00:00:00Z')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Not Found');
        });

        it('should validate userId parameter', async () => {
            const response = await request(app)
                .delete('/api/search-history/2023-01-01T00:00:00Z');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation Error');
        });

        it('should handle repository errors', async () => {
            mockSearchHistoryRepository.deleteSearchHistory.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .delete('/api/search-history/2023-01-01T00:00:00Z')
                .query({
                    userId: 'user123'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal Server Error');
        });
    });
});