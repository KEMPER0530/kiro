# 開発ガイド

このガイドでは、YouTube eFootball Player アプリケーションで作業する開発者向けの包括的な情報を提供します。

## 🛠️ 開発環境セットアップ

### 前提条件

- **Node.js 18+** と npm
- **Docker** と Docker Compose
- **Git** バージョン管理用
- **YouTube Data API v3 キー**
- **コードエディタ** （VS Code 推奨）

### 初期セットアップ

1. **リポジトリをクローン**

   ```bash
   git clone <repository-url>
   cd youtube-eafc-player
   ```

2. **依存関係をインストール**

   ```bash
   # ルート依存関係
   npm install

   # フロントエンド依存関係
   cd frontend && npm install && cd ..

   # バックエンド依存関係
   cd backend && npm install && cd ..

   # インフラストラクチャ依存関係
   cd infrastructure && npm install && cd ..

   # テスト依存関係
   cd tests && npm install && cd ..
   ```

3. **環境設定**

   ```bash
   cp .env.example .env
   # .envファイルをYouTube APIキーで編集
   ```

4. **開発環境を起動**

   ```bash
   docker-compose up --build
   ```

5. **LocalStack を初期化**
   ```bash
   ./scripts/init-localstack.sh
   ```

## 🏗️ プロジェクトアーキテクチャ

### ディレクトリ構造

```text
├── frontend/                    # React.jsフロントエンド
│   ├── src/
│   │   ├── components/         # 再利用可能なReactコンポーネント
│   │   ├── hooks/             # カスタムReactフック
│   │   ├── pages/             # ページコンポーネント
│   │   ├── types/             # TypeScript型定義
│   │   ├── utils/             # ユーティリティ関数
│   │   ├── contexts/          # Reactコンテキスト
│   │   └── styles/            # CSSスタイル
│   ├── public/                # 静的アセット
│   └── __tests__/             # コンポーネントテスト
├── backend/                     # Node.js/Expressバックエンド
│   ├── src/
│   │   ├── config/            # 設定ファイル
│   │   ├── middleware/        # Expressミドルウェア
│   │   ├── models/            # データモデル
│   │   ├── repositories/      # データアクセス層
│   │   ├── routes/            # APIルート
│   │   ├── services/          # ビジネスロジック
│   │   └── scripts/           # ユーティリティスクリプト
│   └── __tests__/             # APIテスト
├── infrastructure/             # AWS CDKインフラストラクチャ
│   ├── lib/                   # CDKコンストラクト
│   ├── bin/                   # CDKアプリ
│   └── scripts/               # デプロイメントスクリプト
└── tests/                      # 統合・E2Eテスト
    ├── e2e/                   # エンドツーエンドテスト
    ├── integration/           # 統合テスト
    └── docker/                # テスト用Docker設定
```

### 技術スタック

#### フロントエンド

- **React 18** 関数コンポーネントとフックを使用
- **TypeScript** 型安全性のため
- **Vite** 高速開発とビルド用
- **TailwindCSS** スタイリング用
- **React Router** クライアントサイドルーティング用
- **Axios** HTTP リクエスト用
- **anime.js** アニメーション用
- **Chart.js** データ可視化用

#### バックエンド

- **Node.js** Express.js フレームワーク付き
- **TypeScript** 型安全性のため
- **Joi** リクエストバリデーション用
- **Jest** テスト用
- **YouTube Data API v3** 動画データ用

#### データベース & キャッシュ

- **DynamoDB** 永続ストレージ用
- **Redis** キャッシュ用
- **LocalStack** ローカル AWS サービスエミュレーション用

## 🔧 開発ワークフロー

### コードスタイルと標準

#### TypeScript 設定

- 厳密モード有効
- ESLint と Prettier 設定済み
- クリーンなインポート用のパスマッピング

#### 命名規則

- **コンポーネント**: PascalCase (`VideoPlayer.tsx`)
- **フック**: `use`プレフィックス付き camelCase (`useVideoSearch.ts`)
- **ユーティリティ**: camelCase (`formatDuration.ts`)
- **定数**: UPPER_SNAKE_CASE (`API_ENDPOINTS`)

#### ファイル構成

```typescript
// コンポーネント構造
export interface ComponentProps {
  // Props インターフェース
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // フック
  // イベントハンドラー
  // レンダリングロジック

  return (
    // JSX
  );
};

export default Component;
```

### Git ワークフロー

#### ブランチ命名

- `feature/description` - 新機能
- `bugfix/description` - バグ修正
- `hotfix/description` - 緊急修正
- `refactor/description` - コードリファクタリング

#### コミットメッセージ

従来のコミット形式に従う：

