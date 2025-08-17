// Performance monitoring middleware
const performanceMonitoring = (req, res, next) => {
    const startTime = Date.now();

    // Add response time header on finish event
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        console.log(`${req.method} ${req.url} - ${res.statusCode} - ${responseTime}ms`);
    });

    next();
};

// Memory monitoring utility
const memoryMonitoring = () => {
    const memory = process.memoryUsage();
    return {
        rss: `${(memory.rss / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memory.external / 1024 / 1024).toFixed(2)}MB`,
        arrayBuffers: `${(memory.arrayBuffers / 1024 / 1024).toFixed(2)}MB`
    };
};

// CPU monitoring utility
const cpuMonitoring = () => {
    const cpuUsage = process.cpuUsage();
    return {
        user: `${(cpuUsage.user / 1000).toFixed(2)}ms`,
        system: `${(cpuUsage.system / 1000).toFixed(2)}ms`
    };
};

// Health check endpoint with performance metrics
const healthCheck = (req, res) => {
    const uptime = process.uptime();
    const memory = memoryMonitoring();
    const cpu = cpuMonitoring();

    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
        memory,
        cpu,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
    });
};

// Request size monitoring
const requestSizeMonitoring = (req, res, next) => {
    const contentLength = req.get('content-length');

    if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);

        // Log large requests
        if (sizeInMB > 1) {
            console.warn(`Large request detected: ${sizeInMB.toFixed(2)}MB from ${req.ip}`);
        }

        // Reject extremely large requests
        if (sizeInMB > 10) {
            return res.status(413).json({
                error: 'Payload Too Large',
                message: 'Request size exceeds maximum allowed limit'
            });
        }
    }

    next();
};

// Response caching headers
const setCacheHeaders = (req, res, next) => {
    // Set appropriate cache headers based on the endpoint
    if (req.url.includes('/api/videos/popular')) {
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300'); // 5 minutes
        res.setHeader('Vary', 'Accept-Encoding');
    } else if (req.url.includes('/api/videos/search')) {
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60'); // 1 minute
        res.setHeader('Vary', 'Accept-Encoding');
    } else if (req.url.includes('/api/videos/related')) {
        res.setHeader('Cache-Control', 'public, max-age=180, s-maxage=180'); // 3 minutes
        res.setHeader('Vary', 'Accept-Encoding');
    } else {
        res.setHeader('Cache-Control', 'no-cache');
    }

    next();
};

module.exports = {
    performanceMonitoring,
    memoryMonitoring,
    cpuMonitoring,
    healthCheck,
    requestSizeMonitoring,
    setCacheHeaders
};