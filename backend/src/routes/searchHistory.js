const express = require('express');
const Joi = require('joi');
const SearchHistoryRepository = require('../repositories/SearchHistoryRepository');

const router = express.Router();
const searchHistoryRepository = new SearchHistoryRepository();

// Validation schemas
const getSearchHistorySchema = Joi.object({
    userId: Joi.string().required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    category: Joi.string().valid('gameplay', 'tips', 'review', 'news').optional()
});

const addSearchHistorySchema = Joi.object({
    userId: Joi.string().required(),
    query: Joi.string().min(1).max(100).required(),
    category: Joi.string().valid('gameplay', 'tips', 'review', 'news').optional(),
    resultCount: Joi.number().integer().min(0).default(0)
});

/**
 * GET /api/search-history
 * Get user's search history
 */
router.get('/', async (req, res, next) => {
    try {
        // Validate query parameters
        const {
            error,
            value
        } = getSearchHistorySchema.validate(req.query);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const {
            userId,
            limit,
            category
        } = value;

        let searchHistory;
        if (category) {
            // Get search history filtered by category
            searchHistory = await searchHistoryRepository.getSearchHistoryByCategory(userId, category, limit);
        } else {
            // Get all search history
            searchHistory = await searchHistoryRepository.getUserSearchHistory(userId, limit);
        }

        // Get recent unique queries for suggestions
        const recentQueries = await searchHistoryRepository.getRecentUniqueQueries(userId, 5);

        // Get search statistics
        const statistics = await searchHistoryRepository.getSearchStatistics(userId);

        res.json({
            success: true,
            history: searchHistory.map(entry => ({
                query: entry.query,
                category: entry.category,
                timestamp: entry.timestamp,
                resultCount: entry.resultCount
            })),
            recentQueries,
            statistics,
            count: searchHistory.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/search-history
 * Add search query to history
 */
router.post('/', async (req, res, next) => {
    try {
        // Validate request body
        const {
            error,
            value
        } = addSearchHistorySchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const {
            userId,
            query,
            category,
            resultCount
        } = value;

        // Add search query to history
        const searchHistory = await searchHistoryRepository.addSearchHistory(userId, query, category, resultCount);

        res.status(201).json({
            success: true,
            message: 'Search query added to history',
            searchHistory: {
                query: searchHistory.query,
                category: searchHistory.category,
                timestamp: searchHistory.timestamp,
                resultCount: searchHistory.resultCount
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/search-history
 * Clear user's search history
 */
router.delete('/', async (req, res, next) => {
    try {
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

        // Clear all search history for the user
        const deletedCount = await searchHistoryRepository.clearUserSearchHistory(userId);

        res.json({
            success: true,
            message: `Cleared ${deletedCount} search history entries`,
            deletedCount
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/search-history/:timestamp
 * Delete a specific search history entry
 */
router.delete('/:timestamp', async (req, res, next) => {
    try {
        const {
            timestamp
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

        if (!timestamp) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'timestamp parameter is required'
            });
        }

        // Delete specific search history entry
        const deleted = await searchHistoryRepository.deleteSearchHistory(userId, timestamp);

        if (!deleted) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Search history entry not found'
            });
        }

        res.json({
            success: true,
            message: 'Search history entry deleted'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;