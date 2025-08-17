const errorHandler = require('../errorHandler');

describe('Error Handler Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();

        // Mock console.error to avoid noise in tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('YouTube API Errors', () => {
        it('should handle 400 Bad Request from YouTube API', () => {
            const error = {
                response: {
                    status: 400,
                    data: {
                        error: {
                            message: 'Invalid query parameter'
                        }
                    }
                }
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Invalid request parameters',
                details: 'Invalid query parameter'
            });
        });

        it('should handle 403 API Quota Exceeded from YouTube API', () => {
            const error = {
                response: {
                    status: 403,
                    data: {
                        error: {
                            message: 'Quota exceeded'
                        }
                    }
                }
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'API Quota Exceeded',
                message: 'YouTube API quota has been exceeded. Please try again later.',
                details: 'Quota exceeded'
            });
        });

        it('should handle 404 Not Found from YouTube API', () => {
            const error = {
                response: {
                    status: 404,
                    data: {
                        error: {
                            message: 'Video not found'
                        }
                    }
                }
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Not Found',
                message: 'Requested resource not found',
                details: 'Video not found'
            });
        });

        it('should handle other YouTube API errors', () => {
            const error = {
                response: {
                    status: 500,
                    data: {
                        error: {
                            message: 'Internal server error'
                        }
                    }
                }
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'YouTube API Error',
                message: 'Internal server error'
            });
        });

        it('should handle YouTube API errors without error message', () => {
            const error = {
                response: {
                    status: 400,
                    data: {}
                }
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Invalid request parameters',
                details: 'YouTube API error'
            });
        });
    });

    describe('DynamoDB Errors', () => {
        it('should handle DynamoDB errors', () => {
            const error = {
                code: 'DynamoDBConnectionError',
                message: 'Connection failed'
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Database Error',
                message: 'Failed to access database',
                details: undefined
            });
        });

        it('should include error details in development environment', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = {
                code: 'DynamoDBValidationError',
                message: 'Invalid table name'
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Database Error',
                message: 'Failed to access database',
                details: 'Invalid table name'
            });

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Redis Errors', () => {
        it('should handle Redis connection refused error', () => {
            const error = {
                code: 'ECONNREFUSED',
                message: 'Connection refused'
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Cache Error',
                message: 'Failed to connect to cache service',
                details: undefined
            });
        });

        it('should handle Redis connection error', () => {
            const error = {
                code: 'REDIS_CONNECTION_ERROR',
                message: 'Redis connection failed'
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Cache Error',
                message: 'Failed to connect to cache service',
                details: undefined
            });
        });

        it('should include Redis error details in development environment', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = {
                code: 'ECONNREFUSED',
                message: 'Redis server not running'
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Cache Error',
                message: 'Failed to connect to cache service',
                details: 'Redis server not running'
            });

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Validation Errors (Joi)', () => {
        it('should handle Joi validation errors', () => {
            const error = {
                isJoi: true,
                details: [{
                        message: 'Field "email" is required'
                    },
                    {
                        message: 'Field "age" must be a number'
                    }
                ]
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Validation Error',
                message: 'Invalid input data',
                details: ['Field "email" is required', 'Field "age" must be a number']
            });
        });
    });

    describe('Default Error Handling', () => {
        it('should handle generic errors with status', () => {
            const error = {
                name: 'CustomError',
                message: 'Something went wrong',
                status: 422
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.json).toHaveBeenCalledWith({
                error: 'CustomError',
                message: 'Something went wrong',
                details: undefined
            });
        });

        it('should handle generic errors without status', () => {
            const error = {
                name: 'UnknownError',
                message: 'Unknown error occurred'
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'UnknownError',
                message: 'Unknown error occurred',
                details: undefined
            });
        });

        it('should handle errors without name or message', () => {
            const error = {};

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'An unexpected error occurred',
                details: undefined
            });
        });

        it('should include stack trace in development environment', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = {
                name: 'TestError',
                message: 'Test error',
                stack: 'Error stack trace'
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'TestError',
                message: 'Test error',
                details: 'Error stack trace'
            });

            process.env.NODE_ENV = originalEnv;
        });
    });
});