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

const FavoriteRepository = require('../FavoriteRepository');
const Favorite = require('../../models/Favorite');

describe('FavoriteRepository', () => {
    let repository;

    const validVideoData = {
        id: 'test-video-id',
        title: 'Test Video Title',
        description: 'Test video description',
        thumbnail: {
            default: 'https://example.com/default.jpg',
            medium: 'https://example.com/medium.jpg',
            high: 'https://example.com/high.jpg'
        },
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        duration: 'PT5M30S',
        viewCount: 1000,
        category: 'gameplay'
    };

    beforeEach(() => {
        repository = new FavoriteRepository();
        jest.clearAllMocks();
    });

    describe('addFavorite', () => {
        it('should add a new favorite successfully', async () => {
            // Mock get to return null (favorite doesn't exist)
            mockDocClient.get.mockReturnValue({
                promise: () => Promise.resolve({
                    Item: null
                })
            });

            // Mock put to succeed
            mockDocClient.put.mockReturnValue({
                promise: () => Promise.resolve({})
            });

            const result = await repository.addFavorite('user-123', validVideoData);

            expect(result).toBeInstanceOf(Favorite);
            expect(result.userId).toBe('user-123');
            expect(result.videoId).toBe(validVideoData.id);
            expect(mockDocClient.put).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: 'efootball-favorites',
                    Item: expect.objectContaining({
                        userId: 'user-123',
                        videoId: validVideoData.id
                    }),
                    ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(videoId)'
                })
            );
        });

        it('should throw error if favorite already exists', async () => {
            // Mock get to return existing favorite
            mockDocClient.get.mockReturnValue({
                promise: () => Promise.resolve({
                    Item: {
                        userId: 'user-123',
                        videoId: validVideoData.id,
                        video: validVideoData,
                        addedAt: '2023-01-01T00:00:00Z'
                    }
                })
            });

            await expect(repository.addFavorite('user-123', validVideoData))
                .rejects.toThrow('Video is already in favorites');
        });
    });

    describe('getFavorite', () => {
        it('should return favorite if exists', async () => {
            const favoriteItem = {
                userId: 'user-123',
                videoId: validVideoData.id,
                video: validVideoData,
                addedAt: '2023-01-01T00:00:00Z'
            };

            mockDocClient.get.mockReturnValue({
                promise: () => Promise.resolve({
                    Item: favoriteItem
                })
            });

            const result = await repository.getFavorite('user-123', validVideoData.id);

            expect(result).toBeInstanceOf(Favorite);
            expect(result.userId).toBe('user-123');
            expect(result.videoId).toBe(validVideoData.id);
        });

        it('should return null if favorite does not exist', async () => {
            mockDocClient.get.mockReturnValue({
                promise: () => Promise.resolve({
                    Item: null
                })
            });

            const result = await repository.getFavorite('user-123', 'non-existent-id');

            expect(result).toBeNull();
        });
    });

    describe('removeFavorite', () => {
        it('should remove favorite successfully', async () => {
            mockDocClient.delete.mockReturnValue({
                promise: () => Promise.resolve({})
            });

            const result = await repository.removeFavorite('user-123', validVideoData.id);

            expect(result).toBe(true);
            expect(mockDocClient.delete).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: 'efootball-favorites',
                    Key: {
                        userId: 'user-123',
                        videoId: validVideoData.id
                    },
                    ConditionExpression: 'attribute_exists(userId) AND attribute_exists(videoId)'
                })
            );
        });

        it('should return false if favorite does not exist', async () => {
            const error = new Error('ConditionalCheckFailedException');
            error.code = 'ConditionalCheckFailedException';

            mockDocClient.delete.mockReturnValue({
                promise: () => Promise.reject(error)
            });

            const result = await repository.removeFavorite('user-123', 'non-existent-id');

            expect(result).toBe(false);
        });
    });

    describe('getUserFavorites', () => {
        it('should return user favorites', async () => {
            const favoriteItems = [{
                    userId: 'user-123',
                    videoId: 'video-1',
                    video: validVideoData,
                    addedAt: '2023-01-01T00:00:00Z'
                },
                {
                    userId: 'user-123',
                    videoId: 'video-2',
                    video: validVideoData,
                    addedAt: '2023-01-02T00:00:00Z'
                }
            ];

            mockDocClient.query.mockReturnValue({
                promise: () => Promise.resolve({
                    Items: favoriteItems
                })
            });

            const result = await repository.getUserFavorites('user-123');

            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(Favorite);
            expect(result[1]).toBeInstanceOf(Favorite);
            expect(mockDocClient.query).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: 'efootball-favorites',
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

    describe('isFavorite', () => {
        it('should return true if favorite exists', async () => {
            mockDocClient.get.mockReturnValue({
                promise: () => Promise.resolve({
                    Item: {
                        userId: 'user-123',
                        videoId: validVideoData.id,
                        video: validVideoData,
                        addedAt: '2023-01-01T00:00:00Z'
                    }
                })
            });

            const result = await repository.isFavorite('user-123', validVideoData.id);

            expect(result).toBe(true);
        });

        it('should return false if favorite does not exist', async () => {
            mockDocClient.get.mockReturnValue({
                promise: () => Promise.resolve({
                    Item: null
                })
            });

            const result = await repository.isFavorite('user-123', 'non-existent-id');

            expect(result).toBe(false);
        });
    });

    describe('getFavoriteCount', () => {
        it('should return favorite count', async () => {
            mockDocClient.query.mockReturnValue({
                promise: () => Promise.resolve({
                    Count: 5
                })
            });

            const result = await repository.getFavoriteCount('user-123');

            expect(result).toBe(5);
            expect(mockDocClient.query).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: 'efootball-favorites',
                    KeyConditionExpression: 'userId = :userId',
                    ExpressionAttributeValues: {
                        ':userId': 'user-123'
                    },
                    Select: 'COUNT'
                })
            );
        });
    });
});