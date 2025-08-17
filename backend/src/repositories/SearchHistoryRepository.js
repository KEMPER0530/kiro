const SearchHistory = require('../models/SearchHistory');

// Use mock database if specified
const useMockDb = process.env.USE_MOCK_DB === 'true';
let docClient, mockDb;

if (useMockDb) {
    mockDb = require('../config/mockDatabase');
    console.log('Using mock database for search history');
} else {
    const {
        docClient: dynamoClient
    } = require('../config/database');
    docClient = dynamoClient;
}

/**
 * Repository class for SearchHistory operations with DynamoDB
 */
class SearchHistoryRepository {
    constructor() {
        this.tableName = process.env.DYNAMODB_TABLE_SEARCH_HISTORY || 'efootball-search-history';
        this.maxHistoryItems = 10; // As per requirements
    }

    /**
     * Add a search query to user's history
     * @param {string} userId - User ID
     * @param {string} query - Search query
     * @param {string} category - Optional category
     * @param {number} resultCount - Number of results returned
     * @returns {Promise<SearchHistory>} - Created search history entry
     */
    async addSearchHistory(userId, query, category = null, resultCount = 0) {
        try {
            if (useMockDb) {
                const searchData = await mockDb.addSearchHistory(userId, query, category, resultCount);
                return SearchHistory.fromDynamoDBItem(searchData);
            } else {
                const searchHistory = SearchHistory.createNew(userId, query, category, resultCount);

                // First, add the new search history entry
                const params = {
                    TableName: this.tableName,
                    Item: searchHistory.toDynamoDBItem()
                };

                await docClient.put(params).promise();

                // Then, clean up old entries to maintain max limit
                await this.cleanupOldEntries(userId);

                return searchHistory;
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get search history for a user
     * @param {string} userId - User ID
     * @param {number} limit - Maximum number of items to return (default: 10)
     * @returns {Promise<SearchHistory[]>} - Array of search history entries
     */
    async getUserSearchHistory(userId, limit = 10, enforceLimit = true) {
        try {
            const queryLimit = enforceLimit ? Math.min(limit, this.maxHistoryItems) : limit;
            if (useMockDb) {
                const history = await mockDb.getUserSearchHistory(userId, queryLimit);
                return history.map(item => SearchHistory.fromDynamoDBItem(item));
            } else {
                const params = {
                    TableName: this.tableName,
                    KeyConditionExpression: 'userId = :userId',
                    ExpressionAttributeValues: {
                        ':userId': userId
                    },
                    ScanIndexForward: false, // Sort by timestamp in descending order (newest first)
                    Limit: queryLimit
                };

                const result = await docClient.query(params).promise();
                return result.Items.map(item => SearchHistory.fromDynamoDBItem(item));
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get recent unique search queries for a user
     * @param {string} userId - User ID
     * @param {number} limit - Maximum number of unique queries to return
     * @returns {Promise<string[]>} - Array of unique search queries
     */
    async getRecentUniqueQueries(userId, limit = 5) {
        try {
            if (useMockDb) {
                return await mockDb.getRecentUniqueQueries(userId, limit);
            } else {
                const searchHistory = await this.getUserSearchHistory(userId, this.maxHistoryItems);

                // Extract unique queries while preserving order
                const uniqueQueries = [];
                const seenQueries = new Set();

                for (const entry of searchHistory) {
                    const normalizedQuery = entry.query.toLowerCase().trim();
                    if (!seenQueries.has(normalizedQuery) && uniqueQueries.length < limit) {
                        uniqueQueries.push(entry.query);
                        seenQueries.add(normalizedQuery);
                    }
                }

                return uniqueQueries;
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get search history by category for a user
     * @param {string} userId - User ID
     * @param {string} category - Category to filter by
     * @param {number} limit - Maximum number of items to return
     * @returns {Promise<SearchHistory[]>} - Array of search history entries
     */
    async getSearchHistoryByCategory(userId, category, limit = 10) {
        try {
            const params = {
                TableName: this.tableName,
                KeyConditionExpression: 'userId = :userId',
                FilterExpression: '#category = :category',
                ExpressionAttributeNames: {
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
            return result.Items.map(item => SearchHistory.fromDynamoDBItem(item));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Delete a specific search history entry
     * @param {string} userId - User ID
     * @param {string} timestamp - Timestamp of the entry to delete
     * @returns {Promise<boolean>} - True if deleted, false if not found
     */
    async deleteSearchHistory(userId, timestamp) {
        try {
            const params = {
                TableName: this.tableName,
                Key: {
                    userId,
                    timestamp
                },
                ConditionExpression: 'attribute_exists(userId) AND attribute_exists(timestamp)'
            };

            await docClient.delete(params).promise();
            return true;
        } catch (error) {
            if (error.code === 'ConditionalCheckFailedException') {
                return false; // Item didn't exist
            }
            throw error;
        }
    }

    /**
     * Clear all search history for a user
     * @param {string} userId - User ID
     * @returns {Promise<number>} - Number of items deleted
     */
    async clearUserSearchHistory(userId) {
        try {
            const searchHistory = await this.getUserSearchHistory(userId, 100, false);

            if (searchHistory.length === 0) {
                return 0;
            }

            // Batch delete items
            const deleteRequests = searchHistory.map(entry => ({
                DeleteRequest: {
                    Key: {
                        userId: entry.userId,
                        timestamp: entry.timestamp
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

    /**
     * Clean up old search history entries to maintain max limit
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     * @private
     */
    async cleanupOldEntries(userId) {
        try {
            const allEntries = await this.getUserSearchHistory(userId, 100, false);

            if (allEntries.length <= this.maxHistoryItems) {
                return; // No cleanup needed
            }

            // Keep only the most recent entries
            const entriesToDelete = allEntries.slice(this.maxHistoryItems);

            if (entriesToDelete.length === 0) {
                return;
            }

            // Delete old entries
            const deleteRequests = entriesToDelete.map(entry => ({
                DeleteRequest: {
                    Key: {
                        userId: entry.userId,
                        timestamp: entry.timestamp
                    }
                }
            }));

            // Process in batches
            const batchSize = 25;
            for (let i = 0; i < deleteRequests.length; i += batchSize) {
                const batch = deleteRequests.slice(i, i + batchSize);
                const params = {
                    RequestItems: {
                        [this.tableName]: batch
                    }
                };

                await docClient.batchWrite(params).promise();
            }
        } catch (error) {
            // Log error but don't throw - cleanup failure shouldn't break the main operation
            console.error('Failed to cleanup old search history entries:', error);
        }
    }

    /**
     * Get search statistics for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Search statistics
     */
    async getSearchStatistics(userId) {
        try {
            if (useMockDb) {
                return await mockDb.getSearchStatistics(userId);
            } else {
                const searchHistory = await this.getUserSearchHistory(userId, 100, false);

                const stats = {
                    totalSearches: searchHistory.length,
                    uniqueQueries: new Set(searchHistory.map(entry => entry.query.toLowerCase())).size,
                    categoryCounts: {},
                    averageResultCount: 0,
                    mostRecentSearch: null
                };

                if (searchHistory.length > 0) {
                    // Calculate category counts
                    searchHistory.forEach(entry => {
                        const category = entry.category || 'uncategorized';
                        stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + 1;
                    });

                    // Calculate average result count
                    const totalResults = searchHistory.reduce((sum, entry) => sum + (entry.resultCount || 0), 0);
                    stats.averageResultCount = Math.round(totalResults / searchHistory.length);

                    // Most recent search
                    stats.mostRecentSearch = searchHistory[0].timestamp;
                }

                return stats;
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports = SearchHistoryRepository;