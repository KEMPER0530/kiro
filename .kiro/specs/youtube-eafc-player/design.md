# 設計ドキュメント

## 概要

eFootball関連YouTube動画を検索・再生するWebアプリケーションです。React.jsをフロントエンド、Node.js/Expressをバックエンドとして使用し、YouTube Data API v3を活用してeFootball関連コンテンツの検索・表示・再生機能を提供します。

## アーキテクチャ

### システム構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  External APIs  │
│ (React.js/S3)   │◄──►│(Node.js/Lambda) │◄──►│  YouTube API v3 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │     Redis       │
         │              │   (キャッシュ)   │
         │              └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   LocalStack    │    │   DynamoDB      │
│   (開発環境)     │    │ (お気に入り)     │
└─────────────────┘    └─────────────────┘
```

### 技術スタック

- **フロントエンド**: React.js, React Router, Axios, TailwindCSS, anime.js, Chart.js
- **バックエンド**: Node.js, Express.js, YouTube Data API v3
- **データベース**: DynamoDB (LocalStack for development)
- **キャッシュ**: Redis (ElastiCache for production)
- **コンテナ**: Docker, Docker Compose
- **動画プレイヤー**: YouTube Embedded Player API
- **インフラ**: AWS CDK (TypeScript)
- **デプロイ**: Frontend (S3 + CloudFront), Backend (Lambda Container + API Gateway)

## コンポーネントとインターフェース

### フロントエンドコンポーネント

#### 1. App Component
- ルーティング管理
- グローバル状態管理
- ナビゲーション制御

#### 2. SearchComponent
```javascript
interface SearchProps {
  onSearch: (query: string, category?: string) => void;
  loading: boolean;
}
```

#### 3. VideoListComponent
```javascript
interface VideoListProps {
  videos: Video[];
  onVideoSelect: (videoId: string) => void;
  onFavoriteToggle: (video: Video) => void;
}
```

#### 4. VideoPlayerComponent
```javascript
interface VideoPlayerProps {
  videoId: string;
  onVideoEnd: () => void;
  onError: (error: string) => void;
}
```

#### 5. FavoritesComponent
```javascript
interface FavoritesProps {
  favorites: Video[];
  onVideoSelect: (videoId: string) => void;
  onRemoveFavorite: (videoId: string) => void;
}
```

#### 6. CategoryFilterComponent
```javascript
interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}
```

### バックエンドAPI エンドポイント

#### 1. 動画検索API
```
GET /api/videos/search
Query Parameters:
- q: 検索クエリ
- category: カテゴリフィルター
- maxResults: 最大結果数（デフォルト: 25）
```

#### 2. 人気動画取得API
```
GET /api/videos/popular
Query Parameters:
- category: カテゴリフィルター
- maxResults: 最大結果数（デフォルト: 25）
```

#### 3. 関連動画取得API
```
GET /api/videos/related/:videoId
Parameters:
- videoId: 基準となる動画ID
```

## データモデル

### Video Model
```javascript
interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: {
    default: string;
    medium: string;
    high: string;
  };
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  category: string;
}
```

### Category Model
```javascript
interface Category {
  id: string;
  name: string;
  searchTerms: string[];
}
```

### Favorite Model
```javascript
interface Favorite {
  videoId: string;
  addedAt: string;
  video: Video;
}
```

## エラーハンドリング

### フロントエンド エラー処理

1. **API通信エラー**
   - ネットワークエラー時の再試行機能
   - ユーザーフレンドリーなエラーメッセージ表示
   - オフライン状態の検知と通知

2. **動画再生エラー**
   - 動画が利用できない場合の代替提案
   - プレイヤー初期化失敗時の再試行
   - 地域制限による再生不可の通知

3. **データ保存エラー**
   - ローカルストレージ容量不足の処理
   - お気に入り保存失敗時の通知

### バックエンド エラー処理

1. **YouTube API エラー**
   - API制限超過時の適切なレスポンス
   - 無効なAPIキーの処理
   - レート制限の管理

2. **データ検証エラー**
   - 不正なリクエストパラメータの検証
   - SQLインジェクション対策（該当する場合）

## テスト戦略

### 単体テスト
- **フロントエンド**: Jest + React Testing Library
  - コンポーネントの描画テスト
  - ユーザーインタラクションテスト
  - 状態管理テスト

- **バックエンド**: Jest + Supertest
  - API エンドポイントテスト
  - YouTube API統合テスト
  - エラーハンドリングテスト

### 統合テスト
- フロントエンドとバックエンドの連携テスト
- YouTube API との実際の通信テスト
- お気に入り機能の永続化テスト

### E2Eテスト
- Cypress を使用したエンドツーエンドテスト
- 主要ユーザーフローのテスト
  - 検索 → 動画選択 → 再生
  - お気に入り追加 → お気に入り一覧 → 再生
  - カテゴリフィルタリング

### パフォーマンステスト
- 大量の検索結果表示時のパフォーマンス
- 動画プレイヤーの読み込み速度
- API レスポンス時間の測定

## セキュリティ考慮事項

1. **API キー保護**
   - YouTube API キーの環境変数管理
   - フロントエンドでのAPI キー露出防止

2. **CORS設定**
   - 適切なCORS ポリシーの設定
   - 信頼できるドメインからのアクセスのみ許可

3. **入力検証**
   - XSS攻撃対策
   - 検索クエリのサニタイゼーション

4. **レート制限**
   - YouTube API の使用量制限遵守
   - ユーザーごとのリクエスト制限

## 実装の詳細設計

### カテゴリ分類ロジック
eFootball関連動画を以下のカテゴリに自動分類：

```javascript
const categories = {
  gameplay: {
    name: "ゲームプレイ",
    searchTerms: ["gameplay", "プレイ", "実況", "対戦"]
  },
  tips: {
    name: "攻略・コツ",
    searchTerms: ["攻略", "コツ", "tips", "tutorial", "解説"]
  },
  review: {
    name: "レビュー",
    searchTerms: ["レビュー", "review", "評価", "感想"]
  },
  news: {
    name: "ニュース",
    searchTerms: ["ニュース", "news", "アップデート", "最新"]
  }
};
```

### お気に入り機能の実装
- DynamoDB（LocalStack）を使用した永続化
- 重複チェック機能
- お気に入り数の制限（最大100件）
- ユーザーIDベースの管理

### 検索機能の最適化
- eFootball関連キーワードの自動付加
- Redisを使用した検索結果キャッシュ（5分間）
- DynamoDBでの検索履歴保存（最大10件）

### Docker環境構成
```yaml
# docker-compose.yml 構成
services:
  - frontend: React.js アプリケーション
  - backend: Node.js/Express API
  - localstack: DynamoDB, S3 エミュレーション
  - redis: キャッシュサーバー
