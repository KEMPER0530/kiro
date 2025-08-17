# API ドキュメント

このドキュメントでは、YouTube eFootball Player API の包括的なドキュメントを提供します。

## ベース URL

- **開発環境**: `http://localhost:3001/api`
- **本番環境**: `https://api.your-domain.com/api`

## 認証

現在、API は認証を必要としません。すべてのエンドポイントは公開アクセス可能です。

## レート制限

- **検索エンドポイント**: IP 当たり 1 時間に 100 リクエスト
- **その他のエンドポイント**: IP 当たり 1 時間に 1000 リクエスト

レート制限ヘッダーはすべてのレスポンスに含まれます：

- `X-RateLimit-Limit`: ウィンドウあたりのリクエスト制限
- `X-RateLimit-Remaining`: 現在のウィンドウでの残りリクエスト数
- `X-RateLimit-Reset`: レート制限がリセットされる時刻

## レスポンス形式

すべての API レスポンスは一貫した JSON 形式に従います：

### 成功レスポンス

```json
{
  "success": true,
  "data": {},
  "meta": {
    "responseTime": "123ms",
    "cached": false,
    "rateLimit": {
      "limit": 100,
      "remaining": 99,
      "reset": 1640995200
    }
  }
}
```

### エラーレスポンス

```json
{
  "error": "エラータイプ",
  "message": "詳細なエラーメッセージ",
  "code": "ERROR_CODE",
  "details": {}
}
```

## 動画エンドポイント

### 動画検索

eFootball 関連の YouTube 動画を検索します。

**エンドポイント**: `GET /api/videos/search`

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 | デフォルト |
|-----------|------|----------|-------------|---------|
| `q` | string | いいえ | 検索クエリ | - |
| `category` | string | いいえ | 動画カテゴリフィルター | - |
| `maxResults` | integer | いいえ | 最大結果数 (1-50) | 25 |

**カテゴリ値**:

- `gameplay` - ゲームプレイ動画
- `tips` - 攻略とチュートリアル
- `review` - レビューと分析
- `news` - ニュースと更新情報

**リクエスト例**:

```bash
GET /api/videos/search?q=eFootball&category=gameplay&maxResults=10
```

**レスポンス例**:

```json
{
  "success": true,
  "videos": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "eFootball 2024 ゲームプレイ",
      "description": "最新のeFootballゲームプレイ...",
      "thumbnail": {
        "default": "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
        "medium": "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
        "high": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
      },
      "channelTitle": "eFootball チャンネル",
      "publishedAt": "2024-01-15T10:30:00Z",
      "duration": "PT10M30S",
      "viewCount": 150000,
      "category": "gameplay"
    }
  ],
  "totalResults": 1000,
  "nextPageToken": "CAUQAA",
  "cached": false,
  "meta": {
    "responseTime": "245ms",
    "rateLimit": {
      "limit": 100,
      "remaining": 99,
      "reset": 1640995200
    }
  }
}
```

### 人気動画取得

人気の eFootball 動画を取得します。

**エンドポイント**: `GET /api/videos/popular`

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 | デフォルト |
|-----------|------|----------|-------------|---------|
| `category` | string | いいえ | 動画カテゴリフィルター | - |
| `maxResults` | integer | いいえ | 最大結果数 (1-50) | 25 |

**リクエスト例**:

```bash
GET /api/videos/popular?category=tips&maxResults=15
```

**レスポンス**: 動画検索エンドポイントと同じ形式。

### 関連動画取得

特定の動画に関連する動画を取得します。

**エンドポイント**: `GET /api/videos/related/:videoId`

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| `videoId` | string | はい | YouTube 動画 ID |

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 | デフォルト |
|-----------|------|----------|-------------|---------|
| `maxResults` | integer | いいえ | 最大結果数 (1-25) | 10 |

**リクエスト例**:

```bash
GET /api/videos/related/dQw4w9WgXcQ?maxResults=5
```

**レスポンス**: 動画検索エンドポイントと同じ形式。

## お気に入りエンドポイント

### ユーザーお気に入り取得

ユーザーのお気に入り動画を取得します。

**エンドポイント**: `GET /api/favorites`

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 | デフォルト |
|-----------|------|----------|-------------|---------|
| `userId` | string | はい | ユーザー識別子 | - |
| `limit` | integer | いいえ | 最大結果数 (1-100) | 100 |

**リクエスト例**:

