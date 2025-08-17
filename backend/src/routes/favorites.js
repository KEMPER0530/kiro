const express = require('express');
const Joi = require('joi');
const FavoriteRepository = require('../repositories/FavoriteRepository');

const router = express.Router();
const favoriteRepository = new FavoriteRepository();

// Validation schemas
const addFavoriteSchema = Joi.object({
    userId: Joi.string().required(),
    video: Joi.object({
        id: Joi.string().required(),
        title: Joi.string().required(),
        description: Joi.string().allow('').optional(),
        thumbnail: Joi.object({
            default: Joi.string().uri().required(),
            medium: Joi.string().uri().optional(),
            high: Joi.string().uri().optional()
        }).required(),
        channelTitle: Joi.string().required(),
        publishedAt: Joi.string().isoDate().required(),
        duration: Joi.string().required(),
        viewCount: Joi.number().integer().min(0).optional(),
        category: Joi.string().optional()
    }).required()
});

const getUserFavoritesSchema = Joi.object({
    userId: Joi.string().required(),
    limit: Joi.number().integer().min(1).max(100).default(100)
});

/**
 * GET /api/favorites
 * Get user's favorite videos
 */
router.get('/', async (req, res, next) => {
    try {
        // Validate query parameters
        const {
            error,
            value
        } = getUserFavoritesSchema.validate(req.query);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const {
            userId,
            limit
        } = value;

        // Get user's favorites
        const favorites = await favoriteRepository.getUserFavorites(userId, limit);

        res.json({
            success: true,
            favorites: favorites.map(favorite => ({
                videoId: favorite.videoId,
                video: favorite.video,
                addedAt: favorite.addedAt
            })),
            count: favorites.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/favorites
 * Add video to favorites
 */
router.post('/', async (req, res, next) => {
    try {
        // Validate request body
        const {
            error,
            value
        } = addFavoriteSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const {
            userId,
            video
        } = value;

        // Check if user has reached the maximum number of favorites (100)
        const favoriteCount = await favoriteRepository.getFavoriteCount(userId);
        if (favoriteCount >= 100) {
            return res.status(400).json({
                error: 'Limit Exceeded',
                message: 'Maximum number of favorites (100) reached'
            });
        }

        // Add video to favorites
        const favorite = await favoriteRepository.addFavorite(userId, video);

        res.status(201).json({
            success: true,
            message: 'Video added to favorites',
            favorite: {
                videoId: favorite.videoId,
                video: favorite.video,
                addedAt: favorite.addedAt
            }
        });
    } catch (error) {
        if (error.message === 'Video is already in favorites') {
            return res.status(409).json({
                error: 'Conflict',
                message: error.message
            });
        }
        next(error);
    }
});

/**
 * DELETE /api/favorites/:videoId
 * Remove video from favorites
 */
router.delete('/:videoId', async (req, res, next) => {
    try {
        const {
            videoId
        } = req.params;
        const {
            userId
        } = req.query;

        // Validate required parameters
        if (!userId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'userId query parameter is required'
            });
        }

        if (!videoId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'videoId parameter is required'
            });
        }

        // Remove video from favorites
        const removed = await favoriteRepository.removeFavorite(userId, videoId);

        if (!removed) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Video not found in favorites'
            });
        }

        res.json({
            success: true,
            message: 'Video removed from favorites'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;