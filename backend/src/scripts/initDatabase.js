require('dotenv').config();
const {
    createTables,
    checkTablesExist
} = require('../config/database');
const redisClient = require('../config/redis');

/**
 * Initialize database and cache connections
 */
async function initializeDatabase() {
    console.log('Initializing database and cache...');

    // Initialize Redis connection first
    try {
        console.log('Connecting to Redis...');
        await redisClient.connect();
        console.log('Redis connection established');
    } catch (error) {
        console.warn('Redis connection failed, continuing without cache:', error.message);
    }

    // Initialize DynamoDB tables
    try {
        // Add delay to wait for LocalStack to be ready
        if (process.env.NODE_ENV === 'development') {
            console.log('Waiting for LocalStack to be ready...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }

        // Check if tables already exist
        const tablesExist = await checkTablesExist();

        if (!tablesExist) {
            console.log('Tables do not exist, creating them...');
            await createTables();
        } else {
            console.log('Database tables already exist');
        }

        console.log('Database initialization completed successfully');
        return true;
    } catch (error) {
        console.warn('Database initialization failed, continuing without database:', error.message);
        // Don't throw error - app should start even if database is unavailable
        return false;
    }
}

// Run initialization if called directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('Initialization complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Initialization failed:', error);
            process.exit(1);
        });
}

module.exports = {
    initializeDatabase
};