```bash
GET /api/favorites?userId=user123&limit=20
```

**レスポンス例**:

```json
{
  "success": true,
  "favorites": [
    {
      "videoId": "dQw4w9WgXcQ",
      "video": {
        "id": "dQw4w9WgXcQ",
        "title": "eFootball 2024 ゲームプレイ",
        "description": "最新のeFootballゲームプレイ...",
        "thumbnail": {
          "default": "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
          "medium": "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
          "high": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        },
        "channelTitle": "eFootball チャンネル",
        "publishedAt": "2024-01-15T10:30:00Z",
        "duration": "PT10M30S",
        "viewCount": 150000,
        "category": "gameplay"
      },
      "addedAt": "2024-01-20T15:45:00Z"
    }
  ],
  "count": 1
}
```

### お気に入りに動画追加

ユーザーのお気に入りに動画を追加します。

**エンドポイント**: `POST /api/favorites`

**リクエストボディ**:

```json
{
  "userId": "user123",
  "video": {
    "id": "dQw4w9WgXcQ",
    "title": "eFootball 2024 ゲームプレイ",
    "description": "最新のeFootballゲームプレイ...",
    "thumbnail": {
      "default": "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
      "medium": "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      "high": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    },
    "channelTitle": "eFootball チャンネル",
    "publishedAt": "2024-01-15T10:30:00Z",
    "duration": "PT10M30S",
    "viewCount": 150000,
    "category": "gameplay"
  }
}
```

**レスポンス例**:

```json
{
  "success": true,
  "message": "動画をお気に入りに追加しました",
  "favorite": {
    "videoId": "dQw4w9WgXcQ",
    "video": {
      /* 動画オブジェクト */
    },
    "addedAt": "2024-01-20T15:45:00Z"
  }
}
```

**エラーレスポンス**:

- `409 Conflict`: 動画は既にお気に入りに登録済み
- `400 Bad Request`: お気に入りの最大数（100）に達しました

### お気に入りから動画削除

ユーザーのお気に入りから動画を削除します。

**エンドポイント**: `DELETE /api/favorites/:videoId`

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| `videoId` | string | はい | YouTube 動画 ID |

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| `userId` | string | はい | ユーザー識別子 |

**リクエスト例**:

```bash
DELETE /api/favorites/dQw4w9WgXcQ?userId=user123
```

**レスポンス例**:

```json
{
  "success": true,
  "message": "動画をお気に入りから削除しました"
}
```

## 検索履歴エンドポイント

### 検索履歴取得

ユーザーの検索履歴を取得します。

**エンドポイント**: `GET /api/search-history`

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 | デフォルト |
|-----------|------|----------|-------------|---------|
| `userId` | string | はい | ユーザー識別子 | - |
| `limit` | integer | いいえ | 最大結果数 (1-50) | 10 |
| `category` | string | いいえ | カテゴリでフィルター | - |

**リクエスト例**:

```bash
GET /api/search-history?userId=user123&limit=5&category=gameplay
```

**レスポンス例**:

```json
{
  "success": true,
  "history": [
    {
      "query": "eFootball 2024",
      "category": "gameplay",
      "timestamp": "2024-01-20T15:45:00Z",
      "resultCount": 25
    }
  ],
  "recentQueries": ["eFootball 2024", "PES マスターリーグ", "サッカー戦術"],
  "statistics": {
    "totalSearches": 150,
    "categoryCounts": {
      "gameplay": 60,
      "tips": 45,
      "review": 30,
      "news": 15
    },
    "averageResultCount": 23.5
  },
  "count": 1
}
```

### 検索履歴に追加

ユーザーの検索履歴に検索クエリを追加します。

**エンドポイント**: `POST /api/search-history`

**リクエストボディ**:

```json
{
  "userId": "user123",
  "query": "eFootball 2024",
  "category": "gameplay",
  "resultCount": 25
}
```

**レスポンス例**:

```json
{
  "success": true,
  "message": "検索クエリを履歴に追加しました",
  "searchHistory": {
    "query": "eFootball 2024",
    "category": "gameplay",
    "timestamp": "2024-01-20T15:45:00Z",
    "resultCount": 25
  }
}
```

### 検索履歴クリア

ユーザーのすべての検索履歴をクリアします。

**エンドポイント**: `DELETE /api/search-history`

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| `userId` | string | はい | ユーザー識別子 |

**リクエスト例**:

```bash
DELETE /api/search-history?userId=user123
```

