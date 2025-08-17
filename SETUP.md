# クイックセットアップガイド

このガイドでは、YouTube eFootball Player アプリケーションをローカルで実行するための段階的な手順を提供します。

## 🚀 クイックスタート（5 分）

### 前提条件

- Docker と Docker Compose がインストール済み
- YouTube Data API v3 キー（[こちらで取得](https://developers.google.com/youtube/v3/getting-started)）

### セットアップ手順

1. **クローンと設定**

   ```bash
   git clone <repository-url>
   cd youtube-eafc-player
   cp .env.example .env
   ```

2. **YouTube API キーを追加**

   ```bash
   # .envファイルを編集して追加:
   YOUTUBE_API_KEY=your_actual_api_key_here
   ```

3. **アプリケーションを起動**

   ```bash
   docker-compose up --build
   ```

4. **データベースを初期化**

   ```bash
   # 新しいターミナルで
   ./scripts/init-localstack.sh
   ```

5. **アプリケーションにアクセス**
   - フロントエンド: <http://localhost:3000>
   - バックエンド API: <http://localhost:3001>
   - API ヘルスチェック: <http://localhost:3001/health>

## 🔧 開発セットアップ

### 手動セットアップ（Docker なし）

1. **依存関係をインストール**

   ```bash
   # フロントエンド
   cd frontend && npm install && cd ..

   # バックエンド
   cd backend && npm install && cd ..
   ```

2. **サービスを手動で起動**

   ```bash
   # ターミナル1: Redisを起動
   redis-server

   # ターミナル2: LocalStackを起動
   localstack start

   # ターミナル3: バックエンドを起動
   cd backend && npm run dev

   # ターミナル4: フロントエンドを起動
   cd frontend && npm run dev
   ```

3. **データベースを初期化**
   ```bash
   ./scripts/init-localstack.sh
   ```

## 🧪 テスト

```bash
# 全テストを実行
npm test

# 特定のテストスイートを実行
cd frontend && npm test
cd backend && npm test
cd tests && npm run test:e2e
```

## 🚀 本番デプロイメント

詳細な本番デプロイメント手順については [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

### AWS へのクイックデプロイ

1. **前提条件**

   - AWS CLI が設定済み
   - AWS CDK がインストール済み (`npm install -g aws-cdk`)

2. **デプロイ**
   ```bash
   cd infrastructure
   npm install
   ./scripts/deploy.sh prod
   ```

## 🆘 トラブルシューティング

### よくある問題

**ポート競合:**

```bash
# 必要なポートで実行中のプロセスを終了
sudo lsof -ti:3000,3001,6379,4566 | xargs kill -9
```

**Docker 問題:**

```bash
# Docker環境をクリーンアップ
docker-compose down -v --remove-orphans
docker system prune -a
docker-compose up --build
```

**API キー問題:**

- YouTube API キーが有効であることを確認
- Google Cloud Console でクォータ制限を確認
- キーで YouTube Data API v3 が有効になっていることを確認

詳細なトラブルシューティングについては [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) を参照してください。

## 📚 ドキュメント

- [API ドキュメント](./docs/API.md)
- [開発ガイド](./docs/DEVELOPMENT.md)
- [テストガイド](./docs/TESTING.md)
- [デプロイメントガイド](./DEPLOYMENT.md)
- [トラブルシューティング](./docs/TROUBLESHOOTING.md)

## 🤝 コントリビューション

1. リポジトリをフォーク
2. フィーチャーブランチを作成
3. 変更を加える
4. テストを追加
5. プルリクエストを送信

詳細なコントリビューションガイドラインについては [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) を参照してください。

---

**ヘルプが必要ですか？** GitHub リポジトリでイシューを作成するか、上記のドキュメントリンクを確認してください。
