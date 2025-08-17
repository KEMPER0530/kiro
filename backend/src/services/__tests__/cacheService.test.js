const CacheService = require('../cacheService');

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

// Redisクライアントをモック化
jest.mock('../../config/redis', () => ({
    generateSearchKey: jest.fn(),
    generatePopularKey: jest.fn(),
    generateRelatedKey: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
}));

const redisClient = require('../../config/redis');

describe('CacheService', () => {
    let cacheService;

    beforeEach(() => {
        cacheService = new CacheService();
        jest.clearAllMocks();
    });

    describe('コンストラクタ', () => {
        it('Redisクライアントで初期化される', () => {
            expect(cacheService.redisClient).toBe(redisClient);
            expect(cacheService.defaultTTL).toBe(300); // 5分
        });
    });

    describe('検索結果キャッシュ', () => {
        const mockSearchData = {
            videos: [{
                    id: 'video1',
                    title: 'eFootball gameplay'
                },
                {
                    id: 'video2',
                    title: 'PES tutorial'
                }
            ],
            totalResults: 2
        };

        it('検索結果をキャッシュに保存する', async () => {
            const query = 'eFootball';
            const category = 'gameplay';
            const maxResults = 25;

            redisClient.generateSearchKey.mockReturnValue('search:efootball:gameplay:25');
            redisClient.set.mockResolvedValue(true);

            const result = await cacheService.cacheSearchResults(query, category, maxResults, mockSearchData);

            expect(redisClient.generateSearchKey).toHaveBeenCalledWith(query, category, maxResults);
            expect(redisClient.set).toHaveBeenCalledWith('search:efootball:gameplay:25', mockSearchData, 300);
            expect(result).toBe(true);
        });

        it('検索結果をキャッシュから取得する', async () => {
            const query = 'eFootball';
            const category = 'gameplay';
            const maxResults = 25;

            redisClient.generateSearchKey.mockReturnValue('search:efootball:gameplay:25');
            redisClient.get.mockResolvedValue(mockSearchData);

            const result = await cacheService.getCachedSearchResults(query, category, maxResults);

            expect(redisClient.generateSearchKey).toHaveBeenCalledWith(query, category, maxResults);
            expect(redisClient.get).toHaveBeenCalledWith('search:efootball:gameplay:25');
            expect(result).toEqual(mockSearchData);
        });

        it('キャッシュが存在しない場合はnullを返す', async () => {
            redisClient.generateSearchKey.mockReturnValue('search:efootball:gameplay:25');
            redisClient.get.mockResolvedValue(null);

            const result = await cacheService.getCachedSearchResults('eFootball', 'gameplay', 25);

            expect(result).toBeNull();
        });

        it('Redisエラー時はfalseを返す（保存時）', async () => {
            redisClient.generateSearchKey.mockReturnValue('search:efootball:gameplay:25');
            redisClient.set.mockResolvedValue(false);

            const result = await cacheService.cacheSearchResults('eFootball', 'gameplay', 25, mockSearchData);

            expect(result).toBe(false);
        });

        it('Redisエラー時はnullを返す（取得時）', async () => {
            redisClient.generateSearchKey.mockReturnValue('search:efootball:gameplay:25');
            redisClient.get.mockResolvedValue(null);

            const result = await cacheService.getCachedSearchResults('eFootball', 'gameplay', 25);

            expect(result).toBeNull();
        });
    });

    describe('人気動画キャッシュ', () => {
        const mockPopularData = {
            videos: [{
                id: 'popular1',
                title: 'Popular eFootball match',
                viewCount: 50000
            }],
            totalResults: 1
        };

        it('人気動画をキャッシュに保存する', async () => {
            const category = 'gameplay';
            const maxResults = 25;

            redisClient.generatePopularKey.mockReturnValue('popular:gameplay:25');
            redisClient.set.mockResolvedValue(true);

            const result = await cacheService.cachePopularVideos(category, maxResults, mockPopularData);

            expect(redisClient.generatePopularKey).toHaveBeenCalledWith(category, maxResults);
            expect(redisClient.set).toHaveBeenCalledWith('popular:gameplay:25', mockPopularData, 300);
            expect(result).toBe(true);
        });

        it('人気動画をキャッシュから取得する', async () => {
            const category = 'gameplay';
            const maxResults = 25;

            redisClient.generatePopularKey.mockReturnValue('popular:gameplay:25');
            redisClient.get.mockResolvedValue(mockPopularData);

            const result = await cacheService.getCachedPopularVideos(category, maxResults);

            expect(redisClient.generatePopularKey).toHaveBeenCalledWith(category, maxResults);
            expect(redisClient.get).toHaveBeenCalledWith('popular:gameplay:25');
            expect(result).toEqual(mockPopularData);
        });

        it('カテゴリなしの人気動画をキャッシュする', async () => {
            redisClient.generatePopularKey.mockReturnValue('popular::25');
            redisClient.set.mockResolvedValue(true);

            const result = await cacheService.cachePopularVideos('', 25, mockPopularData);

            expect(redisClient.generatePopularKey).toHaveBeenCalledWith('', 25);
            expect(result).toBe(true);
        });
    });

    describe('関連動画キャッシュ', () => {
        const mockRelatedData = {
            videos: [{
                id: 'related1',
                title: 'Related eFootball video'
            }],
            totalResults: 1
        };

        it('関連動画をキャッシュに保存する', async () => {
            const videoId = 'original-video';
            const maxResults = 10;

            redisClient.generateRelatedKey.mockReturnValue('related:original-video:10');
            redisClient.set.mockResolvedValue(true);

            const result = await cacheService.cacheRelatedVideos(videoId, maxResults, mockRelatedData);

            expect(redisClient.generateRelatedKey).toHaveBeenCalledWith(videoId, maxResults);
            expect(redisClient.set).toHaveBeenCalledWith('related:original-video:10', mockRelatedData, 300);
            expect(result).toBe(true);
        });

        it('関連動画をキャッシュから取得する', async () => {
            const videoId = 'original-video';
            const maxResults = 10;

            redisClient.generateRelatedKey.mockReturnValue('related:original-video:10');
            redisClient.get.mockResolvedValue(mockRelatedData);

            const result = await cacheService.getCachedRelatedVideos(videoId, maxResults);

            expect(redisClient.generateRelatedKey).toHaveBeenCalledWith(videoId, maxResults);
            expect(redisClient.get).toHaveBeenCalledWith('related:original-video:10');
            expect(result).toEqual(mockRelatedData);
        });
    });

    describe('キャッシュ削除', () => {
        it('検索結果キャッシュを削除する', async () => {
            const query = 'eFootball';
            const category = 'gameplay';
            const maxResults = 25;

            redisClient.generateSearchKey.mockReturnValue('search:efootball:gameplay:25');
            redisClient.del.mockResolvedValue(true);

            const result = await cacheService.clearSearchCache(query, category, maxResults);

            expect(redisClient.generateSearchKey).toHaveBeenCalledWith(query, category, maxResults);
            expect(redisClient.del).toHaveBeenCalledWith('search:efootball:gameplay:25');
            expect(result).toBe(true);
        });

        it('人気動画キャッシュを削除する', async () => {
            const category = 'gameplay';
            const maxResults = 25;

            redisClient.generatePopularKey.mockReturnValue('popular:gameplay:25');
            redisClient.del.mockResolvedValue(true);

            const result = await cacheService.clearPopularCache(category, maxResults);

            expect(redisClient.generatePopularKey).toHaveBeenCalledWith(category, maxResults);
            expect(redisClient.del).toHaveBeenCalledWith('popular:gameplay:25');
            expect(result).toBe(true);
        });

        it('関連動画キャッシュを削除する', async () => {
            const videoId = 'original-video';
            const maxResults = 10;

            redisClient.generateRelatedKey.mockReturnValue('related:original-video:10');
            redisClient.del.mockResolvedValue(true);

            const result = await cacheService.clearRelatedCache(videoId, maxResults);

            expect(redisClient.generateRelatedKey).toHaveBeenCalledWith(videoId, maxResults);
            expect(redisClient.del).toHaveBeenCalledWith('related:original-video:10');
            expect(result).toBe(true);
        });
    });

    describe('カスタムTTL設定', () => {
        it('カスタムTTLで検索結果をキャッシュする', async () => {
            const customTTL = 600; // 10分
            const mockData = {
                videos: [],
                totalResults: 0
            };

            redisClient.generateSearchKey.mockReturnValue('search:test::25');
            redisClient.set.mockResolvedValue(true);

            const result = await cacheService.cacheSearchResults('test', '', 25, mockData, customTTL);

            expect(redisClient.set).toHaveBeenCalledWith('search:test::25', mockData, customTTL);
            expect(result).toBe(true);
        });

        it('カスタムTTLで人気動画をキャッシュする', async () => {
            const customTTL = 1800; // 30分
            const mockData = {
                videos: [],
                totalResults: 0
            };

            redisClient.generatePopularKey.mockReturnValue('popular::25');
            redisClient.set.mockResolvedValue(true);

            const result = await cacheService.cachePopularVideos('', 25, mockData, customTTL);

            expect(redisClient.set).toHaveBeenCalledWith('popular::25', mockData, customTTL);
            expect(result).toBe(true);
        });

        it('カスタムTTLで関連動画をキャッシュする', async () => {
            const customTTL = 900; // 15分
            const mockData = {
                videos: [],
                totalResults: 0
            };

            redisClient.generateRelatedKey.mockReturnValue('related:video1:10');
            redisClient.set.mockResolvedValue(true);

            const result = await cacheService.cacheRelatedVideos('video1', 10, mockData, customTTL);

            expect(redisClient.set).toHaveBeenCalledWith('related:video1:10', mockData, customTTL);
            expect(result).toBe(true);
        });
    });

    describe('キャッシュ統計', () => {
        it('キャッシュヒット統計を取得する', async () => {
            // この機能は将来の拡張として実装予定
            expect(cacheService.getCacheStats).toBeDefined();
        });
    });
});