```text
type(scope): description

feat(search): カテゴリフィルタリングを追加
fix(player): 動画読み込み問題を解決
docs(api): エンドポイントドキュメントを更新
test(favorites): 統合テストを追加
```

#### プルリクエストプロセス

1. `develop`からフィーチャーブランチを作成
2. テスト付きで変更を実装
3. 必要に応じてドキュメントを更新
4. `develop`ブランチに PR を作成
5. コードレビューと承認
6. `develop`にマージ
7. テスト用にステージングにデプロイ
8. 本番用に`main`にマージ

## 🧪 テスト戦略

### ユニットテスト

#### フロントエンドテスト

```bash
cd frontend
npm test                    # 全テストを実行
npm test -- --watch       # ウォッチモード
npm test -- --coverage    # カバレッジレポート
```

コンポーネントテスト例：

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchComponent } from './SearchComponent';

describe('SearchComponent', () => {
  it('フォーム送信時にonSearchを呼び出すべき', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchComponent onSearch={mockOnSearch} loading={false} />);

    const input = screen.getByPlaceholderText('動画を検索...');
    const button = screen.getByRole('button', { name: /検索/i });

    await userEvent.type(input, 'eFootball');
    await userEvent.click(button);

    expect(mockOnSearch).toHaveBeenCalledWith('eFootball', undefined);
  });
});
```

#### バックエンドテスト

```bash
cd backend
npm test                    # 全テストを実行
npm test -- --watch       # ウォッチモード
npm test -- --coverage    # カバレッジレポート
```

API テスト例：

```javascript
const request = require('supertest');
const app = require('../src/index');

describe('GET /api/videos/search', () => {
  it('検索結果を返すべき', async () => {
    const response = await request(app)
      .get('/api/videos/search')
      .query({ q: 'eFootball', maxResults: 5 })
      .expect(200);

    expect(response.body).toHaveProperty('videos');
    expect(response.body.videos).toHaveLength(5);
  });
});
```

### 統合テスト

```bash
cd tests
npm run test:integration
```

### エンドツーエンドテスト

```bash
cd tests
npm run test:e2e
```

E2E テスト例：

```javascript
const { test, expect } = require('@playwright/test');

test('動画検索と再生フロー', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // 動画を検索
  await page.fill('[data-testid="search-input"]', 'eFootball');
  await page.click('[data-testid="search-button"]');

  // 結果を待機
  await page.waitForSelector('[data-testid="video-list"]');

  // 最初の動画をクリック
  await page.click('[data-testid="video-item"]:first-child');

  // プレイヤーが読み込まれることを確認
  await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
});
```

## 🔍 デバッグ

### フロントエンドデバッグ

#### ブラウザ開発者ツール

- React Developer Tools 拡張機能を使用
- API 呼び出しについては Network タブを確認
- ログ用に Console を使用
- ブレークポイント用に Sources タブを使用

#### VS Code デバッグ

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "フロントエンドをデバッグ",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/node_modules/.bin/vite",
      "args": ["--mode", "development"],
      "console": "integratedTerminal"
    }
  ]
}
```

### バックエンドデバッグ

#### Node.js デバッグ

```bash
# デバッガー付きで起動
npm run dev:debug

# またはVS Codeで
node --inspect-brk src/index.js
```

#### curl で API テスト

```bash
# 検索エンドポイントをテスト
curl -X GET "http://localhost:3001/api/videos/search?q=eFootball&maxResults=5"

# お気に入りエンドポイントをテスト
curl -X POST http://localhost:3001/api/favorites \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","video":{...}}'
```

### データベースデバッグ

#### LocalStack DynamoDB

```bash
# テーブルをリスト
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# テーブルをスキャン
aws --endpoint-url=http://localhost:4566 dynamodb scan --table-name efootball-favorites

# アイテムをクエリ
aws --endpoint-url=http://localhost:4566 dynamodb query \
  --table-name efootball-favorites \
  --key-condition-expression "userId = :userId" \
  --expression-attribute-values '{":userId":{"S":"test-user"}}'
```

#### Redis デバッグ

```bash
# Redisに接続
docker exec -it youtube-eafc-player_redis_1 redis-cli

# キーをリスト
KEYS *

# キャッシュされたデータを取得
GET search:eFootball:gameplay:25
```

## 🚀 パフォーマンス最適化

### フロントエンド最適化

#### コード分割

```typescript
// コンポーネントを遅延読み込み
const LazyStatsChart = lazy(() => import('./StatsChart'));

// Suspenseを使用
<Suspense fallback={<LoadingSpinner />}>
  <LazyStatsChart data={chartData} />
</Suspense>;
```

#### メモ化

```typescript
// 高コストな計算をメモ化
const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);

// コールバックをメモ化
const memoizedCallback = useCallback(
  (id: string) => {
    onVideoSelect(id);
  },
  [onVideoSelect]
);
```

