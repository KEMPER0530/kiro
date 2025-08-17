// Mock DynamoDB DocumentClient
const mockDocClient = {
    put: jest.fn(),
    get: jest.fn(),
    query: jest.fn(),
    delete: jest.fn(),
    batchWrite: jest.fn()
};

jest.mock('../../config/database', () => ({
    docClient: mockDocClient
}));

const SearchHistoryRepository = require('../SearchHistoryRepository');
const SearchHistory = require('../../models/SearchHistory');

describe('SearchHistoryRepository', () => {
    let repository;

    beforeEach(() => {
        repository = new SearchHistoryRepository();
        jest.clearAllMocks();
    });

    describe('addSearchHistory', () => {
        it('should add search history successfully', async () => {
            // Mock put to succeed
            mockDocClient.put.mockReturnValue({
                promise: () => Promise.resolve({})
            });

            // Mock query for cleanup (return empty to skip cleanup)
            mockDocClient.query.mockReturnValue({
                promise: () => Promise.resolve({
                    Items: []
                })
            });

            const result = await repository.addSearchHistory('user-123', 'test query', 'gameplay', 10);

            expect(result).toBeInstanceOf(SearchHistory);
            expect(result.userId).toBe('user-123');
            expect(result.query).toBe('test query');
            expect(result.category).toBe('gameplay');
            expect(result.resultCount).toBe(10);
            expect(mockDocClient.put).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: 'efootball-search-history',
                    Item: expect.objectContaining({
                        userId: 'user-123',
                        query: 'test query',
                        category: 'gameplay',
                        resultCount: 10
                    })
                })
            );
        });

        it('should handle optional parameters', async () => {
            mockDocClient.put.mockReturnValue({
                promise: () => Promise.resolve({})
            });

            mockDocClient.query.mockReturnValue({
                promise: () => Promise.resolve({
                    Items: []
                })
            });

            const result = await repository.addSearchHistory('user-123', 'test query');

            expect(result.category).toBe(null);
            expect(result.resultCount).toBe(0);
        });
    });

    describe('getUserSearchHistory', () => {
        it('should return user search history', async () => {
            const historyItems = [{
                    userId: 'user-123',
                    query: 'query 1',
                    timestamp: '2023-01-02T00:00:00Z',
                    category: 'gameplay',
                    resultCount: 10
                },
                {
                    userId: 'user-123',
                    query: 'query 2',
                    timestamp: '2023-01-01T00:00:00Z',
                    category: 'tutorial',
                    resultCount: 5
                }
            ];

            mockDocClient.query.mockReturnValue({
                promise: () => Promise.resolve({
                    Items: historyItems
                })
            });

            const result = await repository.getUserSearchHistory('user-123');

            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(SearchHistory);
            expect(result[1]).toBeInstanceOf(SearchHistory);
            expect(mockDocClient.query).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: 'efootball-search-history',
                    KeyConditionExpression: 'userId = :userId',
                    ExpressionAttributeValues: {
                        ':userId': 'user-123'
                    },
                    ScanIndexForward: false,
                    Limit: 10
                })
            );
        });

        it('should bypass max limit when enforceLimit is false', async () => {
            mockDocClient.query.mockReturnValue({
                promise: () => Promise.resolve({
                    Items: []
                })
            });

            await repository.getUserSearchHistory('user-123', 100, false);

            expect(mockDocClient.query).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: 'efootball-search-history',
                    KeyConditionExpression: 'userId = :userId',
                    ExpressionAttributeValues: {
                        ':userId': 'user-123'
                    },
                    ScanIndexForward: false,
                    Limit: 100
                })
            );
        });
    });

    describe('getRecentUniqueQueries', () => {
        it('should return unique queries in order', async () => {
            const historyItems = [{
                    userId: 'user-123',
                    query: 'query 1',
                    timestamp: '2023-01-03T00:00:00Z',
                    resultCount: 10
                },
                {
                    userId: 'user-123',
                    query: 'Query 1', // Same query, different case
                    timestamp: '2023-01-02T00:00:00Z',
                    resultCount: 8
                },
                {
                    userId: 'user-123',
                    query: 'query 2',
                    timestamp: '2023-01-01T00:00:00Z',
                    resultCount: 5
                }
            ];

            mockDocClient.query.mockReturnValue({
                promise: () => Promise.resolve({
                    Items: historyItems
                })
            });

            const result = await repository.getRecentUniqueQueries('user-123', 5);

            expect(result).toEqual(['query 1', 'query 2']);
        });
    });

    describe('deleteSearchHistory', () => {
        it('should delete search history successfully', async () => {
            mockDocClient.delete.mockReturnValue({
                promise: () => Promise.resolve({})
            });

            const result = await repository.deleteSearchHistory('user-123', '2023-01-01T00:00:00Z');

            expect(result).toBe(true);
            expect(mockDocClient.delete).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: 'efootball-search-history',
                    Key: {
                        userId: 'user-123',
                        timestamp: '2023-01-01T00:00:00Z'
                    },
                    ConditionExpression: 'attribute_exists(userId) AND attribute_exists(timestamp)'
                })
            );
        });

        it('should return false if item does not exist', async () => {
            const error = new Error('ConditionalCheckFailedException');
            error.code = 'ConditionalCheckFailedException';

            mockDocClient.delete.mockReturnValue({
                promise: () => Promise.reject(error)
            });

            const result = await repository.deleteSearchHistory('user-123', 'non-existent-timestamp');

            expect(result).toBe(false);
        });
    });

    describe('clearUserSearchHistory', () => {
        it('should clear all user search history', async () => {
            const historyItems = [{
                    userId: 'user-123',
                    query: 'query 1',
                    timestamp: '2023-01-01T00:00:00Z',
                    resultCount: 10
                },
                {
                    userId: 'user-123',
                    query: 'query 2',
                    timestamp: '2023-01-02T00:00:00Z',
                    resultCount: 5
                }
            ];

            // Mock query to return items
            mockDocClient.query.mockReturnValue({
                promise: () => Promise.resolve({
                    Items: historyItems
                })
            });

            // Mock batchWrite to succeed
            mockDocClient.batchWrite.mockReturnValue({
                promise: () => Promise.resolve({})
            });

            const result = await repository.clearUserSearchHistory('user-123');

            expect(result).toBe(2);
            expect(mockDocClient.batchWrite).toHaveBeenCalledWith(
                expect.objectContaining({
                    RequestItems: {
                        'efootball-search-history': expect.arrayContaining([{
                                DeleteRequest: {
                                    Key: {
                                        userId: 'user-123',
                                        timestamp: '2023-01-01T00:00:00Z'
                                    }
                                }
                            },
                            {
                                DeleteRequest: {
                                    Key: {
                                        userId: 'user-123',
                                        timestamp: '2023-01-02T00:00:00Z'
                                    }
                                }
                            }
                        ])
                    }
                })
            );
        });

        it('should return 0 if no history exists', async () => {
            mockDocClient.query.mockReturnValue({
                promise: () => Promise.resolve({
                    Items: []
                })
            });

            const result = await repository.clearUserSearchHistory('user-123');

            expect(result).toBe(0);
            expect(mockDocClient.batchWrite).not.toHaveBeenCalled();
        });
    });

    describe('getSearchStatistics', () => {
        it('should return search statistics', async () => {
            const historyItems = [{
                    userId: 'user-123',
                    query: 'query 1',
                    timestamp: '2023-01-03T00:00:00Z',
                    category: 'gameplay',
                    resultCount: 10
                },
                {
                    userId: 'user-123',
                    query: 'query 1', // Duplicate query
                    timestamp: '2023-01-02T00:00:00Z',
                    category: 'gameplay',
                    resultCount: 8
                },
                {
                    userId: 'user-123',
                    query: 'query 2',
                    timestamp: '2023-01-01T00:00:00Z',
                    category: 'tutorial',
                    resultCount: 5
                }
            ];

            mockDocClient.query.mockReturnValue({
                promise: () => Promise.resolve({
                    Items: historyItems
                })
            });

            const result = await repository.getSearchStatistics('user-123');

            expect(result).toEqual({
                totalSearches: 3,
                uniqueQueries: 2, // 'query 1' and 'query 2'
                categoryCounts: {
                    gameplay: 2,
                    tutorial: 1
                },
                averageResultCount: 8, // (10 + 8 + 5) / 3 = 7.67 rounded to 8
                mostRecentSearch: '2023-01-03T00:00:00Z'
            });
        });

        it('should handle empty history', async () => {
            mockDocClient.query.mockReturnValue({
                promise: () => Promise.resolve({
                    Items: []
                })
            });

            const result = await repository.getSearchStatistics('user-123');

            expect(result).toEqual({
                totalSearches: 0,
                uniqueQueries: 0,
                categoryCounts: {},
                averageResultCount: 0,
                mostRecentSearch: null
            });
        });
    });
});