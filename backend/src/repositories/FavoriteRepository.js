const Favorite = require('../models/Favorite');

// Use mock database if specified
const useMockDb = process.env.USE_MOCK_DB === 'true';
let docClient, mockDb;

if (useMockDb) {
    mockDb = require('../config/mockDatabase');
    console.log('Using mock database for favorites');
} else {
    const {
        docClient: dynamoClient
    } = require('../config/database');
    docClient = dynamoClient;
}

/**
 * Repository class for Favorite operations with DynamoDB
 */
class FavoriteRepository {
    constructor() {
        this.tableName = process.env.DYNAMODB_TABLE_FAVORITES || 'efootball-favorites';
    }

    /**
     * Add a video to user's favorites
     * @param {string} userId - User ID
     * @param {Object} video - Video object
     * @returns {Promise<Favorite>} - Created favorite
     * @throws {Error} - If favorite already exists or validation fails
     */
    async addFavorite(userId, video) {
        try {
            if (useMockDb) {
                // Check if favorite already exists
                const userFavorites = await mockDb.getUserFavorites(userId);
                const existing = userFavorites.find(fav => fav.videoId === video.id);
                if (existing) {
                    throw new Error('Video is already in favorites');
                }

                const favoriteData = await mockDb.addFavorite(userId, video.id, video);
                return Favorite.fromDynamoDBItem(favoriteData);
            } else {
                const favorite = Favorite.createNew(userId, video);

                // Check if favorite already exists
                const existing = await this.getFavorite(userId, video.id);
                if (existing) {
                    throw new Error('Video is already in favorites');
                }

                const params = {
                    TableName: this.tableName,
                    Item: favorite.toDynamoDBItem(),
                    ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(videoId)'
                };

                await docClient.put(params).promise();
                return favorite;
            }
        } catch (error) {
            if (error.code === 'ConditionalCheckFailedException') {
                throw new Error('Video is already in favorites');
            }
            throw error;
        }
    }

    /**
     * Remove a video from user's favorites
     * @param {string} userId - User ID
     * @param {string} videoId - Video ID
     * @returns {Promise<boolean>} - True if removed, false if not found
     */
    async removeFavorite(userId, videoId) {
        try {
            if (useMockDb) {
                return await mockDb.removeFavorite(userId, videoId);
            } else {
                const params = {
                    TableName: this.tableName,
                    Key: {
                        userId,
                        videoId
                    },
                    ConditionExpression: 'attribute_exists(userId) AND attribute_exists(videoId)'
                };

                await docClient.delete(params).promise();
                return true;
            }
        } catch (error) {
            if (error.code === 'ConditionalCheckFailedException') {
                return false; // Item didn't exist
            }
            throw error;
        }
    }

    /**
     * Get a specific favorite
     * @param {string} userId - User ID
     * @param {string} videoId - Video ID
     * @returns {Promise<Favorite|null>} - Favorite or null if not found
     */
    async getFavorite(userId, videoId) {
        try {
            const params = {
                TableName: this.tableName,
                Key: {
                    userId,
                    videoId
                }
            };

            const result = await docClient.get(params).promise();
            return result.Item ? Favorite.fromDynamoDBItem(result.Item) : null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get all favorites for a user
     * @param {string} userId - User ID
     * @param {number} limit - Maximum number of items to return (default: 100)
     * @returns {Promise<Favorite[]>} - Array of favorites
     */
    async getUserFavorites(userId, limit = 100) {
        try {
            if (useMockDb) {
                const favorites = await mockDb.getUserFavorites(userId, limit);
                return favorites.map(item => Favorite.fromDynamoDBItem(item));
            } else {
                const params = {
                    TableName: this.tableName,
                    KeyConditionExpression: 'userId = :userId',
                    ExpressionAttributeValues: {
                        ':userId': userId
                    },
                    ScanIndexForward: false, // Sort by sort key in descending order (newest first)
                    Limit: Math.min(limit, 100) // Cap at 100 as per requirements
                };

                const result = await docClient.query(params).promise();
                return result.Items.map(item => Favorite.fromDynamoDBItem(item));
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Check if a video is in user's favorites
     * @param {string} userId - User ID
     * @param {string} videoId - Video ID
     * @returns {Promise<boolean>} - True if favorite exists
     */
    async isFavorite(userId, videoId) {
        try {
            const favorite = await this.getFavorite(userId, videoId);
            return favorite !== null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get favorite count for a user
     * @param {string} userId - User ID
     * @returns {Promise<number>} - Number of favorites
     */
    async getFavoriteCount(userId) {
        try {
            if (useMockDb) {
                return await mockDb.getFavoriteCount(userId);
            } else {
                const params = {
                    TableName: this.tableName,
                    KeyConditionExpression: 'userId = :userId',
                    ExpressionAttributeValues: {
                        ':userId': userId
                    },
                    Select: 'COUNT'
                };

                const result = await docClient.query(params).promise();
                return result.Count;
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get favorites by category for a user
     * @param {string} userId - User ID
     * @param {string} category - Category to filter by
     * @param {number} limit - Maximum number of items to return
     * @returns {Promise<Favorite[]>} - Array of favorites in the category
     */
    async getFavoritesByCategory(userId, category, limit = 50) {
        try {
            const params = {
                TableName: this.tableName,
                KeyConditionExpression: 'userId = :userId',
                FilterExpression: '#video.#category = :category',
                ExpressionAttributeNames: {
                    '#video': 'video',
                    '#category': 'category'
                },
                ExpressionAttributeValues: {
                    ':userId': userId,
                    ':category': category
                },
                ScanIndexForward: false,
                Limit: limit
            };

            const result = await docClient.query(params).promise();
            return result.Items.map(item => Favorite.fromDynamoDBItem(item));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Remove all favorites for a user (for cleanup/testing)
     * @param {string} userId - User ID
     * @returns {Promise<number>} - Number of items deleted
     */
    async removeAllUserFavorites(userId) {
        try {
            const favorites = await this.getUserFavorites(userId, 100);

            if (favorites.length === 0) {
                return 0;
            }

            // Batch delete items
            const deleteRequests = favorites.map(favorite => ({
                DeleteRequest: {
                    Key: {
                        userId: favorite.userId,
                        videoId: favorite.videoId
                    }
                }
            }));

            // DynamoDB batch write can handle max 25 items at a time
            const batchSize = 25;
            let deletedCount = 0;

            for (let i = 0; i < deleteRequests.length; i += batchSize) {
                const batch = deleteRequests.slice(i, i + batchSize);
                const params = {
                    RequestItems: {
                        [this.tableName]: batch
                    }
                };

                await docClient.batchWrite(params).promise();
                deletedCount += batch.length;
            }

            return deletedCount;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = FavoriteRepository;