#### バンドル分析

```bash
cd frontend
npm run build
npm run analyze
```

### バックエンド最適化

#### キャッシュ戦略

```javascript
// 検索結果をキャッシュ
const cacheKey = `search:${query}:${category}:${maxResults}`;
const cachedResult = await redis.get(cacheKey);

if (cachedResult) {
  return JSON.parse(cachedResult);
}

const result = await youtubeService.searchVideos(query, category, maxResults);
await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5分間
```

#### データベース最適化

```javascript
// DynamoDBのバッチ操作を使用
const batchWriteParams = {
  RequestItems: {
    [tableName]: items.map((item) => ({
      PutRequest: { Item: item },
    })),
  },
};
await dynamodb.batchWrite(batchWriteParams).promise();
```

## 🔐 セキュリティベストプラクティス

### フロントエンドセキュリティ

- ユーザー入力をサニタイズ
- 本番環境で HTTPS を使用
- Content Security Policy を実装
- API からのデータを検証

### バックエンドセキュリティ

- Joi による入力バリデーション
- レート制限
- CORS 設定
- セキュリティヘッダー
- API キー保護

### 環境変数

```bash
# 機密データは絶対にコミットしない
YOUTUBE_API_KEY=your_secret_key

# 異なる環境には異なるキーを使用
YOUTUBE_API_KEY_DEV=dev_key
YOUTUBE_API_KEY_PROD=prod_key
```

## 📊 モニタリングとログ

### 開発ログ

```typescript
// 構造化ログを使用
const logger = {
  info: (message: string, meta?: object) => {
    console.log(
      JSON.stringify({
        level: 'info',
        message,
        ...meta,
        timestamp: new Date().toISOString(),
      })
    );
  },
  error: (message: string, error?: Error, meta?: object) => {
    console.error(
      JSON.stringify({
        level: 'error',
        message,
        error: error?.message,
        stack: error?.stack,
        ...meta,
        timestamp: new Date().toISOString(),
      })
    );
  },
};
```

### パフォーマンスモニタリング

```typescript
// APIレスポンス時間を測定
const startTime = Date.now();
const result = await apiCall();
const duration = Date.now() - startTime;
logger.info('API呼び出し完了', { duration, endpoint: '/api/videos/search' });
```

## 🔄 開発スクリプト

### package.json スクリプト

```json
{
  "scripts": {
    "dev": "docker-compose up --build",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "test": "npm run test:frontend && npm run test:backend",
    "test:frontend": "cd frontend && npm test",
    "test:backend": "cd backend && npm test",
    "test:e2e": "cd tests && npm run test:e2e",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build",
    "lint": "npm run lint:frontend && npm run lint:backend",
    "lint:frontend": "cd frontend && npm run lint",
    "lint:backend": "cd backend && npm run lint",
    "deploy:dev": "cd infrastructure && ./scripts/deploy.sh dev",
    "deploy:prod": "cd infrastructure && ./scripts/deploy.sh prod"
  }
}
```

## 🤝 コントリビューションガイドライン

### コードレビューチェックリスト

- [ ] コードがスタイルガイドラインに従っている
- [ ] テストが含まれ、パスしている
- [ ] ドキュメントが更新されている
- [ ] コミットに機密データが含まれていない
- [ ] パフォーマンスへの影響が考慮されている
- [ ] セキュリティへの影響がレビューされている

### プルリクエストテンプレート

```markdown
## 説明

変更の簡潔な説明

## 変更の種類

- [ ] バグ修正
- [ ] 新機能
- [ ] 破壊的変更
- [ ] ドキュメント更新

## テスト

- [ ] ユニットテストがパス
- [ ] 統合テストがパス
- [ ] 手動テストが完了

## チェックリスト

- [ ] コードがスタイルガイドラインに従っている
- [ ] セルフレビューが完了
- [ ] ドキュメントが更新されている
- [ ] 破壊的変更がない
```

## 📚 リソース

### ドキュメント

- [React ドキュメント](https://ja.react.dev/)
- [TypeScript ハンドブック](https://www.typescriptlang.org/ja/docs/)
- [Express.js ガイド](https://expressjs.com/ja/)
- [AWS CDK ドキュメント](https://docs.aws.amazon.com/ja_jp/cdk/)
- [YouTube Data API](https://developers.google.com/youtube/v3?hl=ja)

### ツール

- [VS Code 拡張機能](https://marketplace.visualstudio.com/vscode)
- [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools)
- [Postman](https://www.postman.com/) API テスト用
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

---

詳細については、[メイン README](../README.md) または [API ドキュメント](./API.md) を参照してください。
