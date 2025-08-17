const YouTubeService = require('../youtubeService');
const axios = require('axios');

// axiosをモック化
jest.mock('axios');
const mockedAxios = axios;

// CacheServiceをモック化
jest.mock('../cacheService');
// CacheServiceをモック化
jest.mock('../cacheService');
const CacheService = require('../cacheService');

describe('YouTubeService', () => {
    let youtubeService;
    let mockCacheService;
    const mockApiKey = 'test-api-key';

    beforeEach(() => {
        process.env.YOUTUBE_API_KEY = mockApiKey;

        // CacheServiceのモックインスタンスを作成
        mockCacheService = {
            getCachedSearchResults: jest.fn(),
            cacheSearchResults: jest.fn(),
            getCachedPopularVideos: jest.fn(),
            cachePopularVideos: jest.fn(),
            getCachedRelatedVideos: jest.fn(),
            cacheRelatedVideos: jest.fn()
        };

        CacheService.mockImplementation(() => mockCacheService);

        youtubeService = new YouTubeService();
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.YOUTUBE_API_KEY;
    });

    describe('コンストラクタ', () => {
        it('環境変数からAPIキーで初期化される', () => {
            expect(youtubeService.apiKey).toBe(mockApiKey);
            expect(youtubeService.baseURL).toBe('https://www.googleapis.com/youtube/v3');
        });

        it('APIキーが提供されていない場合エラーを投げる', () => {
            delete process.env.YOUTUBE_API_KEY;
            expect(() => new YouTubeService()).toThrow('YOUTUBE_API_KEY environment variable is required');
        });

        it('eFootball用語とカテゴリを初期化する', () => {
            expect(youtubeService.eFootballTerms).toContain('eFootball');
            expect(youtubeService.eFootballTerms).toContain('PES');
            expect(youtubeService.categories).toHaveProperty('gameplay');
            expect(youtubeService.categories).toHaveProperty('tips');
            expect(youtubeService.categories).toHaveProperty('review');
            expect(youtubeService.categories).toHaveProperty('news');
        });
    });

    describe('動画検索', () => {
        const mockSearchResponse = {
            data: {
                items: [{
                        id: {
                            videoId: 'video1'
                        },
                        snippet: {
                            title: 'eFootball gameplay'
                        }
                    },
                    {
                        id: {
                            videoId: 'video2'
                        },
                        snippet: {
                            title: 'PES tutorial tips'
                        }
                    }
                ],
                nextPageToken: 'next-token'
            }
        };

        const mockVideoDetailsResponse = {
            data: {
                items: [{
                        id: 'video1',
                        snippet: {
                            title: 'eFootball gameplay',
                            description: 'Amazing gameplay video',
                            thumbnails: {
                                default: {
                                    url: 'thumb1.jpg'
                                },
                                medium: {
                                    url: 'thumb1_medium.jpg'
                                },
                                high: {
                                    url: 'thumb1_high.jpg'
                                }
                            },
                            channelTitle: 'Gaming Channel',
                            publishedAt: '2023-01-01T00:00:00Z'
                        },
                        contentDetails: {
                            duration: 'PT4M13S'
                        },
                        statistics: {
                            viewCount: '1000',
                            likeCount: '50'
                        }
                    },
                    {
                        id: 'video2',
                        snippet: {
                            title: 'PES tutorial tips',
                            description: 'Learn how to play better',
                            thumbnails: {
                                default: {
                                    url: 'thumb2.jpg'
                                },
                                medium: {
                                    url: 'thumb2_medium.jpg'
                                },
                                high: {
                                    url: 'thumb2_high.jpg'
                                }
                            },
                            channelTitle: 'Tutorial Channel',
                            publishedAt: '2023-01-02T00:00:00Z'
                        },
                        contentDetails: {
                            duration: 'PT10M30S'
                        },
                        statistics: {
                            viewCount: '2000',
                            likeCount: '100'
                        }
                    }
                ]
            }
        };

        it('デフォルトパラメータでeFootball動画を検索する', async () => {
            mockCacheService.getCachedSearchResults.mockResolvedValue(null);
            mockCacheService.cacheSearchResults.mockResolvedValue(true);

            mockedAxios.get
                .mockResolvedValueOnce(mockSearchResponse)
                .mockResolvedValueOnce(mockVideoDetailsResponse);

            const result = await youtubeService.searchVideos();

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://www.googleapis.com/youtube/v3/search', {
                    params: {
                        part: 'snippet',
                        q: 'eFootball',
                        type: 'video',
                        maxResults: 25,
                        order: 'relevance',
                        key: mockApiKey,
                        regionCode: 'JP',
                        relevanceLanguage: 'ja'
                    }
                }
            );

            expect(result.videos).toHaveLength(2);
            expect(result.totalResults).toBe(2);
            expect(result.nextPageToken).toBe('next-token');

            // キャッシュ機能の確認
            expect(mockCacheService.getCachedSearchResults).toHaveBeenCalledWith('', '', 25);
            expect(mockCacheService.cacheSearchResults).toHaveBeenCalledWith('', '', 25, result);
        });

        it('eFootball用語で検索クエリを強化する', async () => {
            mockCacheService.getCachedSearchResults.mockResolvedValue(null);
            mockCacheService.cacheSearchResults.mockResolvedValue(true);

            mockedAxios.get
                .mockResolvedValueOnce(mockSearchResponse)
                .mockResolvedValueOnce(mockVideoDetailsResponse);

            await youtubeService.searchVideos('gameplay');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://www.googleapis.com/youtube/v3/search',
                expect.objectContaining({
                    params: expect.objectContaining({
                        q: 'gameplay eFootball'
                    })
                })
            );
        });

        it('eFootball用語が既に含まれている場合はクエリを変更しない', async () => {
            mockCacheService.getCachedSearchResults.mockResolvedValue(null);
            mockCacheService.cacheSearchResults.mockResolvedValue(true);

            mockedAxios.get
                .mockResolvedValueOnce(mockSearchResponse)
                .mockResolvedValueOnce(mockVideoDetailsResponse);

            await youtubeService.searchVideos('eFootball gameplay');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://www.googleapis.com/youtube/v3/search',
                expect.objectContaining({
                    params: expect.objectContaining({
                        q: 'eFootball gameplay'
                    })
                })
            );
        });

        it('指定されたカテゴリでフィルタリングする', async () => {
            mockCacheService.getCachedSearchResults.mockResolvedValue(null);
            mockCacheService.cacheSearchResults.mockResolvedValue(true);

            mockedAxios.get
                .mockResolvedValueOnce(mockSearchResponse)
                .mockResolvedValueOnce(mockVideoDetailsResponse);

            const result = await youtubeService.searchVideos('', 'tips');

            expect(result.videos).toHaveLength(1);
            expect(result.videos[0].category).toBe('tips');
        });

        it('空の検索結果を処理する', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    items: null
                }
            });

            const result = await youtubeService.searchVideos();

            expect(result.videos).toEqual([]);
            expect(result.totalResults).toBe(0);
        });

        it('APIエラーを処理する', async () => {
            const error = new Error('API Error');
            error.response = {
                data: {
                    error: 'Invalid API key'
                }
            };
            mockedAxios.get.mockRejectedValueOnce(error);

            await expect(youtubeService.searchVideos()).rejects.toThrow('API Error');
        });

        it('キャッシュされた検索結果を返す', async () => {
            const cachedResult = {
                videos: [{
                    id: 'cached1',
                    title: 'Cached eFootball video',
                    category: 'gameplay'
                }],
                totalResults: 1
            };

            mockCacheService.getCachedSearchResults.mockResolvedValue(cachedResult);

            const result = await youtubeService.searchVideos('test', 'gameplay', 10);

            expect(mockCacheService.getCachedSearchResults).toHaveBeenCalledWith('test', 'gameplay', 10);
            expect(result).toEqual(cachedResult);
            expect(mockedAxios.get).not.toHaveBeenCalled(); // APIは呼ばれない
        });

        it('キャッシュミス時はAPIを呼び出してキャッシュに保存する', async () => {
            mockCacheService.getCachedSearchResults.mockResolvedValue(null);
            mockCacheService.cacheSearchResults.mockResolvedValue(true);

            mockedAxios.get
                .mockResolvedValueOnce(mockSearchResponse)
                .mockResolvedValueOnce(mockVideoDetailsResponse);

            const result = await youtubeService.searchVideos('test', '', 25);

            expect(mockCacheService.getCachedSearchResults).toHaveBeenCalledWith('test', '', 25);
            expect(mockedAxios.get).toHaveBeenCalled();
            expect(mockCacheService.cacheSearchResults).toHaveBeenCalledWith('test', '', 25, result);
        });
    });

    describe('人気動画取得', () => {
        const mockPopularResponse = {
            data: {
                items: [{
                    id: {
                        videoId: 'popular1'
                    },
                    snippet: {
                        title: 'Popular eFootball match'
                    }
                }]
            }
        };

        const mockVideoDetailsResponse = {
            data: {
                items: [{
                    id: 'popular1',
                    snippet: {
                        title: 'Popular eFootball match',
                        description: 'Epic match gameplay',
                        thumbnails: {
                            default: {
                                url: 'popular1.jpg'
                            },
                            medium: {
                                url: 'popular1_medium.jpg'
                            },
                            high: {
                                url: 'popular1_high.jpg'
                            }
                        },
                        channelTitle: 'Pro Gaming',
                        publishedAt: '2023-01-01T00:00:00Z'
                    },
                    contentDetails: {
                        duration: 'PT15M45S'
                    },
                    statistics: {
                        viewCount: '50000',
                        likeCount: '1000'
                    }
                }]
            }
        };

        it('人気のeFootball動画を取得する', async () => {
            mockCacheService.getCachedPopularVideos.mockResolvedValue(null);
            mockCacheService.cachePopularVideos.mockResolvedValue(true);

            mockedAxios.get
                .mockResolvedValueOnce(mockPopularResponse)
                .mockResolvedValueOnce(mockVideoDetailsResponse);

            const result = await youtubeService.getPopularVideos();

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://www.googleapis.com/youtube/v3/search',
                expect.objectContaining({
                    params: expect.objectContaining({
                        q: 'eFootball OR efootball OR PES OR Pro Evolution Soccer OR ウイニングイレブン OR Winning Eleven',
                        order: 'viewCount',
                        publishedAfter: expect.any(String)
                    })
                })
            );

            expect(result.videos).toHaveLength(1);
            expect(result.videos[0].viewCount).toBe(50000);
        });

        it('カテゴリで人気動画をフィルタリングする', async () => {
            mockCacheService.getCachedPopularVideos.mockResolvedValue(null);
            mockCacheService.cachePopularVideos.mockResolvedValue(true);

            mockedAxios.get
                .mockResolvedValueOnce(mockPopularResponse)
                .mockResolvedValueOnce(mockVideoDetailsResponse);

            const result = await youtubeService.getPopularVideos('gameplay');

            expect(result.videos).toHaveLength(1);
            expect(result.videos[0].category).toBe('gameplay');
        });

        it('空の人気動画結果を処理する', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    items: null
                }
            });

            const result = await youtubeService.getPopularVideos();

            expect(result.videos).toEqual([]);
            expect(result.totalResults).toBe(0);
        });

        it('キャッシュされた人気動画を返す', async () => {
            const cachedResult = {
                videos: [{
                    id: 'cached-popular',
                    title: 'Cached popular video',
                    viewCount: 100000
                }],
                totalResults: 1
            };

            mockCacheService.getCachedPopularVideos.mockResolvedValue(cachedResult);

            const result = await youtubeService.getPopularVideos('gameplay', 20);

            expect(mockCacheService.getCachedPopularVideos).toHaveBeenCalledWith('gameplay', 20);
            expect(result).toEqual(cachedResult);
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('人気動画のキャッシュミス時はAPIを呼び出してキャッシュに保存する', async () => {
            mockCacheService.getCachedPopularVideos.mockResolvedValue(null);
            mockCacheService.cachePopularVideos.mockResolvedValue(true);

            mockedAxios.get
                .mockResolvedValueOnce(mockPopularResponse)
                .mockResolvedValueOnce(mockVideoDetailsResponse);

            const result = await youtubeService.getPopularVideos('', 25);

            expect(mockCacheService.getCachedPopularVideos).toHaveBeenCalledWith('', 25);
            expect(mockedAxios.get).toHaveBeenCalled();
            expect(mockCacheService.cachePopularVideos).toHaveBeenCalledWith('', 25, result);
        });
    });

    describe('関連動画取得', () => {
        const mockVideoDetailsResponse = {
            data: {
                items: [{
                    id: 'original-video',
                    snippet: {
                        title: 'Original eFootball video',
                        description: 'Original video description',
                        thumbnails: {
                            default: {
                                url: 'original.jpg'
                            },
                            medium: {
                                url: 'original_medium.jpg'
                            },
                            high: {
                                url: 'original_high.jpg'
                            }
                        },
                        channelTitle: 'Original Channel',
                        publishedAt: '2023-01-01T00:00:00Z'
                    },
                    contentDetails: {
                        duration: 'PT5M00S'
                    },
                    statistics: {
                        viewCount: '1000',
                        likeCount: '50'
                    }
                }]
            }
        };

        const mockRelatedSearchResponse = {
            data: {
                items: [{
                        id: {
                            videoId: 'original-video'
                        }, // これはフィルタリングされる
                        snippet: {
                            title: 'Original eFootball video'
                        }
                    },
                    {
                        id: {
                            videoId: 'related1'
                        },
                        snippet: {
                            title: 'Related eFootball video'
                        }
                    }
                ]
            }
        };

        const mockRelatedDetailsResponse = {
            data: {
                items: [{
                    id: 'related1',
                    snippet: {
                        title: 'Related eFootball video',
                        description: 'Related video description',
                        thumbnails: {
                            default: {
                                url: 'related1.jpg'
                            },
                            medium: {
                                url: 'related1_medium.jpg'
                            },
                            high: {
                                url: 'related1_high.jpg'
                            }
                        },
                        channelTitle: 'Related Channel',
                        publishedAt: '2023-01-02T00:00:00Z'
                    },
                    contentDetails: {
                        duration: 'PT8M30S'
                    },
                    statistics: {
                        viewCount: '2000',
                        likeCount: '100'
                    }
                }]
            }
        };

        it('指定された動画IDの関連動画を取得する', async () => {
            mockCacheService.getCachedRelatedVideos.mockResolvedValue(null);
            mockCacheService.cacheRelatedVideos.mockResolvedValue(true);

            mockedAxios.get
                .mockResolvedValueOnce(mockVideoDetailsResponse) // 元動画の詳細取得
                .mockResolvedValueOnce(mockRelatedSearchResponse) // 関連動画検索
                .mockResolvedValueOnce(mockRelatedDetailsResponse); // 関連動画詳細取得

            const result = await youtubeService.getRelatedVideos('original-video');

            expect(mockedAxios.get).toHaveBeenCalledTimes(3);
            expect(result.videos).toHaveLength(1);
            expect(result.videos[0].id).toBe('related1');
        });

        it('関連動画結果から元動画をフィルタリングする', async () => {
            mockCacheService.getCachedRelatedVideos.mockResolvedValue(null);
            mockCacheService.cacheRelatedVideos.mockResolvedValue(true);

            mockedAxios.get
                .mockResolvedValueOnce(mockVideoDetailsResponse)
                .mockResolvedValueOnce(mockRelatedSearchResponse)
                .mockResolvedValueOnce(mockRelatedDetailsResponse);

            const result = await youtubeService.getRelatedVideos('original-video');

            expect(result.videos.every(video => video.id !== 'original-video')).toBe(true);
        });

        it('動画が見つからない場合を処理する', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    items: []
                }
            });

            await expect(youtubeService.getRelatedVideos('nonexistent')).rejects.toThrow('Video not found');
        });

        it('関連動画が見つからない場合を処理する', async () => {
            mockedAxios.get
                .mockResolvedValueOnce(mockVideoDetailsResponse)
                .mockResolvedValueOnce({
                    data: {
                        items: [{
                            id: {
                                videoId: 'original-video'
                            }
                        }]
                    }
                }); // 元動画のみ

            const result = await youtubeService.getRelatedVideos('original-video');

            expect(result.videos).toEqual([]);
            expect(result.totalResults).toBe(0);
        });

        it('キャッシュされた関連動画を返す', async () => {
            const cachedResult = {
                videos: [{
                    id: 'cached-related',
                    title: 'Cached related video'
                }],
                totalResults: 1
            };

            mockCacheService.getCachedRelatedVideos.mockResolvedValue(cachedResult);

            const result = await youtubeService.getRelatedVideos('test-video', 15);

            expect(mockCacheService.getCachedRelatedVideos).toHaveBeenCalledWith('test-video', 15);
            expect(result).toEqual(cachedResult);
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('関連動画のキャッシュミス時はAPIを呼び出してキャッシュに保存する', async () => {
            mockCacheService.getCachedRelatedVideos.mockResolvedValue(null);
            mockCacheService.cacheRelatedVideos.mockResolvedValue(true);

            mockedAxios.get
                .mockResolvedValueOnce(mockVideoDetailsResponse)
                .mockResolvedValueOnce(mockRelatedSearchResponse)
                .mockResolvedValueOnce(mockRelatedDetailsResponse);

            const result = await youtubeService.getRelatedVideos('original-video', 10);

            expect(mockCacheService.getCachedRelatedVideos).toHaveBeenCalledWith('original-video', 10);
            expect(mockedAxios.get).toHaveBeenCalledTimes(3);
            expect(mockCacheService.cacheRelatedVideos).toHaveBeenCalledWith('original-video', 10, result);
        });
    });

    describe('動画詳細取得', () => {
        const mockVideoDetailsResponse = {
            data: {
                items: [{
                    id: 'video1',
                    snippet: {
                        title: 'Test Video',
                        description: 'Test Description',
                        thumbnails: {
                            default: {
                                url: 'thumb1.jpg'
                            },
                            medium: {
                                url: 'thumb1_medium.jpg'
                            },
                            high: {
                                url: 'thumb1_high.jpg'
                            }
                        },
                        channelTitle: 'Test Channel',
                        publishedAt: '2023-01-01T00:00:00Z'
                    },
                    contentDetails: {
                        duration: 'PT1H30M45S'
                    },
                    statistics: {
                        viewCount: '10000',
                        likeCount: '500'
                    }
                }]
            }
        };

        it('動画の詳細情報を取得する', async () => {
            mockedAxios.get.mockResolvedValueOnce(mockVideoDetailsResponse);

            const result = await youtubeService.getVideoDetails('video1');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://www.googleapis.com/youtube/v3/videos', {
                    params: {
                        part: 'snippet,contentDetails,statistics',
                        id: 'video1',
                        key: mockApiKey
                    }
                }
            );

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                id: 'video1',
                title: 'Test Video',
                description: 'Test Description',
                channelTitle: 'Test Channel',
                viewCount: 10000,
                likeCount: 500,
                duration: '1:30:45'
            });
        });

        it('サムネイルが存在しない場合を処理する', async () => {
            const mockResponseWithoutThumbnails = {
                data: {
                    items: [{
                        id: 'video1',
                        snippet: {
                            title: 'Test Video',
                            description: 'Test Description',
                            thumbnails: {},
                            channelTitle: 'Test Channel',
                            publishedAt: '2023-01-01T00:00:00Z'
                        },
                        contentDetails: {
                            duration: 'PT5M00S'
                        },
                        statistics: {
                            viewCount: '1000'
                        }
                    }]
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponseWithoutThumbnails);

            const result = await youtubeService.getVideoDetails('video1');

            expect(result[0].thumbnail.default).toBeUndefined();
            expect(result[0].thumbnail.medium).toBeUndefined();
            expect(result[0].thumbnail.high).toBeUndefined();
        });
    });

    describe('検索クエリ強化', () => {
        it('eFootball用語がないクエリにeFootball用語を追加する', () => {
            const result = youtubeService.enhanceSearchQuery('gameplay');
            expect(result).toBe('gameplay eFootball');
        });

        it('eFootball用語が既に含まれているクエリは変更しない', () => {
            const result = youtubeService.enhanceSearchQuery('eFootball gameplay');
            expect(result).toBe('eFootball gameplay');
        });

        it('空のクエリにはデフォルトのeFootball用語を返す', () => {
            const result = youtubeService.enhanceSearchQuery('');
            expect(result).toBe('eFootball');
        });

        it('大文字小文字を区別しないeFootball用語検出を処理する', () => {
            const result = youtubeService.enhanceSearchQuery('EFOOTBALL gameplay');
            expect(result).toBe('EFOOTBALL gameplay');
        });

        it('PES用語が含まれている場合は変更しない', () => {
            const result = youtubeService.enhanceSearchQuery('PES 2024 gameplay');
            expect(result).toBe('PES 2024 gameplay');
        });
    });

    describe('動画カテゴリ分類', () => {
        const mockVideos = [{
                id: 'video1',
                title: 'eFootball gameplay match',
                description: 'Amazing gameplay video'
            },
            {
                id: 'video2',
                title: 'PES tutorial guide',
                description: 'Learn tips and tricks'
            },
            {
                id: 'video3',
                title: 'eFootball review',
                description: 'My opinion on the game'
            },
            {
                id: 'video4',
                title: 'Latest eFootball news',
                description: 'Update information'
            },
            {
                id: 'video5',
                title: 'Random eFootball video',
                description: 'No specific category'
            }
        ];

        it('動画を正しくカテゴリ分類する', () => {
            const result = youtubeService.categorizeVideos(mockVideos);

            expect(result[0].category).toBe('gameplay');
            expect(result[0].categoryName).toBe('ゲームプレイ');

            expect(result[1].category).toBe('tips');
            expect(result[1].categoryName).toBe('攻略・コツ');

            expect(result[2].category).toBe('review');
            expect(result[2].categoryName).toBe('レビュー');

            expect(result[3].category).toBe('news');
            expect(result[3].categoryName).toBe('ニュース');

            expect(result[4].category).toBe('gameplay'); // デフォルトカテゴリ
            expect(result[4].categoryName).toBe('ゲームプレイ');
        });

        it('複数のカテゴリキーワードがある場合は最初にマッチしたものを使用する', () => {
            const testVideos = [{
                id: 'video1',
                title: 'eFootball gameplay tutorial',
                description: 'Learn gameplay tips'
            }];

            const result = youtubeService.categorizeVideos(testVideos);
            expect(result[0].category).toBe('tips'); // tutorialが先にマッチ（カテゴリ順序による）
        });
    });

    describe('動画時間解析', () => {
        it('時間、分、秒を含む時間を解析する', () => {
            expect(youtubeService.parseDuration('PT1H30M45S')).toBe('1:30:45');
        });

        it('分と秒のみの時間を解析する', () => {
            expect(youtubeService.parseDuration('PT4M13S')).toBe('4:13');
        });

        it('秒のみの時間を解析する', () => {
            expect(youtubeService.parseDuration('PT30S')).toBe('0:30');
        });

        it('分のみの時間を解析する', () => {
            expect(youtubeService.parseDuration('PT5M')).toBe('5:00');
        });

        it('無効な時間フォーマットを処理する', () => {
            expect(youtubeService.parseDuration('invalid')).toBe('0:00');
        });

        it('一桁の分と秒をゼロパディングする', () => {
            expect(youtubeService.parseDuration('PT1H2M3S')).toBe('1:02:03');
        });

        it('時間のみの時間を解析する', () => {
            expect(youtubeService.parseDuration('PT2H')).toBe('2:00:00');
        });
    });

    describe('キャッシュ機能', () => {
        it('キャッシュヒット時はAPIを呼び出さない', async () => {
            const cachedData = {
                videos: [{
                    id: 'cached1',
                    title: 'Cached video'
                }],
                totalResults: 1
            };

            mockCacheService.getCachedSearchResults.mockResolvedValue(cachedData);

            const result = await youtubeService.searchVideos('test', 'gameplay', 10);

            expect(result).toEqual(cachedData);
            expect(mockCacheService.getCachedSearchResults).toHaveBeenCalledWith('test', 'gameplay', 10);
            expect(mockedAxios.get).not.toHaveBeenCalled();
            expect(mockCacheService.cacheSearchResults).not.toHaveBeenCalled();
        });

        it('人気動画のキャッシュヒット時はAPIを呼び出さない', async () => {
            const cachedData = {
                videos: [{
                    id: 'popular1',
                    title: 'Popular cached video'
                }],
                totalResults: 1
            };

            mockCacheService.getCachedPopularVideos.mockResolvedValue(cachedData);

            const result = await youtubeService.getPopularVideos('gameplay', 20);

            expect(result).toEqual(cachedData);
            expect(mockCacheService.getCachedPopularVideos).toHaveBeenCalledWith('gameplay', 20);
            expect(mockedAxios.get).not.toHaveBeenCalled();
            expect(mockCacheService.cachePopularVideos).not.toHaveBeenCalled();
        });

        it('関連動画のキャッシュヒット時はAPIを呼び出さない', async () => {
            const cachedData = {
                videos: [{
                    id: 'related1',
                    title: 'Related cached video'
                }],
                totalResults: 1
            };

            mockCacheService.getCachedRelatedVideos.mockResolvedValue(cachedData);

            const result = await youtubeService.getRelatedVideos('video123', 15);

            expect(result).toEqual(cachedData);
            expect(mockCacheService.getCachedRelatedVideos).toHaveBeenCalledWith('video123', 15);
            expect(mockedAxios.get).not.toHaveBeenCalled();
            expect(mockCacheService.cacheRelatedVideos).not.toHaveBeenCalled();
        });
    });
});