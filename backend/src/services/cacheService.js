const redisClient = require('../config/redis');

/**
 * YouTube動画検索結果のキャッシュ管理サービス
 * Redis を使用して検索結果、人気動画、関連動画をキャッシュします
 */
class CacheService {
    constructor() {
        this.redisClient = redisClient;
        this.defaultTTL = 300; // 5分間（秒単位）
    }

    /**
     * 検索結果をキャッシュに保存する
     * @param {string} query - 検索クエリ
     * @param {string} category - カテゴリフィルター
     * @param {number} maxResults - 最大結果数
     * @param {Object} data - キャッシュするデータ
     * @param {number} ttl - キャッシュ有効期限（秒）
     * @returns {Promise<boolean>} 保存成功フラグ
     */
    async cacheSearchResults(query, category = '', maxResults = 25, data, ttl = this.defaultTTL) {
        try {
            const cacheKey = this.redisClient.generateSearchKey(query, category, maxResults);
            return await this.redisClient.set(cacheKey, data, ttl);
        } catch (error) {
            console.error('検索結果キャッシュ保存エラー:', error);
            return false;
        }
    }

    /**
     * キャッシュから検索結果を取得する
     * @param {string} query - 検索クエリ
     * @param {string} category - カテゴリフィルター
     * @param {number} maxResults - 最大結果数
     * @returns {Promise<Object|null>} キャッシュされたデータまたはnull
     */
    async getCachedSearchResults(query, category = '', maxResults = 25) {
        try {
            const cacheKey = this.redisClient.generateSearchKey(query, category, maxResults);
            return await this.redisClient.get(cacheKey);
        } catch (error) {
            console.error('検索結果キャッシュ取得エラー:', error);
            return null;
        }
    }

    /**
     * 人気動画をキャッシュに保存する
     * @param {string} category - カテゴリフィルター
     * @param {number} maxResults - 最大結果数
     * @param {Object} data - キャッシュするデータ
     * @param {number} ttl - キャッシュ有効期限（秒）
     * @returns {Promise<boolean>} 保存成功フラグ
     */
    async cachePopularVideos(category = '', maxResults = 25, data, ttl = this.defaultTTL) {
        try {
            const cacheKey = this.redisClient.generatePopularKey(category, maxResults);
            return await this.redisClient.set(cacheKey, data, ttl);
        } catch (error) {
            console.error('人気動画キャッシュ保存エラー:', error);
            return false;
        }
    }

    /**
     * キャッシュから人気動画を取得する
     * @param {string} category - カテゴリフィルター
     * @param {number} maxResults - 最大結果数
     * @returns {Promise<Object|null>} キャッシュされたデータまたはnull
     */
    async getCachedPopularVideos(category = '', maxResults = 25) {
        try {
            const cacheKey = this.redisClient.generatePopularKey(category, maxResults);
            return await this.redisClient.get(cacheKey);
        } catch (error) {
            console.error('人気動画キャッシュ取得エラー:', error);
            return null;
        }
    }

    /**
     * 関連動画をキャッシュに保存する
     * @param {string} videoId - 動画ID
     * @param {number} maxResults - 最大結果数
     * @param {Object} data - キャッシュするデータ
     * @param {number} ttl - キャッシュ有効期限（秒）
     * @returns {Promise<boolean>} 保存成功フラグ
     */
    async cacheRelatedVideos(videoId, maxResults = 10, data, ttl = this.defaultTTL) {
        try {
            const cacheKey = this.redisClient.generateRelatedKey(videoId, maxResults);
            return await this.redisClient.set(cacheKey, data, ttl);
        } catch (error) {
            console.error('関連動画キャッシュ保存エラー:', error);
            return false;
        }
    }

    /**
     * キャッシュから関連動画を取得する
     * @param {string} videoId - 動画ID
     * @param {number} maxResults - 最大結果数
     * @returns {Promise<Object|null>} キャッシュされたデータまたはnull
     */
    async getCachedRelatedVideos(videoId, maxResults = 10) {
        try {
            const cacheKey = this.redisClient.generateRelatedKey(videoId, maxResults);
            return await this.redisClient.get(cacheKey);
        } catch (error) {
            console.error('関連動画キャッシュ取得エラー:', error);
            return null;
        }
    }

    /**
     * 検索結果キャッシュを削除する
     * @param {string} query - 検索クエリ
     * @param {string} category - カテゴリフィルター
     * @param {number} maxResults - 最大結果数
     * @returns {Promise<boolean>} 削除成功フラグ
     */
    async clearSearchCache(query, category = '', maxResults = 25) {
        try {
            const cacheKey = this.redisClient.generateSearchKey(query, category, maxResults);
            return await this.redisClient.del(cacheKey);
        } catch (error) {
            console.error('検索結果キャッシュ削除エラー:', error);
            return false;
        }
    }

    /**
     * 人気動画キャッシュを削除する
     * @param {string} category - カテゴリフィルター
     * @param {number} maxResults - 最大結果数
     * @returns {Promise<boolean>} 削除成功フラグ
     */
    async clearPopularCache(category = '', maxResults = 25) {
        try {
            const cacheKey = this.redisClient.generatePopularKey(category, maxResults);
            return await this.redisClient.del(cacheKey);
        } catch (error) {
            console.error('人気動画キャッシュ削除エラー:', error);
            return false;
        }
    }

    /**
     * 関連動画キャッシュを削除する
     * @param {string} videoId - 動画ID
     * @param {number} maxResults - 最大結果数
     * @returns {Promise<boolean>} 削除成功フラグ
     */
    async clearRelatedCache(videoId, maxResults = 10) {
        try {
            const cacheKey = this.redisClient.generateRelatedKey(videoId, maxResults);
            return await this.redisClient.del(cacheKey);
        } catch (error) {
            console.error('関連動画キャッシュ削除エラー:', error);
            return false;
        }
    }

    /**
     * キャッシュ統計情報を取得する（将来の拡張用）
     * @returns {Promise<Object>} キャッシュ統計
     */
    async getCacheStats() {
        // 将来の拡張として実装予定
        // ヒット率、ミス率、キャッシュサイズなどの統計情報
        return {
            hits: 0,
            misses: 0,
            hitRate: 0,
            totalKeys: 0
        };
    }

    /**
     * 全てのキャッシュをクリアする（開発・テスト用）
     * @returns {Promise<boolean>} クリア成功フラグ
     */
    async clearAllCache() {
        try {
            // 本番環境では使用しないよう注意
            if (process.env.NODE_ENV === 'production') {
                console.warn('本番環境では全キャッシュクリアは推奨されません');
                return false;
            }

            // パターンマッチングでeFootball関連のキーのみ削除
            // 実装は将来の拡張として予定
            console.log('全キャッシュクリア機能は開発中です');
            return true;
        } catch (error) {
            console.error('全キャッシュクリアエラー:', error);
            return false;
        }
    }
}

module.exports = CacheService;