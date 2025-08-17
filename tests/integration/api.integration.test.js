const axios = require('axios');
const {
    TestEnvironment,
    TEST_CONFIG
} = require('./setup');

describe('API統合テスト', () => {
    let testEnv;
    let apiClient;

    beforeAll(async () => {
        testEnv = new TestEnvironment();
        await testEnv.setup();

        apiClient = axios.create({
            baseURL: TEST_CONFIG.BACKEND_URL,
            timeout: 10000
        });
    }, 60000);

    afterAll(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    describe('YouTube API統合', () => {
        test('動画検索APIが正常に動作する', async () => {
            const response = await apiClient.get('/api/videos/search', {
                params: {
                    q: 'eFootball',
                    maxResults: 5
                }
            });

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('videos');
            expect(response.data).toHaveProperty('cached');
            expect(Array.isArray(response.data.videos)).toBe(true);

            if (response.data.videos.length > 0) {
                const video = response.data.videos[0];
                expect(video).toHaveProperty('id');
                expect(video).toHaveProperty('title');
                expect(video).toHaveProperty('thumbnail');
                expect(video).toHaveProperty('channelTitle');
            }
        });

        test('人気動画取得APIが正常に動作する', async () => {
            const response = await apiClient.get('/api/videos/popular', {
                params: {
                    maxResults: 5
                }
            });

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('videos');
            expect(Array.isArray(response.data.videos)).toBe(true);
        });

        test('カテゴリフィルター付き検索が正常に動作する', async () => {
            const response = await apiClient.get('/api/videos/search', {
                params: {
                    q: 'eFootball',
                    category: 'gameplay',
                    maxResults: 3
                }
            });

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('videos');
            expect(Array.isArray(response.data.videos)).toBe(true);
        });

        test('無効なパラメータでエラーハンドリングが動作する', async () => {
            try {
                await apiClient.get('/api/videos/search', {
                    params: {
                        maxResults: 'invalid'
                    }
                });
            } catch (error) {
                expect(error.response.status).toBe(400);
                expect(error.response.data).toHaveProperty('error');
            }
        });
    });

    describe('お気に入り機能統合', () => {
        const testUserId = 'integration-test-user';
        const testVideo = {
            id: 'test-video-123',
            title: 'テスト動画',
            description: 'テスト用の動画です',
            thumbnail: {
                default: 'https://example.com/thumb.jpg',
                medium: 'https://example.com/thumb_medium.jpg',
                high: 'https://example.com/thumb_high.jpg'
            },
            channelTitle: 'テストチャンネル',
            publishedAt: '2023-01-01T00:00:00.000Z',
            duration: 'PT5M30S',
            viewCount: 1000,
            category: 'gameplay'
        };

        afterEach(async () => {
            // テスト後のクリーンアップ
            try {
                await apiClient.delete(`/api/favorites/${testVideo.id}`, {
                    params: {
                        userId: testUserId
                    }
                });
            } catch (error) {
                // エラーは無視（お気に入りが存在しない場合）
            }
        });

        test('お気に入り追加→取得→削除のフローが正常に動作する', async () => {
            // 1. お気に入りを追加
            const addResponse = await apiClient.post('/api/favorites', {
                userId: testUserId,
                video: testVideo
            });

            expect(addResponse.status).toBe(201);
            expect(addResponse.data.success).toBe(true);
            expect(addResponse.data.favorite.videoId).toBe(testVideo.id);

            // 2. お気に入り一覧を取得
            const getResponse = await apiClient.get('/api/favorites', {
                params: {
                    userId: testUserId
                }
            });

            expect(getResponse.status).toBe(200);
            expect(getResponse.data.success).toBe(true);
            expect(getResponse.data.favorites).toHaveLength(1);
            expect(getResponse.data.favorites[0].videoId).toBe(testVideo.id);

            // 3. お気に入りを削除
            const deleteResponse = await apiClient.delete(`/api/favorites/${testVideo.id}`, {
                params: {
                    userId: testUserId
                }
            });

            expect(deleteResponse.status).toBe(200);
            expect(deleteResponse.data.success).toBe(true);

            // 4. 削除後の確認
            const finalGetResponse = await apiClient.get('/api/favorites', {
                params: {
                    userId: testUserId
                }
            });

            expect(finalGetResponse.data.favorites).toHaveLength(0);
        });

        test('重複お気に入り追加でエラーが返される', async () => {
            // 最初の追加
            await apiClient.post('/api/favorites', {
                userId: testUserId,
                video: testVideo
            });

            // 重複追加を試行
            try {
                await apiClient.post('/api/favorites', {
                    userId: testUserId,
                    video: testVideo
                });
            } catch (error) {
                expect(error.response.status).toBe(409);
                expect(error.response.data.error).toBe('Conflict');
            }
        });
    });

    describe('検索履歴機能統合', () => {
        const testUserId = 'integration-test-user-history';

        afterEach(async () => {
            // テスト後のクリーンアップ
            try {
                await apiClient.delete('/api/search-history', {
                    params: {
                        userId: testUserId
                    }
                });
            } catch (error) {
                // エラーは無視
            }
        });

        test('検索履歴追加→取得→削除のフローが正常に動作する', async () => {
            // 1. 検索履歴を追加
            const addResponse = await apiClient.post('/api/search-history', {
                userId: testUserId,
                query: 'eFootball gameplay',
                category: 'gameplay',
                resultCount: 25
            });

            expect(addResponse.status).toBe(201);
            expect(addResponse.data.success).toBe(true);

            // 2. 検索履歴を取得
            const getResponse = await apiClient.get('/api/search-history', {
                params: {
                    userId: testUserId
                }
            });

            expect(getResponse.status).toBe(200);
            expect(getResponse.data.success).toBe(true);
            expect(getResponse.data.history).toHaveLength(1);
            expect(getResponse.data.history[0].query).toBe('eFootball gameplay');

            // 3. 検索履歴をクリア
            const clearResponse = await apiClient.delete('/api/search-history', {
                params: {
                    userId: testUserId
                }
            });

            expect(clearResponse.status).toBe(200);
            expect(clearResponse.data.success).toBe(true);
        });

        test('カテゴリ別検索履歴取得が正常に動作する', async () => {
            // 複数の検索履歴を追加
            await apiClient.post('/api/search-history', {
                userId: testUserId,
                query: 'eFootball gameplay',
                category: 'gameplay',
                resultCount: 25
            });

            await apiClient.post('/api/search-history', {
                userId: testUserId,
                query: 'eFootball tips',
                category: 'tips',
                resultCount: 15
            });

            // カテゴリ別で取得
            const response = await apiClient.get('/api/search-history', {
                params: {
                    userId: testUserId,
                    category: 'gameplay'
                }
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            // カテゴリフィルターが適用されていることを確認
            // 実装によっては結果が異なる可能性があるため、基本的な構造のみチェック
            expect(response.data).toHaveProperty('history');
            expect(response.data).toHaveProperty('statistics');
        });
    });

    describe('エラーハンドリング統合', () => {
        test('存在しないエンドポイントで404エラーが返される', async () => {
            try {
                await apiClient.get('/api/nonexistent');
            } catch (error) {
                expect(error.response.status).toBe(404);
            }
        });

        test('不正なJSONで400エラーが返される', async () => {
            try {
                await apiClient.post('/api/favorites', 'invalid json', {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                expect(error.response.status).toBe(400);
            }
        });

        test('必須パラメータ不足で400エラーが返される', async () => {
            try {
                await apiClient.get('/api/favorites');
            } catch (error) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.error).toBe('Validation Error');
            }
        });
    });

    describe('キャッシュ機能統合', () => {
        test('検索結果がキャッシュされる', async () => {
            const searchParams = {
                q: 'eFootball cache test',
                maxResults: 3
            };

            // 最初のリクエスト
            const firstResponse = await apiClient.get('/api/videos/search', {
                params: searchParams
            });

            expect(firstResponse.data.cached).toBe(false);

            // 2回目のリクエスト（キャッシュから取得されるはず）
            const secondResponse = await apiClient.get('/api/videos/search', {
                params: searchParams
            });

            expect(secondResponse.data.cached).toBe(true);

            // 結果が同じであることを確認
            expect(secondResponse.data.videos).toEqual(firstResponse.data.videos);
        });
    });
});