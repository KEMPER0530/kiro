const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Enhanced rate limiting for different endpoints
const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: 'Too Many Requests',
            message: message || 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
};

// Different rate limits for different endpoints
const searchRateLimit = createRateLimit(
    60 * 1000, // 1 minute
    30, // 30 requests per minute
    'Too many search requests, please slow down'
);

const favoritesRateLimit = createRateLimit(
    60 * 1000, // 1 minute
    60, // 60 requests per minute
    'Too many favorites requests, please slow down'
);

const generalRateLimit = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per 15 minutes
    'Too many requests, please try again later'
);

// Speed limiter to slow down requests after threshold
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per windowMs without delay
    delayMs: 500, // add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // maximum delay of 20 seconds
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Sanitize query parameters
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                // Remove potentially dangerous characters
                req.query[key] = req.query[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
                    .replace(/\s*on\w+\s*=\s*[^"'\s>]+/gi, '')
                    .trim();
            }
        });
    }

    // Sanitize body parameters
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }

    next();
};

// Recursive object sanitization
const sanitizeObject = (obj) => {
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
            obj[key] = obj[key]
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
                .replace(/\s*on\w+\s*=\s*[^"'\s>]+/gi, '')
                .trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    });
};

// Request validation middleware (runs before sanitization)
const validateRequest = (req, res, next) => {
    // Check for suspicious patterns in the original request
    const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi
    ];

    // Get original URL and body before sanitization
    const originalUrl = decodeURIComponent(req.originalUrl || req.url);
    const requestString = originalUrl + JSON.stringify(req.body || {});

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestString)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Request contains potentially malicious content'
            });
        }
    }

    next();
};

// API key validation middleware
const validateApiKey = (req, res, next) => {
    // Skip validation in development
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    const apiKey = req.headers['x-api-key'];
    const validApiKeys = process.env.VALID_API_KEYS ? process.env.VALID_API_KEYS.split(',') : [];

    if (!apiKey || !validApiKeys.includes(apiKey)) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Valid API key required'
        });
    }

    next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
        const responseTime = Date.now() - startTime;

        // Log request details (be careful not to log sensitive data)
        console.log({
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            responseTime: `${responseTime}ms`,
            statusCode: res.statusCode,
            contentLength: data ? data.length : 0
        });

        originalSend.call(this, data);
    };

    next();
};

module.exports = {
    searchRateLimit,
    favoritesRateLimit,
    generalRateLimit,
    speedLimiter,
    sanitizeInput,
    validateRequest,
    validateApiKey,
    requestLogger
};