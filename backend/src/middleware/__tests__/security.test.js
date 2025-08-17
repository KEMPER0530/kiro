const request = require('supertest');
const express = require('express');
const {
    sanitizeInput,
    validateRequest,
    requestLogger
} = require('../security');

describe('Security Middleware', () => {
    describe('Input Sanitization', () => {
        let app;

        beforeEach(() => {
            app = express();
            app.use(express.json());
            app.use(sanitizeInput);
        });

        test('should sanitize script tags from query parameters', async () => {
            app.get('/test', (req, res) => {
                res.json({
                    query: req.query
                });
            });

            const response = await request(app)
                .get('/test?search=<script>alert("xss")</script>test')
                .expect(200);

            expect(response.body.query.search).toBe('test');
            expect(response.body.query.search).not.toContain('<script>');
        });

        test('should sanitize javascript protocol from query parameters', async () => {
            app.get('/test', (req, res) => {
                res.json({
                    query: req.query
                });
            });

            const response = await request(app)
                .get('/test?url=javascript:alert("xss")')
                .expect(200);

            expect(response.body.query.url).toBe('alert("xss")');
            expect(response.body.query.url).not.toContain('javascript:');
        });

        test('should sanitize event handlers from query parameters', async () => {
            app.get('/test', (req, res) => {
                res.json({
                    query: req.query
                });
            });

            const response = await request(app)
                .get('/test?input=<img onload="alert(1)" src="x">')
                .expect(200);

            expect(response.body.query.input).toBe('<img src="x">');
            expect(response.body.query.input).not.toContain('onload=');
        });
    });

    describe('Request Validation', () => {
        let app;

        beforeEach(() => {
            app = express();
            app.use(express.json());
            app.use(validateRequest);
        });

        test('should block requests with script tags', async () => {
            app.get('/test', (req, res) => {
                res.json({
                    message: 'success'
                });
            });

            const response = await request(app)
                .get('/test?malicious=<script>alert(1)</script>')
                .expect(400);

            expect(response.body.error).toBe('Bad Request');
            expect(response.body.message).toBe('Request contains potentially malicious content');
        });

        test('should block requests with javascript protocol', async () => {
            app.post('/test', (req, res) => {
                res.json({
                    message: 'success'
                });
            });

            const response = await request(app)
                .post('/test')
                .send({
                    url: 'javascript:alert(1)'
                })
                .expect(400);

            expect(response.body.error).toBe('Bad Request');
            expect(response.body.message).toBe('Request contains potentially malicious content');
        });

        test('should allow clean requests', async () => {
            app.get('/test', (req, res) => {
                res.json({
                    message: 'success'
                });
            });

            const response = await request(app)
                .get('/test?search=eFootball gameplay')
                .expect(200);

            expect(response.body.message).toBe('success');
        });
    });

    describe('Request Logger', () => {
        let app;

        beforeEach(() => {
            app = express();
            app.use(express.json());
        });

        test('should log request details', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            app.use(requestLogger);
            app.get('/test', (req, res) => {
                res.json({
                    message: 'test'
                });
            });

            await request(app)
                .get('/test')
                .expect(200);

            expect(consoleSpy).toHaveBeenCalled();
            const logCall = consoleSpy.mock.calls[0][0];

            expect(logCall.method).toBe('GET');
            expect(logCall.url).toBe('/test');
            expect(logCall.statusCode).toBe(200);
            expect(logCall.responseTime).toBeDefined();
            expect(logCall.timestamp).toBeDefined();

            consoleSpy.mockRestore();
        });
    });
});