```

### フロントエンド追加機能
- **TailwindCSS**: レスポンシブデザインとユーティリティクラス
- **anime.js**: スムーズなアニメーション効果
- **Chart.js**: 視聴統計やお気に入り動画の分析グラフ

### DynamoDB テーブル設計
```javascript
// Favorites Table
{
  TableName: "efootball-favorites",
  PartitionKey: "userId",
  SortKey: "videoId",
  Attributes: {
    userId: "string",
    videoId: "string", 
    video: "object",
    addedAt: "string"
  }
}

// Search History Table
{
  TableName: "efootball-search-history",
  PartitionKey: "userId",
  SortKey: "timestamp",
  Attributes: {
    userId: "string",
    query: "string",
    timestamp: "string"
  }
}
```

### AWS CDK インフラ構成

#### CDK スタック構成
```typescript
// lib/efootball-app-stack.ts
export class EfootballAppStack extends Stack {
  // Frontend Stack
  - S3 Bucket (Static Website Hosting)
  - CloudFront Distribution
  - Route53 (Custom Domain)
  
  // Backend Stack  
  - Lambda Function (Container Image)
  - API Gateway (REST API)
  - DynamoDB Tables
  - ElastiCache Redis Cluster
  
  // Security & Monitoring
  - IAM Roles & Policies
  - CloudWatch Logs
  - AWS WAF (Web Application Firewall)
}
```

#### CDK デプロイメント環境
```typescript
// Development Environment
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-northeast-1'
};

// Production Environment  
const prodEnv = {
  account: process.env.PROD_ACCOUNT,
  region: 'ap-northeast-1'
};
```

#### Lambda Container 設定
```typescript
// Lambda Function with Container Image
const backendFunction = new Function(this, 'EfootballBackend', {
  code: Code.fromEcrImage(Repository.fromRepositoryName(this, 'BackendRepo', 'efootball-backend')),
  handler: Handler.FROM_IMAGE,
  runtime: Runtime.FROM_IMAGE,
  environment: {
    DYNAMODB_TABLE_FAVORITES: favoritesTable.tableName,
    DYNAMODB_TABLE_SEARCH_HISTORY: searchHistoryTable.tableName,
    REDIS_ENDPOINT: redisCluster.attrRedisEndpointAddress,
    YOUTUBE_API_KEY: youtubeApiKey.secretValue
  }
});
```

#### CI/CD パイプライン
```typescript
// CodePipeline for automated deployment
const pipeline = new Pipeline(this, 'EfootballPipeline', {
  stages: [
    {
      stageName: 'Source',
      actions: [sourceAction]
    },
    {
      stageName: 'Build',
      actions: [buildAction]
    },
    {
      stageName: 'Deploy-Dev',
      actions: [deployDevAction]
    },
    {
      stageName: 'Deploy-Prod',
      actions: [deployProdAction]
    }
  ]
});
```