# YouTube eFootball Player - テストスイート

このディレクトリには、YouTube eFootball Player アプリケーションの統合テストと E2E テストが含まれています。

## テストの種類

### 1. 統合テスト (`integration/`)

- フロントエンドとバックエンド API の統合テスト
- YouTube API 統合のテスト
- お気に入り機能の統合テスト
- 検索履歴機能の統合テスト
- エラーハンドリングの統合テスト
- キャッシュ機能の統合テスト

### 2. E2E テスト (`e2e/`)

- 動画検索フローのテスト
- 動画プレイヤーフローのテスト
- お気に入り機能フローのテスト
- ナビゲーションフローのテスト

## 前提条件

### 必要なソフトウェア

- Docker & Docker Compose
- Node.js 18+
- npm

### 環境変数

```bash
export YOUTUBE_API_KEY="your-youtube-api-key"
```

## テストの実行方法

### 1. すべてのテストを実行

```bash
# 統合テスト + E2Eテストを実行
./scripts/run-all-tests.sh
```

### 2. 統合テストのみ実行

```bash
./scripts/run-all-tests.sh --integration-only
```

### 3. E2E テストのみ実行

```bash
./scripts/run-all-tests.sh --e2e-only
```

### 4. ローカル環境でのテスト実行

#### 統合テスト

```bash
# 依存関係をインストール
npm install

# LocalStackとRedisを起動
docker-compose -f docker/docker-compose.test.yml up -d localstack redis

# DynamoDBテーブルを作成
node scripts/setup-localstack.js

# バックエンドとフロントエンドを起動（別ターミナル）
cd ../backend && npm run dev
cd ../frontend && npm run dev

# 統合テストを実行
npm run test:integration
```

#### E2E テスト

```bash
# Playwrightをインストール
cd e2e
npm install
npx playwright install

# バックエンドとフロントエンドが起動していることを確認

# E2Eテストを実行
npm run test:e2e
```

## Docker 環境でのテスト実行

### 完全な Docker 環境でのテスト

```bash
# すべてのサービスをDockerで起動してテスト実行
npm run test:docker

# 統合テストのみ
npm run test:docker:integration

# E2Eテストのみ
npm run test:docker:e2e
```

### テスト環境のクリーンアップ

```bash
npm run cleanup:docker
```

## テスト設定

### 統合テスト設定

- **テストフレームワーク**: Jest
- **HTTP クライアント**: Axios
- **タイムアウト**: 60 秒
- **バックエンド URL**: http://localhost:3001
- **フロントエンド URL**: http://localhost:5174

### E2E テスト設定

- **テストフレームワーク**: Playwright
- **ブラウザ**: Chromium, Firefox, WebKit
- **ベース URL**: http://localhost:5174
- **スクリーンショット**: 失敗時のみ
- **動画録画**: 失敗時のみ保持

## テストデータ

### テスト用 DynamoDB テーブル

- `efootball-favorites-test`: お気に入り機能のテスト用
- `efootball-search-history-test`: 検索履歴機能のテスト用

### テスト用ユーザー ID

- 統合テスト: `integration-test-user`
- E2E テスト: `e2e-test-user`

## トラブルシューティング

### よくある問題

#### 1. LocalStack に接続できない

```bash
# LocalStackの状態を確認
docker-compose -f docker/docker-compose.test.yml logs localstack

# LocalStackを再起動
docker-compose -f docker/docker-compose.test.yml restart localstack
```

#### 2. YouTube API 制限エラー

- YouTube API Key が正しく設定されているか確認
- API 制限に達していないか確認
- テスト実行頻度を調整

#### 3. ポート競合エラー

```bash
# 使用中のポートを確認
lsof -i :3001
lsof -i :5174
lsof -i :4566
lsof -i :6380

# 競合するプロセスを停止
```

#### 4. Docker メモリ不足

```bash
# Dockerのメモリ制限を確認・調整
docker system prune -a
```

### ログの確認

```bash
# 統合テストのログ
docker-compose -f docker/docker-compose.test.yml logs integration-tests

# E2Eテストのログ
docker-compose -f docker/docker-compose.test.yml logs e2e-tests

# バックエンドのログ
docker-compose -f docker/docker-compose.test.yml logs backend-test

# フロントエンドのログ
docker-compose -f docker/docker-compose.test.yml logs frontend-test
```

## CI/CD 統合

### GitHub Actions 例

```yaml
name: Integration and E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        env:
          YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
        run: |
          cd tests
          ./scripts/run-all-tests.sh
```

## 貢献

新しいテストを追加する場合：

1. 統合テストは `integration/` ディレクトリに追加
2. E2E テストは `e2e/specs/` ディレクトリに追加
3. テストファイル名は `*.test.js` または `*.spec.js` で終わる
4. 適切なクリーンアップ処理を含める
5. テストの説明とコメントを追加
