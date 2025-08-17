const redis = require('redis');

// redisパッケージをモック化
jest.mock('redis', () => ({
    createClient: jest.fn(() => ({
        connect: jest.fn(),
        ping: jest.fn(),
        get: jest.fn(),
        setEx: jest.fn(),
        del: jest.fn(),
        quit: jest.fn(),
        on: jest.fn()
    }))
}));

// RedisClientクラスを直接テスト
const RedisClient = require('../redis');

describe('RedisClient', () => {
    let mockRedisClient;

    beforeEach(() => {
        // RedisClientの状態をリセット
        RedisClient.client = null;
        RedisClient.isConnected = false;

        mockRedisClient = {
            connect: jest.fn(),
            ping: jest.fn(),
            get: jest.fn(),
            setEx: jest.fn(),
            del: jest.fn(),
            quit: jest.fn(),
            on: jest.fn()
        };

        redis.createClient.mockReturnValue(mockRedisClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        // 環境変数をクリア
        delete process.env.REDIS_HOST;
        delete process.env.REDIS_PORT;
        delete process.env.REDIS_PASSWORD;
        delete process.env.REDIS_DB;
        delete process.env.REDIS_ENDPOINT;
    });

    describe('接続', () => {
        it('デフォルト設定でRedisに接続する', async () => {
            mockRedisClient.connect.mockResolvedValue();
            mockRedisClient.ping.mockResolvedValue('PONG');

            const client = await RedisClient.connect();

            expect(redis.createClient).toHaveBeenCalledWith({
                host: 'localhost',
                port: 6379,
                password: undefined,
                db: 0,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true
            });

            expect(mockRedisClient.connect).toHaveBeenCalled();
            expect(mockRedisClient.ping).toHaveBeenCalled();
            expect(RedisClient.isConnected).toBe(true);
        });

        it('環境変数の設定でRedisに接続する', async () => {
            process.env.REDIS_HOST = 'redis-server';
            process.env.REDIS_PORT = '6380';
            process.env.REDIS_PASSWORD = 'secret';
            process.env.REDIS_DB = '1';

            mockRedisClient.connect.mockResolvedValue();
            mockRedisClient.ping.mockResolvedValue('PONG');

            await RedisClient.connect();

            expect(redis.createClient).toHaveBeenCalledWith({
                host: 'redis-server',
                port: '6380',
                password: 'secret',
                db: '1',
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true
            });
        });

        it('REDIS_ENDPOINTが設定されている場合はURL形式で接続する', async () => {
            process.env.REDIS_ENDPOINT = 'my-redis-cluster.cache.amazonaws.com';
            process.env.REDIS_PORT = '6379';

            mockRedisClient.connect.mockResolvedValue();
            mockRedisClient.ping.mockResolvedValue('PONG');

            await RedisClient.connect();

            expect(redis.createClient).toHaveBeenCalledWith({
                url: 'redis://my-redis-cluster.cache.amazonaws.com:6379'
            });
        });

        it('接続エラー時はnullを返し、アプリは継続する', async () => {
            mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

            const client = await RedisClient.connect();

            expect(client).toBeNull();
            expect(RedisClient.isConnected).toBe(false);
        });

        it('イベントリスナーが正しく設定される', async () => {
            mockRedisClient.connect.mockResolvedValue();
            mockRedisClient.ping.mockResolvedValue('PONG');

            await RedisClient.connect();

            expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
            expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockRedisClient.on).toHaveBeenCalledWith('end', expect.any(Function));
        });
    });

    describe('データ操作', () => {
        beforeEach(async () => {
            mockRedisClient.connect.mockResolvedValue();
            mockRedisClient.ping.mockResolvedValue('PONG');
            await RedisClient.connect();
        });

        describe('get', () => {
            it('キャッシュされたデータを取得する', async () => {
                const testData = {
                    videos: [],
                    totalResults: 0
                };
                mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

                const result = await RedisClient.get('test-key');

                expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
                expect(result).toEqual(testData);
            });

            it('データが存在しない場合はnullを返す', async () => {
                mockRedisClient.get.mockResolvedValue(null);

                const result = await RedisClient.get('nonexistent-key');

                expect(result).toBeNull();
            });

            it('接続されていない場合はnullを返す', async () => {
                RedisClient.isConnected = false;

                const result = await RedisClient.get('test-key');

                expect(result).toBeNull();
                expect(mockRedisClient.get).not.toHaveBeenCalled();
            });

            it('Redisエラー時はnullを返す', async () => {
                mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

                const result = await RedisClient.get('test-key');

                expect(result).toBeNull();
            });
        });

        describe('set', () => {
            it('データをキャッシュに保存する', async () => {
                const testData = {
                    videos: [],
                    totalResults: 0
                };
                mockRedisClient.setEx.mockResolvedValue('OK');

                const result = await RedisClient.set('test-key', testData, 600);

                expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 600, JSON.stringify(testData));
                expect(result).toBe(true);
            });

            it('デフォルトTTL（300秒）でデータを保存する', async () => {
                const testData = {
                    videos: []
                };
                mockRedisClient.setEx.mockResolvedValue('OK');

                const result = await RedisClient.set('test-key', testData);

                expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testData));
                expect(result).toBe(true);
            });

            it('接続されていない場合はfalseを返す', async () => {
                RedisClient.isConnected = false;

                const result = await RedisClient.set('test-key', {});

                expect(result).toBe(false);
                expect(mockRedisClient.setEx).not.toHaveBeenCalled();
            });

            it('Redisエラー時はfalseを返す', async () => {
                mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

                const result = await RedisClient.set('test-key', {});

                expect(result).toBe(false);
            });
        });

        describe('del', () => {
            it('キャッシュからデータを削除する', async () => {
                mockRedisClient.del.mockResolvedValue(1);

                const result = await RedisClient.del('test-key');

                expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
                expect(result).toBe(true);
            });

            it('接続されていない場合はfalseを返す', async () => {
                RedisClient.isConnected = false;

                const result = await RedisClient.del('test-key');

                expect(result).toBe(false);
                expect(mockRedisClient.del).not.toHaveBeenCalled();
            });

            it('Redisエラー時はfalseを返す', async () => {
                mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

                const result = await RedisClient.del('test-key');

                expect(result).toBe(false);
            });
        });
    });

    describe('キー生成', () => {
        it('検索結果用のキーを生成する', () => {
            const key = RedisClient.generateSearchKey('eFootball', 'gameplay', 25);
            expect(key).toBe('search:efootball:gameplay:25');
        });

        it('検索クエリを正規化する', () => {
            const key = RedisClient.generateSearchKey('  EFootball Gameplay  ', 'tips', 10);
            expect(key).toBe('search:efootball gameplay:tips:10');
        });

        it('空のクエリを処理する', () => {
            const key = RedisClient.generateSearchKey('', 'review', 15);
            expect(key).toBe('search::review:15');
        });

        it('人気動画用のキーを生成する', () => {
            const key = RedisClient.generatePopularKey('gameplay', 20);
            expect(key).toBe('popular:gameplay:20');
        });

        it('カテゴリなしの人気動画キーを生成する', () => {
            const key = RedisClient.generatePopularKey('', 25);
            expect(key).toBe('popular::25');
        });

        it('関連動画用のキーを生成する', () => {
            const key = RedisClient.generateRelatedKey('video123', 10);
            expect(key).toBe('related:video123:10');
        });
    });

    describe('切断', () => {
        it('Redis接続を切断する', async () => {
            mockRedisClient.connect.mockResolvedValue();
            mockRedisClient.ping.mockResolvedValue('PONG');
            mockRedisClient.quit.mockResolvedValue();

            await RedisClient.connect();
            await RedisClient.disconnect();

            expect(mockRedisClient.quit).toHaveBeenCalled();
            expect(RedisClient.isConnected).toBe(false);
        });

        it('クライアントが存在しない場合は何もしない', async () => {
            RedisClient.client = null;

            await RedisClient.disconnect();

            expect(mockRedisClient.quit).not.toHaveBeenCalled();
        });
    });
});