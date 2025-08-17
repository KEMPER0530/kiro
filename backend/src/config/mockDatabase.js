// Mock database for development when LocalStack is not available
class MockDatabase {
    constructor() {
        this.favorites = new Map();
        this.searchHistory = new Map();
    }

    // Favorites operations
    async addFavorite(userId, videoId, video) {
        const key = `${userId}#${videoId}`;
        const favorite = {
            userId,
            videoId,
            video,
            addedAt: new Date().toISOString()
        };
        this.favorites.set(key, favorite);
        return favorite;
    }

    async removeFavorite(userId, videoId) {
        const key = `${userId}#${videoId}`;
        return this.favorites.delete(key);
    }

    async getUserFavorites(userId, limit = 100) {
        const userFavorites = [];
        for (const [key, favorite] of this.favorites.entries()) {
            if (favorite.userId === userId) {
                userFavorites.push(favorite);
            }
        }
        return userFavorites.slice(0, limit);
    }

    async getFavoriteCount(userId) {
        let count = 0;
        for (const [key, favorite] of this.favorites.entries()) {
            if (favorite.userId === userId) {
                count++;
            }
        }
        return count;
    }

    // Search history operations
    async addSearchHistory(userId, query, category, resultCount) {
        const timestamp = new Date().toISOString();
        const key = `${userId}#${timestamp}`;
        const searchEntry = {
            userId,
            query,
            category,
            timestamp,
            resultCount
        };
        this.searchHistory.set(key, searchEntry);
        return searchEntry;
    }

    async getUserSearchHistory(userId, limit = 10) {
        const userHistory = [];
        for (const [key, entry] of this.searchHistory.entries()) {
            if (entry.userId === userId) {
                userHistory.push(entry);
            }
        }
        // Sort by timestamp descending
        userHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return userHistory.slice(0, limit);
    }

    async getSearchHistoryByCategory(userId, category, limit = 10) {
        const userHistory = [];
        for (const [key, entry] of this.searchHistory.entries()) {
            if (entry.userId === userId && entry.category === category) {
                userHistory.push(entry);
            }
        }
        // Sort by timestamp descending
        userHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return userHistory.slice(0, limit);
    }

    async getRecentUniqueQueries(userId, limit = 5) {
        const queries = new Set();
        const userHistory = [];
        for (const [key, entry] of this.searchHistory.entries()) {
            if (entry.userId === userId) {
                userHistory.push(entry);
            }
        }

        // Sort by timestamp descending
        userHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const uniqueQueries = [];
        for (const entry of userHistory) {
            if (!queries.has(entry.query) && uniqueQueries.length < limit) {
                queries.add(entry.query);
                uniqueQueries.push(entry.query);
            }
        }
        return uniqueQueries;
    }

    async getSearchStatistics(userId) {
        const userHistory = [];
        for (const [key, entry] of this.searchHistory.entries()) {
            if (entry.userId === userId) {
                userHistory.push(entry);
            }
        }

        const categoryCounts = {};
        let totalResultCount = 0;

        for (const entry of userHistory) {
            if (entry.category) {
                categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
            }
            totalResultCount += entry.resultCount || 0;
        }

        return {
            totalSearches: userHistory.length,
            categoryCounts,
            averageResultCount: userHistory.length > 0 ? totalResultCount / userHistory.length : 0
        };
    }

    async clearUserSearchHistory(userId) {
        let deletedCount = 0;
        const keysToDelete = [];

        for (const [key, entry] of this.searchHistory.entries()) {
            if (entry.userId === userId) {
                keysToDelete.push(key);
                deletedCount++;
            }
        }

        keysToDelete.forEach(key => this.searchHistory.delete(key));
        return deletedCount;
    }

    async deleteSearchHistory(userId, timestamp) {
        const key = `${userId}#${timestamp}`;
        return this.searchHistory.delete(key);
    }
}

// Singleton instance
const mockDb = new MockDatabase();

module.exports = mockDb;