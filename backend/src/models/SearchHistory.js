/**
 * SearchHistory data model with validation
 */
class SearchHistory {
    constructor(data) {
        this.userId = data.userId;
        this.query = data.query;
        this.timestamp = data.timestamp;
        this.category = data.category;
        this.resultCount = data.resultCount;
    }

    /**
     * Validate search history data
     * @param {Object} data - Search history data to validate
     * @returns {Object} - Validation result with isValid and errors
     */
    static validate(data) {
        const errors = [];

        // Required fields validation
        if (!data.userId || typeof data.userId !== 'string' || data.userId.trim() === '') {
            errors.push('User ID is required and must be a non-empty string');
        }

        if (!data.query || typeof data.query !== 'string' || data.query.trim() === '') {
            errors.push('Search query is required and must be a non-empty string');
        }

        if (!data.timestamp || typeof data.timestamp !== 'string') {
            errors.push('Timestamp is required and must be a string');
        } else {
            // Validate ISO date format
            const date = new Date(data.timestamp);
            if (isNaN(date.getTime())) {
                errors.push('Timestamp must be a valid ISO date string');
            }
        }

        // Optional fields validation
        if (data.category !== undefined && data.category !== null && typeof data.category !== 'string') {
            errors.push('Category must be a string');
        }

        if (data.resultCount !== undefined && typeof data.resultCount !== 'number') {
            errors.push('Result count must be a number');
        }

        // Query length validation
        if (data.query && data.query.length > 500) {
            errors.push('Search query must be less than 500 characters');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create a SearchHistory instance from validated data
     * @param {Object} data - Search history data
     * @returns {SearchHistory} - SearchHistory instance
     * @throws {Error} - If validation fails
     */
    static create(data) {
        const validation = SearchHistory.validate(data);
        if (!validation.isValid) {
            throw new Error(`SearchHistory validation failed: ${validation.errors.join(', ')}`);
        }
        return new SearchHistory(data);
    }

    /**
     * Create a new search history entry with current timestamp
     * @param {string} userId - User ID
     * @param {string} query - Search query
     * @param {string} category - Optional category
     * @param {number} resultCount - Optional result count
     * @returns {SearchHistory} - SearchHistory instance
     */
    static createNew(userId, query, category = null, resultCount = 0) {
        const data = {
            userId,
            query: query.trim(),
            timestamp: new Date().toISOString(),
            category,
            resultCount
        };
        return SearchHistory.create(data);
    }

    /**
     * Convert search history instance to plain object for storage
     * @returns {Object} - Plain object representation
     */
    toObject() {
        return {
            userId: this.userId,
            query: this.query,
            timestamp: this.timestamp,
            category: this.category || null,
            resultCount: this.resultCount || 0
        };
    }

    /**
     * Convert search history instance to DynamoDB item format
     * @returns {Object} - DynamoDB item format
     */
    toDynamoDBItem() {
        const item = {
            userId: this.userId,
            query: this.query,
            timestamp: this.timestamp,
            resultCount: this.resultCount || 0
        };

        // Only include category if it's not null/undefined
        if (this.category) {
            item.category = this.category;
        }

        return item;
    }

    /**
     * Create SearchHistory instance from DynamoDB item
     * @param {Object} item - DynamoDB item
     * @returns {SearchHistory} - SearchHistory instance
     */
    static fromDynamoDBItem(item) {
        return new SearchHistory({
            userId: item.userId,
            query: item.query,
            timestamp: item.timestamp,
            category: item.category || null,
            resultCount: item.resultCount || 0
        });
    }
}

module.exports = SearchHistory;