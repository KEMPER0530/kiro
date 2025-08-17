const redis = require('redis');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    /**
     * Initialize Redis connection
     */
    async connect() {
        try {
            // Use REDIS_URL if available, otherwise construct from individual components
            if (process.env.REDIS_URL) {
                this.client = redis.createClient({
                    url: process.env.REDIS_URL
                });
            } else {
                const redisConfig = {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: process.env.REDIS_PORT || 6379,
                    password: process.env.REDIS_PASSWORD || undefined,
                    db: process.env.REDIS_DB || 0,
                    retryDelayOnFailover: 100,
                    maxRetriesPerRequest: 3,
                    lazyConnect: true
                };

                this.client = redis.createClient(redisConfig);
            }

            // Event listeners
            this.client.on('connect', () => {
                console.log('Redis client connected');
                this.isConnected = true;
            });

            this.client.on('error', (err) => {
                console.error('Redis client error:', err);
                this.isConnected = false;
            });

            this.client.on('end', () => {
                console.log('Redis client disconnected');
                this.isConnected = false;
            });

            await this.client.connect();

            // Test connection
            await this.client.ping();
            console.log('Redis connection established successfully');

            return this.client;
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            this.isConnected = false;
            // Don't throw error - app should work without Redis cache
            return null;
        }
    }

    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {Promise<any>} Cached data or null
     */
    async get(key) {
        if (!this.isConnected || !this.client) {
            return null;
        }

        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }

    /**
     * Set cached data with expiration
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
     * @returns {Promise<boolean>} Success status
     */
    async set(key, data, ttl = 300) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            await this.client.setEx(key, ttl, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Redis set error:', error);
            return false;
        }
    }

    /**
     * Delete cached data
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async del(key) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error('Redis delete error:', error);
            return false;
        }
    }

    /**
     * Generate cache key for search results
     * @param {string} query - Search query
     * @param {string} category - Category filter
     * @param {number} maxResults - Max results
     * @returns {string} Cache key
     */
    generateSearchKey(query, category = '', maxResults = 25) {
        const normalizedQuery = (query || '').toLowerCase().trim();
        return `search:${normalizedQuery}:${category}:${maxResults}`;
    }

    /**
     * Generate cache key for popular videos
     * @param {string} category - Category filter
     * @param {number} maxResults - Max results
     * @returns {string} Cache key
     */
    generatePopularKey(category = '', maxResults = 25) {
        return `popular:${category}:${maxResults}`;
    }

    /**
     * Generate cache key for related videos
     * @param {string} videoId - Video ID
     * @param {number} maxResults - Max results
     * @returns {string} Cache key
     */
    generateRelatedKey(videoId, maxResults = 10) {
        return `related:${videoId}:${maxResults}`;
    }

    /**
     * Close Redis connection
     */
    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.isConnected = false;
        }
    }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;