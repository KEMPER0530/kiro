const compression = require('compression');

// Response optimization middleware
const responseOptimization = (req, res, next) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Set cache headers for static content
    if (req.url.includes('/api/videos/popular') || req.url.includes('/api/videos/categories')) {
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    } else if (req.url.includes('/api/videos/search')) {
        res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute
    } else {
        res.setHeader('Cache-Control', 'no-cache');
    }

    // Add response time header
    const startTime = Date.now();
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${responseTime}ms`);
    });

    next();
};

// Compression middleware configuration
const compressionMiddleware = compression({
    filter: (req, res) => {
        // Don't compress responses if the request includes a cache-control header to prevent compression
        if (req.headers['x-no-compression']) {
            return false;
        }
        // Use compression filter function
        return compression.filter(req, res);
    },
    level: 6, // Compression level (1-9, 6 is default)
    threshold: 1024, // Only compress responses larger than 1KB
});

// Response size optimization
const optimizeResponse = (data) => {
    if (Array.isArray(data)) {
        return data.map(item => optimizeVideoData(item));
    } else if (data && typeof data === 'object') {
        return optimizeVideoData(data);
    }
    return data;
};

// Optimize video data structure
const optimizeVideoData = (video) => {
    if (!video) return video;

    // Remove unnecessary fields and optimize structure
    const optimized = {
        id: video.id,
        title: video.title,
        description: video.description ? video.description.substring(0, 200) + '...' : '',
        thumbnail: {
            default: video.thumbnail?.default,
            medium: video.thumbnail?.medium,
            high: video.thumbnail?.high
        },
        channelTitle: video.channelTitle,
        publishedAt: video.publishedAt,
        duration: video.duration,
        viewCount: video.viewCount,
        category: video.category
    };

    // Remove undefined/null values
    Object.keys(optimized).forEach(key => {
        if (optimized[key] === undefined || optimized[key] === null) {
            delete optimized[key];
        }
    });

    return optimized;
};

// Pagination helper
const paginateResults = (results, page = 1, limit = 25) => {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedResults = results.slice(startIndex, endIndex);

    return {
        data: paginatedResults,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(results.length / limit),
            totalItems: results.length,
            itemsPerPage: limit,
            hasNextPage: endIndex < results.length,
            hasPrevPage: page > 1
        }
    };
};

// Rate limiting helper
const rateLimitInfo = (req, res) => {
    const remaining = res.getHeader('X-RateLimit-Remaining') || 100;
    const resetTime = res.getHeader('X-RateLimit-Reset') || Date.now() + 3600000;

    return {
        remaining: parseInt(remaining),
        resetTime: new Date(parseInt(resetTime)).toISOString()
    };
};

module.exports = {
    responseOptimization,
    compressionMiddleware,
    optimizeResponse,
    optimizeVideoData,
    paginateResults,
    rateLimitInfo
};