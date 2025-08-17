const AWS = require('aws-sdk');

// Configure AWS SDK for LocalStack in development
const isLocalStack = process.env.NODE_ENV === 'development' || process.env.USE_LOCALSTACK === 'true';

const dynamoConfig = {
    region: process.env.AWS_REGION || 'ap-northeast-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
};

if (isLocalStack) {
    dynamoConfig.endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:4566';
}

const dynamodb = new AWS.DynamoDB(dynamoConfig);
const docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);

/**
 * Create DynamoDB tables for the application
 */
async function createTables() {
    try {
        console.log('Creating DynamoDB tables...');

        // Favorites table
        await createFavoritesTable();

        // Search history table
        await createSearchHistoryTable();

        console.log('All tables created successfully');
    } catch (error) {
        console.error('Error creating tables:', error);
        throw error;
    }
}

/**
 * Create favorites table
 */
async function createFavoritesTable() {
    const tableName = process.env.DYNAMODB_TABLE_FAVORITES || 'efootball-favorites';

    const params = {
        TableName: tableName,
        KeySchema: [{
                AttributeName: 'userId',
                KeyType: 'HASH' // Partition key
            },
            {
                AttributeName: 'videoId',
                KeyType: 'RANGE' // Sort key
            }
        ],
        AttributeDefinitions: [{
                AttributeName: 'userId',
                AttributeType: 'S'
            },
            {
                AttributeName: 'videoId',
                AttributeType: 'S'
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    };

    try {
        await dynamodb.createTable(params).promise();
        console.log(`Created table: ${tableName}`);

        // Wait for table to be active
        await dynamodb.waitFor('tableExists', {
            TableName: tableName
        }).promise();
        console.log(`Table ${tableName} is now active`);
    } catch (error) {
        if (error.code === 'ResourceInUseException') {
            console.log(`Table ${tableName} already exists`);
        } else {
            throw error;
        }
    }
}

/**
 * Create search history table
 */
async function createSearchHistoryTable() {
    const tableName = process.env.DYNAMODB_TABLE_SEARCH_HISTORY || 'efootball-search-history';

    const params = {
        TableName: tableName,
        KeySchema: [{
                AttributeName: 'userId',
                KeyType: 'HASH' // Partition key
            },
            {
                AttributeName: 'timestamp',
                KeyType: 'RANGE' // Sort key
            }
        ],
        AttributeDefinitions: [{
                AttributeName: 'userId',
                AttributeType: 'S'
            },
            {
                AttributeName: 'timestamp',
                AttributeType: 'S'
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    };

    try {
        await dynamodb.createTable(params).promise();
        console.log(`Created table: ${tableName}`);

        // Wait for table to be active
        await dynamodb.waitFor('tableExists', {
            TableName: tableName
        }).promise();
        console.log(`Table ${tableName} is now active`);
    } catch (error) {
        if (error.code === 'ResourceInUseException') {
            console.log(`Table ${tableName} already exists`);
        } else {
            throw error;
        }
    }
}

/**
 * Check if tables exist and are active
 */
async function checkTablesExist() {
    const favoritesTable = process.env.DYNAMODB_TABLE_FAVORITES || 'efootball-favorites';
    const searchHistoryTable = process.env.DYNAMODB_TABLE_SEARCH_HISTORY || 'efootball-search-history';

    try {
        await Promise.all([
            dynamodb.describeTable({
                TableName: favoritesTable
            }).promise(),
            dynamodb.describeTable({
                TableName: searchHistoryTable
            }).promise()
        ]);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    dynamodb,
    docClient,
    createTables,
    checkTablesExist
};