const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // YouTube API specific errors
    if (err.response && err.response.status) {
        const status = err.response.status;
        const message = (err.response.data && err.response.data.error && err.response.data.error.message) || 'YouTube API error';

        switch (status) {
            case 400:
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Invalid request parameters',
                    details: message
                });
            case 403:
                return res.status(403).json({
                    error: 'API Quota Exceeded',
                    message: 'YouTube API quota has been exceeded. Please try again later.',
                    details: message
                });
            case 404:
                return res.status(404).json({
                    error: 'Not Found',
                    message: 'Requested resource not found',
                    details: message
                });
            default:
                return res.status(status).json({
                    error: 'YouTube API Error',
                    message: message
                });
        }
    }

    // DynamoDB errors
    if (err.code && err.code.startsWith('DynamoDB')) {
        return res.status(500).json({
            error: 'Database Error',
            message: 'Failed to access database',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Redis errors
    if (err.code && (err.code === 'ECONNREFUSED' || err.code === 'REDIS_CONNECTION_ERROR')) {
        return res.status(500).json({
            error: 'Cache Error',
            message: 'Failed to connect to cache service',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Validation errors (Joi)
    if (err.isJoi) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: err.details.map(detail => detail.message)
        });
    }

    // Default error
    res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;