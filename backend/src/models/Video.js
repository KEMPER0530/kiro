/**
 * Video data model with validation
 */
class Video {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.thumbnail = data.thumbnail;
        this.channelTitle = data.channelTitle;
        this.publishedAt = data.publishedAt;
        this.duration = data.duration;
        this.viewCount = data.viewCount;
        this.category = data.category;
    }

    /**
     * Validate video data
     * @param {Object} data - Video data to validate
     * @returns {Object} - Validation result with isValid and errors
     */
    static validate(data) {
        const errors = [];

        // Required fields validation
        if (!data.id || typeof data.id !== 'string' || data.id.trim() === '') {
            errors.push('Video ID is required and must be a non-empty string');
        }

        if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
            errors.push('Video title is required and must be a non-empty string');
        }

        if (!data.channelTitle || typeof data.channelTitle !== 'string' || data.channelTitle.trim() === '') {
            errors.push('Channel title is required and must be a non-empty string');
        }

        // Thumbnail validation
        if (!data.thumbnail || typeof data.thumbnail !== 'object') {
            errors.push('Thumbnail object is required');
        } else {
            if (!data.thumbnail.default || typeof data.thumbnail.default !== 'string') {
                errors.push('Thumbnail default URL is required');
            }
            if (!data.thumbnail.medium || typeof data.thumbnail.medium !== 'string') {
                errors.push('Thumbnail medium URL is required');
            }
            if (!data.thumbnail.high || typeof data.thumbnail.high !== 'string') {
                errors.push('Thumbnail high URL is required');
            }
        }

        // Optional fields validation
        if (data.description !== undefined && typeof data.description !== 'string') {
            errors.push('Description must be a string');
        }

        if (data.publishedAt !== undefined && typeof data.publishedAt !== 'string') {
            errors.push('Published date must be a string');
        }

        if (data.duration !== undefined && typeof data.duration !== 'string') {
            errors.push('Duration must be a string');
        }

        if (data.viewCount !== undefined && typeof data.viewCount !== 'number') {
            errors.push('View count must be a number');
        }

        if (data.category !== undefined && typeof data.category !== 'string') {
            errors.push('Category must be a string');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create a Video instance from validated data
     * @param {Object} data - Video data
     * @returns {Video} - Video instance
     * @throws {Error} - If validation fails
     */
    static create(data) {
        const validation = Video.validate(data);
        if (!validation.isValid) {
            throw new Error(`Video validation failed: ${validation.errors.join(', ')}`);
        }
        return new Video(data);
    }

    /**
     * Convert video instance to plain object for storage
     * @returns {Object} - Plain object representation
     */
    toObject() {
        return {
            id: this.id,
            title: this.title,
            description: this.description || '',
            thumbnail: this.thumbnail,
            channelTitle: this.channelTitle,
            publishedAt: this.publishedAt || '',
            duration: this.duration || '',
            viewCount: this.viewCount || 0,
            category: this.category || ''
        };
    }
}

module.exports = Video;