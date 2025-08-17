# YouTube eFootball Player

eFootball 関連の YouTube 動画を検索、再生、管理するための包括的な Web アプリケーションです。React.js フロントエンド、Node.js バックエンドで構築され、AWS インフラストラクチャにデプロイされています。

## 🚀 機能

- **動画検索**: カテゴリフィルタリング付きの eFootball 関連 YouTube 動画検索
- **動画プレイヤー**: フルコントロールと関連動画提案機能付きの埋め込み YouTube プレイヤー
- **お気に入り管理**: 永続ストレージでお気に入り動画を保存・整理
- **検索履歴**: 統計情報付きの検索パターン追跡・分析
- **カテゴリフィルタリング**: カテゴリ別動画閲覧（ゲームプレイ、攻略、レビュー、ニュース）
- **統計ダッシュボード**: Chart.js 統合による視覚的分析
- **レスポンシブデザイン**: TailwindCSS によるモバイルフレンドリーなインターフェース
- **パフォーマンス最適化**: Redis キャッシュと最適化された API レスポンス

## 📁 プロジェクト構造

```text
├── frontend/                    # React.jsフロントエンドアプリケーション
│   ├── src/
│   │   ├── components/         # Reactコンポーネント
│   │   ├── hooks/             # カスタムReactフック
│   │   ├── pages/             # ページコンポーネント
│   │   ├── types/             # TypeScript型定義
│   │   ├── utils/             # ユーティリティ関数
│   │   └── styles/            # CSSスタイル
│   ├── Dockerfile             # フロントエンドDocker設定
│   └── package.json           # フロントエンド依存関係
├── backend/                     # Node.js/Expressバックエンド API
│   ├── src/
│   │   ├── config/            # 設定ファイル
│   │   ├── middleware/        # Expressミドルウェア
│   │   ├── models/            # データモデル
│   │   ├── repositories/      # データアクセス層
│   │   ├── routes/            # APIルート
│   │   ├── services/          # ビジネスロジック
│   │   └── scripts/           # ユーティリティスクリプト
│   ├── Dockerfile             # バックエンドDocker設定
│   └── package.json           # バックエンド依存関係
├── infrastructure/             # AWS CDKインフラストラクチャコード
│   ├── lib/                   # CDKコンストラクトとスタック
│   ├── scripts/               # デプロイメントスクリプト
│   └── bin/                   # CDKアプリエントリーポイント
├── tests/                      # テストスイート
│   ├── e2e/                   # エンドツーエンドテスト
│   ├── integration/           # 統合テスト
│   └── docker/                # テスト用Docker設定
├── scripts/                    # ユーティリティスクリプト
├── docker-compose.yml          # Docker Compose設定
└── .env.example               # 環境変数テンプレート
```

## 🛠️ 技術スタック

### フロントエンド

- **React.js 18** - フックと関数コンポーネントを使用したモダン React
- **TypeScript** - 型安全な JavaScript 開発
- **TailwindCSS** - ユーティリティファースト CSS フレームワーク
- **Vite** - 高速ビルドツールと開発サーバー
- **React Router** - クライアントサイドルーティング
- **Axios** - API 通信用 HTTP クライアント
- **anime.js** - スムーズなアニメーションとトランジション
- **Chart.js** - インタラクティブなデータ可視化
- **React Testing Library** - コンポーネントテスト

### バックエンド

- **Node.js** - JavaScript ランタイム
- **Express.js** - Web アプリケーションフレームワーク
- **YouTube Data API v3** - 動画検索とメタデータ
- **Joi** - データバリデーション
- **Jest** - テストフレームワーク
- **Supertest** - HTTP アサーションテスト

### データベース & キャッシュ

- **DynamoDB** - お気に入りと検索履歴用 NoSQL データベース
- **Redis** - API レスポンス用インメモリキャッシュ
- **LocalStack** - 開発用ローカル AWS サービスエミュレーション

### インフラストラクチャ & デプロイメント

- **AWS CDK** - Infrastructure as Code
- **AWS Lambda** - サーバーレスバックエンドホスティング
- **API Gateway** - REST API 管理
- **S3 + CloudFront** - フロントエンドホスティングと CDN
- **ElastiCache** - マネージド Redis サービス
- **Docker** - コンテナ化
- **GitHub Actions** - CI/CD パイプライン

## 🚀 クイックスタート

### 前提条件

- Node.js 18+ と npm
- Docker と Docker Compose
- YouTube Data API v3 キー
- AWS CLI（デプロイメント用）

### 開発環境セットアップ

1. **リポジトリをクローン**

   ```bash
   git clone <repository-url>
   cd youtube-eafc-player
   ```

2. **環境変数を設定**

   ```bash
   cp .env.example .env
   # .envファイルを編集してYouTube API キーを追加
   ```

3. **開発環境を起動**

   ```bash
   docker-compose up --build
   ```

4. **LocalStack DynamoDB テーブルを初期化**

   ```bash
   ./scripts/init-localstack.sh
   ```

5. **アプリケーションにアクセス**
   - フロントエンド: <http://localhost:3000>
   - バックエンド API: <http://localhost:3001>
   - LocalStack: <http://localhost:4566>
   - Redis: localhost:6379

### 本番デプロイメント

詳細なデプロイメント手順については [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

## 📚 ドキュメント

- [API ドキュメント](./docs/API.md) - 完全な API リファレンス
- [デプロイメントガイド](./DEPLOYMENT.md) - 本番デプロイメント手順
- [開発ガイド](./docs/DEVELOPMENT.md) - 開発セットアップとガイドライン
- [テストガイド](./docs/TESTING.md) - テスト戦略と実行方法

## 🧪 テスト

```bash
# 全テストを実行
npm run test

# フロントエンドテスト
cd frontend && npm test

# バックエンドテスト
cd backend && npm test

# E2Eテスト
cd tests && npm run test:e2e

# 統合テスト
cd tests && npm run test:integration
```

## 🔧 環境変数

| 変数名            | 説明                            | 必須   | デフォルト値           |
| ----------------- | ------------------------------- | ------ | ---------------------- |
| `YOUTUBE_API_KEY` | YouTube Data API v3 キー        | はい   | -                      |
| `NODE_ENV`        | 環境モード                      | いいえ | development            |
| `PORT`            | バックエンドサーバーポート      | いいえ | 3001                   |
| `REDIS_URL`       | Redis 接続 URL                  | いいえ | redis://localhost:6379 |
| `AWS_REGION`      | デプロイメント用 AWS リージョン | いいえ | ap-northeast-1         |

## 🤝 コントリビューション

1. リポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🆘 サポート

サポートと質問については：

- GitHub リポジトリでイシューを作成
- 一般的な解決策については [ドキュメント](./docs/) を確認
- [トラブルシューティングガイド](./docs/TROUBLESHOOTING.md) を確認

## 🎯 ロードマップ

- [ ] ユーザー認証とプロフィール
- [ ] 動画プレイリストとコレクション
- [ ] 高度な検索フィルター
- [ ] ソーシャル機能（共有、コメント）
- [ ] モバイルアプリ開発
- [ ] 多言語サポート
