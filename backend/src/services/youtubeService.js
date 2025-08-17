const axios = require('axios');
const CacheService = require('./cacheService');

class YouTubeService {
    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY;
        this.baseURL = 'https://www.googleapis.com/youtube/v3';
        this.cacheService = new CacheService();

        if (!this.apiKey) {
            throw new Error('YOUTUBE_API_KEY environment variable is required');
        }

        // より良いフィルタリングのためのeFootball関連検索用語
        this.eFootballTerms = [
            'eFootball',
            'efootball',
            'PES',
            'Pro Evolution Soccer',
            'ウイニングイレブン',
            'Winning Eleven',
        ];

        // eFootballコンテンツのカテゴリマッピング
        this.categories = {
            review: {
                name: 'レビュー',
                searchTerms: ['レビュー', 'review', '評価', '感想', 'opinion'],
            },
            news: {
                name: 'ニュース',
                searchTerms: [
                    'ニュース',
                    'news',
                    'アップデート',
                    '最新',
                    'update',
                    'latest',
                ],
            },
            tips: {
                name: '攻略・コツ',
                searchTerms: [
                    '攻略',
                    'コツ',
                    'tips',
                    'tutorial',
                    '解説',
                    'guide',
                    'how to',
                ],
            },
            gameplay: {
                name: 'ゲームプレイ',
                searchTerms: ['gameplay', 'プレイ', '実況', '対戦', 'match'],
            },
        };
    }

    /**
     * eFootball関連動画を検索する
     * @param {string} query - 検索クエリ
     * @param {string} category - カテゴリフィルター
     * @param {number} maxResults - 最大結果数
     * @returns {Promise<Object>} 検索結果
     */
    async searchVideos(query, category, maxResults) {
        query = query || '';
        category = category || '';
        maxResults = maxResults || 25;

        try {
            // キャッシュから結果を取得を試行
            const cachedResult = await this.cacheService.getCachedSearchResults(query, category, maxResults);
            if (cachedResult) {
                console.log('検索結果をキャッシュから取得:', {
                    query,
                    category,
                    maxResults
                });
                return cachedResult;
            }

            // eFootball用語がまだ含まれていない場合はクエリを強化
            const enhancedQuery = this.enhanceSearchQuery(query);

            const params = {
                part: 'snippet',
                q: enhancedQuery,
                type: 'video',
                maxResults: Math.min(maxResults, 50), // YouTube API制限
                order: 'relevance',
                key: this.apiKey,
                regionCode: 'JP', // 日本のコンテンツに焦点
                relevanceLanguage: 'ja',
            };

            const response = await axios.get(`${this.baseURL}/search`, {
                params,
            });

            if (!response.data.items) {
                return {
                    videos: [],
                    totalResults: 0,
                };
            }

            // 再生時間と再生回数を含む動画詳細を取得
            const videoIds = response.data.items
                .map((item) => item.id.videoId)
                .join(',');
            const detailedVideos = await this.getVideoDetails(videoIds);

            // 動画をカテゴリ分類してフィルタリング
            let videos = this.categorizeVideos(detailedVideos);

            // 指定されている場合はカテゴリフィルターを適用
            if (category && this.categories[category]) {
                videos = videos.filter((video) => video.category === category);
            }

            const result = {
                videos,
                totalResults: videos.length,
                nextPageToken: response.data.nextPageToken,
            };

            // 結果をキャッシュに保存
            await this.cacheService.cacheSearchResults(query, category, maxResults, result);
            console.log('検索結果をキャッシュに保存:', {
                query,
                category,
                maxResults
            });

            return result;
        } catch (error) {
            console.error(
                'YouTube検索エラー:',
                (error.response && error.response.data) || error.message
            );
            throw error;
        }
    }

    /**
     * 人気のeFootball動画を取得する
     * @param {string} category - カテゴリフィルター
     * @param {number} maxResults - 最大結果数
     * @returns {Promise<Object>} 人気動画
     */
    async getPopularVideos(category, maxResults) {
        category = category || '';
        maxResults = maxResults || 25;

        try {
            // キャッシュから結果を取得を試行
            const cachedResult = await this.cacheService.getCachedPopularVideos(category, maxResults);
            if (cachedResult) {
                console.log('人気動画をキャッシュから取得:', {
                    category,
                    maxResults
                });
                return cachedResult;
            }
            const query = this.eFootballTerms.join(' OR ');

            const params = {
                part: 'snippet',
                q: query,
                type: 'video',
                maxResults: Math.min(maxResults, 50),
                order: 'viewCount',
                publishedAfter: new Date(
                    Date.now() - 30 * 24 * 60 * 60 * 1000
                ).toISOString(), // 過去30日間
                key: this.apiKey,
                regionCode: 'JP',
                relevanceLanguage: 'ja',
            };

            const response = await axios.get(`${this.baseURL}/search`, {
                params,
            });

            if (!response.data.items) {
                return {
                    videos: [],
                    totalResults: 0,
                };
            }

            const videoIds = response.data.items
                .map((item) => item.id.videoId)
                .join(',');
            const detailedVideos = await this.getVideoDetails(videoIds);

            let videos = this.categorizeVideos(detailedVideos);

            if (category && this.categories[category]) {
                videos = videos.filter((video) => video.category === category);
            }

            const result = {
                videos,
                totalResults: videos.length,
            };

            // 結果をキャッシュに保存
            await this.cacheService.cachePopularVideos(category, maxResults, result);
            console.log('人気動画をキャッシュに保存:', {
                category,
                maxResults
            });

            return result;
        } catch (error) {
            console.error(
                'YouTube人気動画エラー:',
                (error.response && error.response.data) || error.message
            );
            throw error;
        }
    }

    /**
     * 特定の動画の関連動画を取得する
     * @param {string} videoId - 関連動画を検索する動画ID
     * @param {number} maxResults - 最大結果数
     * @returns {Promise<Object>} 関連動画
     */
    async getRelatedVideos(videoId, maxResults) {
        maxResults = maxResults || 10;

        try {
            // キャッシュから結果を取得を試行
            const cachedResult = await this.cacheService.getCachedRelatedVideos(videoId, maxResults);
            if (cachedResult) {
                console.log('関連動画をキャッシュから取得:', {
                    videoId,
                    maxResults
                });
                return cachedResult;
            }
            // まず動画詳細を取得してキーワードを抽出
            const videoDetails = await this.getVideoDetails(videoId);
            if (!videoDetails.length) {
                throw new Error('Video not found');
            }

            const video = videoDetails[0];
            const searchQuery = `${video.title} ${this.eFootballTerms[0]}`;

            const params = {
                part: 'snippet',
                q: searchQuery,
                type: 'video',
                maxResults: Math.min(maxResults + 5, 25), // 元動画をフィルタリングするため余分に取得
                order: 'relevance',
                key: this.apiKey,
                regionCode: 'JP',
                relevanceLanguage: 'ja',
            };

            const response = await axios.get(`${this.baseURL}/search`, {
                params,
            });

            if (!response.data.items) {
                return {
                    videos: [],
                    totalResults: 0,
                };
            }

            // 元動画をフィルタリングして詳細を取得
            const relatedVideoIds = response.data.items
                .filter((item) => item.id.videoId !== videoId)
                .slice(0, maxResults)
                .map((item) => item.id.videoId)
                .join(',');

            if (!relatedVideoIds) {
                return {
                    videos: [],
                    totalResults: 0,
                };
            }

            const detailedVideos = await this.getVideoDetails(relatedVideoIds);
            const videos = this.categorizeVideos(detailedVideos);

            const result = {
                videos,
                totalResults: videos.length,
            };

            // 結果をキャッシュに保存
            await this.cacheService.cacheRelatedVideos(videoId, maxResults, result);
            console.log('関連動画をキャッシュに保存:', {
                videoId,
                maxResults
            });

            return result;
        } catch (error) {
            console.error(
                'YouTube関連動画エラー:',
                (error.response && error.response.data) || error.message
            );
            throw error;
        }
    }

    /**
     * 動画の詳細情報を取得する
     * @param {string} videoIds - カンマ区切りの動画ID
     * @returns {Promise<Array>} 動画詳細
     */
    async getVideoDetails(videoIds) {
        try {
            const params = {
                part: 'snippet,contentDetails,statistics',
                id: videoIds,
                key: this.apiKey,
            };

            const response = await axios.get(`${this.baseURL}/videos`, {
                params,
            });

            return response.data.items.map((item) => ({
                id: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: {
                    default: item.snippet.thumbnails.default &&
                        item.snippet.thumbnails.default.url,
                    medium: item.snippet.thumbnails.medium &&
                        item.snippet.thumbnails.medium.url,
                    high: item.snippet.thumbnails.high && item.snippet.thumbnails.high.url,
                },
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                duration: this.parseDuration(item.contentDetails.duration),
                viewCount: parseInt(item.statistics.viewCount) || 0,
                likeCount: parseInt(item.statistics.likeCount) || 0,
                category: 'general', // categorizeVideosで設定される
            }));
        } catch (error) {
            console.error(
                'YouTube動画詳細エラー:',
                (error.response && error.response.data) || error.message
            );
            throw error;
        }
    }

    /**
     * eFootball用語で検索クエリを強化する
     * @param {string} query - 元のクエリ
     * @returns {string} 強化されたクエリ
     */
    enhanceSearchQuery(query) {
        if (!query) {
            return this.eFootballTerms[0]; // デフォルトでeFootball
        }

        // クエリに既にeFootball用語が含まれているかチェック
        const hasEFootballTerm = this.eFootballTerms.some((term) =>
            query.toLowerCase().includes(term.toLowerCase())
        );

        if (!hasEFootballTerm) {
            return `${query} ${this.eFootballTerms[0]}`;
        }

        return query;
    }

    /**
     * タイトルと説明に基づいて動画をカテゴリ分類する
     * @param {Array} videos - 動画オブジェクトの配列
     * @returns {Array} カテゴリ分類された動画
     */
    categorizeVideos(videos) {
        return videos.map((video) => {
            const content = `${video.title} ${video.description}`.toLowerCase();

            for (const [categoryKey, categoryData] of Object.entries(
                    this.categories
                )) {
                const hasMatch = categoryData.searchTerms.some((term) =>
                    content.includes(term.toLowerCase())
                );

                if (hasMatch) {
                    video.category = categoryKey;
                    video.categoryName = categoryData.name;
                    return video;
                }
            }

            // デフォルトカテゴリ
            video.category = 'gameplay';
            video.categoryName = this.categories.gameplay.name;
            return video;
        });
    }

    /**
     * YouTube時間フォーマット（PT4M13S）を読みやすい形式に解析する
     * @param {string} duration - YouTube時間文字列
     * @returns {string} フォーマットされた時間
     */
    parseDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return '0:00';

        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

module.exports = YouTubeService;