**レスポンス例**:

```json
{
  "success": true,
  "message": "25件の検索履歴エントリをクリアしました",
  "deletedCount": 25
}
```

### 特定の検索エントリ削除

特定の検索履歴エントリを削除します。

**エンドポイント**: `DELETE /api/search-history/:timestamp`

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| `timestamp` | string | はい | 検索エントリの ISO タイムスタンプ |

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| `userId` | string | はい | ユーザー識別子 |

**リクエスト例**:

```bash
DELETE /api/search-history/2024-01-20T15:45:00Z?userId=user123
```

**レスポンス例**:

```json
{
  "success": true,
  "message": "検索履歴エントリを削除しました"
}
```

## エラーコード

| コード                | HTTP ステータス | 説明                         |
| --------------------- | --------------- | ---------------------------- |
| `VALIDATION_ERROR`    | 400             | リクエストバリデーション失敗 |
| `NOT_FOUND`           | 404             | リソースが見つかりません     |
| `CONFLICT`            | 409             | リソースが既に存在します     |
| `RATE_LIMIT_EXCEEDED` | 429             | レート制限を超過しました     |
| `YOUTUBE_API_ERROR`   | 502             | YouTube API エラー           |
| `CACHE_ERROR`         | 503             | キャッシュサービス利用不可   |
| `DATABASE_ERROR`      | 503             | データベースサービス利用不可 |
| `INTERNAL_ERROR`      | 500             | 内部サーバーエラー           |

## データモデル

### 動画オブジェクト

```typescript
interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: {
    default: string;
    medium?: string;
    high?: string;
  };
  channelTitle: string;
  publishedAt: string; // ISO 8601 日付
  duration: string; // ISO 8601 期間 (PT10M30S)
  viewCount?: number;
  category?: string;
}
```

### お気に入りオブジェクト

```typescript
interface Favorite {
  videoId: string;
  video: Video;
  addedAt: string; // ISO 8601 日付
}
```

### 検索履歴オブジェクト

```typescript
interface SearchHistory {
  query: string;
  category?: string;
  timestamp: string; // ISO 8601 日付
  resultCount: number;
}
```

## SDK 例

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
});

// 動画検索
const searchVideos = async (query, category) => {
  try {
    const response = await api.get('/videos/search', {
      params: { q: query, category, maxResults: 10 },
    });
    return response.data;
  } catch (error) {
    console.error('検索失敗:', error.response?.data || error.message);
    throw error;
  }
};

// お気に入りに追加
const addToFavorites = async (userId, video) => {
  try {
    const response = await api.post('/favorites', { userId, video });
    return response.data;
  } catch (error) {
    console.error('お気に入り追加失敗:', error.response?.data || error.message);
    throw error;
  }
};
```

### Python

```python
import requests
import json

class YouTubeEFootballAPI:
    def __init__(self, base_url="http://localhost:3001/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.timeout = 10

    def search_videos(self, query=None, category=None, max_results=25):
        params = {"maxResults": max_results}
        if query:
            params["q"] = query
        if category:
            params["category"] = category

        response = self.session.get(f"{self.base_url}/videos/search", params=params)
        response.raise_for_status()
        return response.json()

    def add_to_favorites(self, user_id, video):
        data = {"userId": user_id, "video": video}
        response = self.session.post(f"{self.base_url}/favorites", json=data)
        response.raise_for_status()
        return response.json()
```

## テスト

### ヘルスチェック

```bash
curl -X GET http://localhost:3001/health
```

### 動画検索

```bash
curl -X GET "http://localhost:3001/api/videos/search?q=eFootball&category=gameplay&maxResults=5"
```

### お気に入りに追加

```bash
curl -X POST http://localhost:3001/api/favorites \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "video": {
      "id": "dQw4w9WgXcQ",
      "title": "テスト動画",
      "description": "テスト説明",
      "thumbnail": {
        "default": "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg"
      },
      "channelTitle": "テストチャンネル",
      "publishedAt": "2024-01-15T10:30:00Z",
      "duration": "PT10M30S",
      "viewCount": 1000,
      "category": "gameplay"
    }
  }'
```

## 変更履歴

### v1.0.0 (2024-01-20)

- 初回 API リリース
- 動画検索、お気に入り、検索履歴エンドポイント
- レート制限とキャッシュ実装
- 包括的なエラーハンドリング

---

詳細については、[メイン README](../README.md) または開発チームにお問い合わせください。
