const request = require('supertest');
const express = require('express');
const {
    performanceMonitoring,
    healthCheck,
    requestSizeMonitoring,
    setCacheHeaders
} = require('../performance');

describe('Performance Middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(performanceMonitoring);
        app.use(requestSizeMonitoring);
        app.use(setCacheHeaders);
        app.use(express.json());
    });

    describe('Performance Monitoring', () => {
        test('should add response time header', async () => {
            app.get('/test', (req, res) => {
                res.json({
                    message: 'test'
                });
            });

            const response = await request(app)
                .get('/test')
                .expect(200);

            expect(response.headers['x-response-time']).toBeDefined();
            expect(response.headers['x-response-time']).toMatch(/\d+\.\d+ms/);
        });

        test('should add memory usage header', async () => {
            app.get('/test', (req, res) => {
                res.json({
                    message: 'test'
                });
            });

            const response = await request(app)
                .get('/test')
                .expect(200);

            expect(response.headers['x-memory-usage']).toBeDefined();
            expect(response.headers['x-memory-usage']).toMatch(/\d+\.\d+MB/);
        });
    });

    describe('Request Size Monitoring', () => {
        test('should allow normal sized requests', async () => {
            app.post('/test', (req, res) => {
                res.json({
                    received: req.body
                });
            });

            const smallPayload = {
                data: 'small payload'
            };

            await request(app)
                .post('/test')
                .send(smallPayload)
                .expect(200);
        });

        test('should reject extremely large requests', async () => {
            app.post('/test', (req, res) => {
                res.json({
                    received: req.body
                });
            });

            // Simulate a large request by setting content-length header
            const response = await request(app)
                .post('/test')
                .set('content-length', '11000000') // 11MB
                .send({
                    data: 'test'
                });

            expect(response.status).toBe(413);
            expect(response.body.error).toBe('Payload Too Large');
        });
    });

    describe('Cache Headers', () => {
        test('should set cache headers for popular videos endpoint', async () => {
            app.get('/api/videos/popular', (req, res) => {
                res.json({
                    videos: []
                });
            });

            const response = await request(app)
                .get('/api/videos/popular')
                .expect(200);

            expect(response.headers['cache-control']).toBe('public, max-age=300, s-maxage=300');
            expect(response.headers['vary']).toBe('Accept-Encoding');
        });

        test('should set cache headers for search endpoint', async () => {
            app.get('/api/videos/search', (req, res) => {
                res.json({
                    videos: []
                });
            });

            const response = await request(app)
                .get('/api/videos/search')
                .expect(200);

            expect(response.headers['cache-control']).toBe('public, max-age=60, s-maxage=60');
            expect(response.headers['vary']).toBe('Accept-Encoding');
        });

        test('should set no-cache headers for favorites endpoint', async () => {
            app.get('/api/favorites', (req, res) => {
                res.json({
                    favorites: []
                });
            });

            const response = await request(app)
                .get('/api/favorites')
                .expect(200);

            expect(response.headers['cache-control']).toBe('private, no-cache, no-store, must-revalidate');
            expect(response.headers['pragma']).toBe('no-cache');
            expect(response.headers['expires']).toBe('0');
        });
    });

    describe('Health Check', () => {
        test('should return health status with performance metrics', async () => {
            app.get('/health', healthCheck);

            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body.status).toBe('OK');
            expect(response.body.timestamp).toBeDefined();
            expect(response.body.uptime).toBeDefined();
            expect(response.body.memory).toBeDefined();
            expect(response.body.cpu).toBeDefined();
            expect(response.body.nodeVersion).toBeDefined();
            expect(response.body.environment).toBeDefined();

            // Check memory metrics structure
            expect(response.body.memory.rss).toMatch(/\d+\.\d+MB/);
            expect(response.body.memory.heapUsed).toMatch(/\d+\.\d+MB/);
            expect(response.body.memory.heapTotal).toMatch(/\d+\.\d+MB/);

            // Check CPU metrics structure
            expect(response.body.cpu.user).toMatch(/\d+\.\d+ms/);
            expect(response.body.cpu.system).toMatch(/\d+\.\d+ms/);
        });
    });
});