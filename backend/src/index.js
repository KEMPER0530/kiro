require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const {
    responseOptimization,
    compressionMiddleware
} = require('./middleware/responseOptimization');
const {
    performanceMonitoring,
    healthCheck,
    requestSizeMonitoring,
    setCacheHeaders
} = require('./middleware/performance');
const youtubeRoutes = require('./routes/youtube');
const favoritesRoutes = require('./routes/favorites');
const searchHistoryRoutes = require('./routes/searchHistory');
const {
    initializeDatabase
} = require('./scripts/initDatabase');

const app = express();
const PORT = process.env.PORT || 3001;

// Security and optimization middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://www.googleapis.com"],
            frameSrc: ["'self'", "https://www.youtube.com"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? [process.env.FRONTEND_URL, 'https://yourdomain.com'] : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
    message: {
        error: 'Too Many Requests',
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Temporarily disable problematic middleware for testing
// app.use(performanceMonitoring);
// app.use(requestSizeMonitoring);
// app.use(setCacheHeaders);
// app.use(compressionMiddleware);
// app.use(responseOptimization);

// Body parsing middleware
app.use(express.json({
    limit: '10mb'
}));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// Routes
app.use('/api/videos', youtubeRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/search-history', searchHistoryRoutes);

// Health check endpoint with performance metrics
app.get('/health', healthCheck);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found'
    });
});

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database tables and Redis connection
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
            console.log(`Health check available at http://localhost:${PORT}/health`);
            console.log('API endpoints:');
            console.log('  GET  /api/videos/search');
            console.log('  GET  /api/videos/popular');
            console.log('  GET  /api/videos/related/:videoId');
            console.log('  GET  /api/favorites');
            console.log('  POST /api/favorites');
            console.log('  DELETE /api/favorites/:videoId');
            console.log('  GET  /api/search-history');
            console.log('  POST /api/search-history');
            console.log('  DELETE /api/search-history');
            console.log('  DELETE /api/search-history/:timestamp');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();