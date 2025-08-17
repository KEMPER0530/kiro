const Video = require('./Video');

/**
 * Favorite data model with validation
 */
class Favorite {
    constructor(data) {
        this.userId = data.userId;
        this.videoId = data.videoId;
        this.video = data.video;
        this.addedAt = data.addedAt;
    }

    /**
     * Validate favorite data
     * @param {Object} data - Favorite data to validate
     * @returns {Object} - Validation result with isValid and errors
     */
    static validate(data) {
        const errors = [];

        // Required fields validation
        if (!data.userId || typeof data.userId !== 'string' || data.userId.trim() === '') {
            errors.push('User ID is required and must be a non-empty string');
        }

        if (!data.videoId || typeof data.videoId !== 'string' || data.videoId.trim() === '') {
            errors.push('Video ID is required and must be a non-empty string');
        }

        if (!data.video || typeof data.video !== 'object') {
            errors.push('Video object is required');
        } else {
            // Validate the embedded video object
            const videoValidation = Video.validate(data.video);
            if (!videoValidation.isValid) {
                errors.push(`Video validation failed: ${videoValidation.errors.join(', ')}`);
            }
        }

        if (!data.addedAt || typeof data.addedAt !== 'string') {
            errors.push('Added date is required and must be a string');
        } else {
            // Validate ISO date format
            const date = new Date(data.addedAt);
            if (isNaN(date.getTime())) {
                errors.push('Added date must be a valid ISO date string');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create a Favorite instance from validated data
     * @param {Object} data - Favorite data
     * @returns {Favorite} - Favorite instance
     * @throws {Error} - If validation fails
     */
    static create(data) {
        const validation = Favorite.validate(data);
        if (!validation.isValid) {
            throw new Error(`Favorite validation failed: ${validation.errors.join(', ')}`);
        }
        return new Favorite(data);
    }

    /**
     * Create a new favorite with current timestamp
     * @param {string} userId - User ID
     * @param {Object} video - Video object
     * @returns {Favorite} - Favorite instance
     */
    static createNew(userId, video) {
        const data = {
            userId,
            videoId: video.id,
            video,
            addedAt: new Date().toISOString()
        };
        return Favorite.create(data);
    }

    /**
     * Convert favorite instance to plain object for storage
     * @returns {Object} - Plain object representation
     */
    toObject() {
        return {
            userId: this.userId,
            videoId: this.videoId,
            video: this.video,
            addedAt: this.addedAt
        };
    }

    /**
     * Convert favorite instance to DynamoDB item format
     * @returns {Object} - DynamoDB item format
     */
    toDynamoDBItem() {
        return {
            userId: this.userId,
            videoId: this.videoId,
            video: this.video,
            addedAt: this.addedAt
        };
    }

    /**
     * Create Favorite instance from DynamoDB item
     * @param {Object} item - DynamoDB item
     * @returns {Favorite} - Favorite instance
     */
    static fromDynamoDBItem(item) {
        return new Favorite({
            userId: item.userId,
            videoId: item.videoId,
            video: item.video,
            addedAt: item.addedAt
        });
    }
}

module.exports = Favorite;