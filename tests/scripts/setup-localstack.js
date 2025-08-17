const AWS = require('aws-sdk');

// LocalStack用のAWS設定
const awsConfig = {
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    accessKeyId: 'test',
    secretAccessKey: 'test'
};

const dynamodb = new AWS.DynamoDB(awsConfig);

async function createTables() {
    console.log('LocalStackでDynamoDBテーブルを作成中...');

    // お気に入りテーブルの作成
    const favoritesTableParams = {
        TableName: 'efootball-favorites-test',
        KeySchema: [{
                AttributeName: 'userId',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'videoId',
                KeyType: 'RANGE'
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

    // 検索履歴テーブルの作成
    const searchHistoryTableParams = {
        TableName: 'efootball-search-history-test',
        KeySchema: [{
                AttributeName: 'userId',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'timestamp',
                KeyType: 'RANGE'
            }
        ],
        AttributeDefinitions: [{
                AttributeName: 'userId',
                AttributeType: 'S'
            },
            {
                AttributeName: 'timestamp',
                AttributeType: 'S'
            },
            {
                AttributeName: 'category',
                AttributeType: 'S'
            }
        ],
        GlobalSecondaryIndexes: [{
            IndexName: 'CategoryIndex',
            KeySchema: [{
                    AttributeName: 'userId',
                    KeyType: 'HASH'
                },
                {
                    AttributeName: 'category',
                    KeyType: 'RANGE'
                }
            ],
            Projection: {
                ProjectionType: 'ALL'
            }
        }],
        BillingMode: 'PAY_PER_REQUEST'
    };

    try {
        // 既存のテーブルを削除（存在する場合）
        try {
            await dynamodb.deleteTable({
                TableName: 'efootball-favorites-test'
            }).promise();
            console.log('既存のお気に入りテーブルを削除しました');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            // テーブルが存在しない場合は無視
        }

        try {
            await dynamodb.deleteTable({
                TableName: 'efootball-search-history-test'
            }).promise();
            console.log('既存の検索履歴テーブルを削除しました');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            // テーブルが存在しない場合は無視
        }

        // 新しいテーブルを作成
        await dynamodb.createTable(favoritesTableParams).promise();
        console.log('お気に入りテーブルを作成しました');

        await dynamodb.createTable(searchHistoryTableParams).promise();
        console.log('検索履歴テーブルを作成しました');

        // テーブルがアクティブになるまで待機
        console.log('テーブルがアクティブになるまで待機中...');
        await dynamodb.waitFor('tableExists', {
            TableName: 'efootball-favorites-test'
        }).promise();
        await dynamodb.waitFor('tableExists', {
            TableName: 'efootball-search-history-test'
        }).promise();

        console.log('すべてのテーブルが正常に作成されました');
    } catch (error) {
        console.error('テーブル作成エラー:', error);
        process.exit(1);
    }
}

async function main() {
    try {
        // LocalStackの起動を待機
        console.log('LocalStackの起動を待機中...');
        let retries = 30;
        while (retries > 0) {
            try {
                await dynamodb.listTables().promise();
                break;
            } catch (error) {
                retries--;
                if (retries === 0) {
                    throw new Error('LocalStackに接続できませんでした');
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        await createTables();
        console.log('LocalStackのセットアップが完了しました');
    } catch (error) {
        console.error('セットアップエラー:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    createTables
};