const express = require('express');
const Joi = require('joi');
const YouTubeService = require('../services/youtubeService');
const redisClient = require('../config/redis');
const {
    optimizeResponse,
    paginateResults,
    rateLimitInfo
} = require('../middleware/responseOptimization');
const {
    searchRateLimit,
    sanitizeInput,
    validateRequest
} = require('../middleware/security');

const router = express.Router();
const youtubeService = new YouTubeService();

// Validation schemas
const searchSchema = Joi.object({
    q: Joi.string().max(100).optional(),
    category: Joi.string().valid('gameplay', 'tips', 'review', 'news').optional(),
    maxResults: Joi.number().integer().min(1).max(50).default(25)
});

const relatedSchema = Joi.object({
    videoId: Joi.string().required(),
    maxResults: Joi.number().integer().min(1).max(25).default(10)
});

/**
 * GET /api/videos/search
 * Search for eFootball videos
 */
router.get('/search', searchRateLimit, sanitizeInput, validateRequest, async (req, res, next) => {
    try {
        // Validate query parameters
        const {
            error,
            value
        } = searchSchema.validate(req.query);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const {
            q: query,
            category,
            maxResults
        } = value;

        // Check cache first
        const cacheKey = redisClient.generateSearchKey(query, category, maxResults);
        const cachedResult = await redisClient.get(cacheKey);

        if (cachedResult) {
            console.log('Returning cached search results');
            return res.json({
                ...cachedResult,
                cached: true
            });
        }

        // Search videos
        const result = await youtubeService.searchVideos(query, category, maxResults);

        // Optimize response data
        const optimizedResult = {
            ...result,
            videos: optimizeResponse(result.videos)
        };

        // Cache the result for 5 minutes
        await redisClient.set(cacheKey, optimizedResult, 300);

        res.json({
            ...optimizedResult,
            cached: false,
            meta: {
                responseTime: res.getHeader('X-Response-Time'),
                rateLimit: rateLimitInfo(req, res)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/videos/popular
 * Get popular eFootball videos
 */
router.get('/popular', searchRateLimit, sanitizeInput, validateRequest, async (req, res, next) => {
    try {
        // Validate query parameters
        const {
            error,
            value
        } = searchSchema.validate(req.query);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const {
            category,
            maxResults
        } = value;

        // Check cache first
        const cacheKey = redisClient.generatePopularKey(category, maxResults);
        const cachedResult = await redisClient.get(cacheKey);

        if (cachedResult) {
            console.log('Returning cached popular videos');
            return res.json({
                ...cachedResult,
                cached: true
            });
        }

        // Get popular videos
        const result = await youtubeService.getPopularVideos(category, maxResults);

        // Optimize response data
        const optimizedResult = {
            ...result,
            videos: optimizeResponse(result.videos)
        };

        // Cache the result for 5 minutes
        await redisClient.set(cacheKey, optimizedResult, 300);

        res.json({
            ...optimizedResult,
            cached: false,
            meta: {
                responseTime: res.getHeader('X-Response-Time'),
                rateLimit: rateLimitInfo(req, res)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/videos/related/:videoId
 * Get related videos for a specific video
 */
router.get('/related/:videoId', searchRateLimit, sanitizeInput, validateRequest, async (req, res, next) => {
    try {
        // Validate parameters
        const {
            error,
            value
        } = relatedSchema.validate({
            videoId: req.params.videoId,
            maxResults: req.query.maxResults
        });

        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const {
            videoId,
            maxResults
        } = value;

        // Check cache first
        const cacheKey = redisClient.generateRelatedKey(videoId, maxResults);
        const cachedResult = await redisClient.get(cacheKey);

        if (cachedResult) {
            console.log('Returning cached related videos');
            return res.json({
                ...cachedResult,
                cached: true
            });
        }

        // Get related videos
        const result = await youtubeService.getRelatedVideos(videoId, maxResults);

        // Optimize response data
        const optimizedResult = {
            ...result,
            videos: optimizeResponse(result.videos)
        };

        // Cache the result for 5 minutes
        await redisClient.set(cacheKey, optimizedResult, 300);

        res.json({
            ...optimizedResult,
            cached: false,
            meta: {
                responseTime: res.getHeader('X-Response-Time'),
                rateLimit: rateLimitInfo(req, res)
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;