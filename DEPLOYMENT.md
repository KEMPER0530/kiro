# デプロイメントガイド

このガイドでは、CDK を使用して YouTube eFootball Player アプリケーションを AWS にデプロイするための包括的な手順を提供します。

## 📋 前提条件

### 必要なツール

- **Node.js 18+** と npm
- **AWS CLI v2** 適切な認証情報で設定済み
- **AWS CDK v2** (`npm install -g aws-cdk`)
- **Docker** （コンテナイメージビルド用）
- **YouTube Data API v3 キー**

### AWS アカウント要件

- 適切な権限を持つ AWS アカウント
- 認証情報で設定された AWS CLI
- ターゲットリージョンでブートストラップされた CDK

### 必要な AWS 権限

AWS ユーザー/ロールには以下の権限が必要です：

- CloudFormation フルアクセス
- Lambda フルアクセス
- API Gateway フルアクセス
- DynamoDB フルアクセス
- S3 フルアクセス
- CloudFront フルアクセス
- ElastiCache フルアクセス
- IAM ロール作成と管理
- ECR リポジトリアクセス

## 🏗️ インフラストラクチャ概要

アプリケーションは以下の AWS リソースをデプロイします：

### フロントエンド

- **S3 バケット**: 静的ウェブサイトホスティング
- **CloudFront ディストリビューション**: グローバル CDN
- **Route53** (オプション): カスタムドメイン

### バックエンド

- **Lambda 関数**: コンテナ化された Node.js API
- **API Gateway**: REST API 管理
- **ECR リポジトリ**: コンテナイメージストレージ

### データベース & キャッシュ

- **DynamoDB テーブル**:
  - `efootball-favorites-{env}`: ユーザーお気に入り
  - `efootball-search-history-{env}`: 検索履歴
- **ElastiCache Redis**: API レスポンスキャッシュ

### セキュリティ & モニタリング

- **IAM ロール**: 最小権限アクセス
- **AWS WAF**: Web アプリケーションファイアウォール
- **CloudWatch**: ログとモニタリング

## 🚀 デプロイメント手順

### 1. 環境セットアップ

リポジトリをクローンして依存関係をインストール：

```bash
git clone <repository-url>
cd youtube-eafc-player
```

### 2. 環境変数の設定

各環境用の環境ファイルを作成：

```bash
# 開発環境
cp .env.example .env.dev
# 本番環境
cp .env.example .env.prod
```

適切な値で環境ファイルを編集：

```bash
# .env.dev
YOUTUBE_API_KEY=your_dev_api_key
NODE_ENV=development
AWS_REGION=ap-northeast-1

# .env.prod
YOUTUBE_API_KEY=your_prod_api_key
NODE_ENV=production
AWS_REGION=ap-northeast-1
```

### 3. AWS CLI 設定

認証情報で AWS CLI を設定：

```bash
aws configure
# またはAWSプロファイルを使用
aws configure --profile your-profile-name
export AWS_PROFILE=your-profile-name
```

AWS 設定を確認：

```bash
aws sts get-caller-identity
```

### 4. CDK ブートストラップ

ターゲットリージョンで CDK をブートストラップ（一回限りのセットアップ）：

```bash
cd infrastructure
npm install
npx cdk bootstrap
```

### 5. 開発環境デプロイメント

開発環境にデプロイ：

```bash
# デプロイメントスクリプトを使用
./scripts/deploy.sh dev --bootstrap

# または手動で
cd infrastructure
npm run build
npx cdk deploy YouTubeEfootballPlayer-dev --require-approval never
```

### 6. 本番環境デプロイメント

本番環境にデプロイ：

```bash
# 戦略付きデプロイメントスクリプトを使用
./scripts/deploy-with-strategy.sh prod --strategy=canary

# または手動で
cd infrastructure
npm run build
npx cdk deploy YouTubeEfootballPlayer-prod
```

## 🔧 デプロイメントスクリプト

### 基本デプロイメントスクリプト

標準デプロイメントには `infrastructure/scripts/deploy.sh` を使用：

```bash
# ブートストラップ付き開発デプロイメント
./scripts/deploy.sh dev --bootstrap

# 差分プレビュー付き本番デプロイメント
./scripts/deploy.sh prod --diff

# フロントエンドビルドをスキップ（既にビルド済みの場合）
./scripts/deploy.sh dev --no-build

# デプロイメントを自動承認
./scripts/deploy.sh prod --approve
```

### 高度なデプロイメントスクリプト

デプロイメント戦略付きの本番デプロイメントには `infrastructure/scripts/deploy-with-strategy.sh` を使用：

```bash
# カナリアデプロイメント（本番推奨）
./scripts/deploy-with-strategy.sh prod --strategy=canary

# リニアデプロイメント
./scripts/deploy-with-strategy.sh prod --strategy=linear

# 一括デプロイメント
./scripts/deploy-with-strategy.sh prod --strategy=all-at-once

# 前のバージョンにロールバック
./scripts/deploy-with-strategy.sh prod --rollback
```

## 🌍 環境設定

### 開発環境

開発環境には以下が含まれます：

- コスト最適化のための小さなインスタンスサイズ
- デバッグログ有効
- localhost 用 CORS 設定
- 開発用の緩和されたセキュリティ設定

`infrastructure/lib/config/environment.ts` での設定：

```typescript
export const devConfig = {
  environment: 'dev',
  lambda: {
    memorySize: 512,
    timeout: Duration.seconds(30),
  },
  dynamodb: {
    billingMode: BillingMode.PAY_PER_REQUEST,
  },
  redis: {
    nodeType: 'cache.t3.micro',
  },
};
```

### 本番環境

本番環境には以下が含まれます：

- パフォーマンス用に最適化されたインスタンスサイズ
- 本番ログ設定
- 厳格な CORS とセキュリティ設定
- オートスケーリング有効

`infrastructure/lib/config/environment.ts` での設定：

```typescript
export const prodConfig = {
  environment: 'prod',
  lambda: {
    memorySize: 1024,
    timeout: Duration.seconds(60),
  },
  dynamodb: {
    billingMode: BillingMode.PROVISIONED,
    readCapacity: 5,
    writeCapacity: 5,
  },
  redis: {
    nodeType: 'cache.t3.small',
    numCacheNodes: 2,
  },
};
```

## 🔐 セキュリティ設定

### IAM ロールとポリシー

CDK スタックは以下の IAM ロールを作成します：

1. **Lambda 実行ロール**

   - アプリケーションテーブルへの DynamoDB 読み書きアクセス
   - ElastiCache アクセス
   - CloudWatch Logs 書き込みアクセス
   - Secrets Manager 読み取りアクセス（API キー用）

2. **CloudFront Origin Access Identity**
   - 静的アセット用 S3 バケット読み取りアクセス

### AWS WAF 設定

Web アプリケーションファイアウォールルールには以下が含まれます：

- レート制限（5 分間に IP 当たり 100 リクエスト）
- 地理的制限（設定可能）
- 一般的な攻撃パターンブロック
- IP ホワイトリスト/ブラックリストサポート

### シークレット管理

機密設定は AWS Secrets Manager に保存：

```bash
# YouTube APIキーを保存
aws secretsmanager create-secret \
  --name "youtube-efootball/youtube-api-key" \
  --description "YouTube Data API v3 key" \
  --secret-string "your-api-key"
```

## 📊 モニタリングとログ

### CloudWatch ダッシュボード

デプロイメントは以下の CloudWatch ダッシュボードを作成：

- API Gateway メトリクス（リクエスト、レイテンシ、エラー）
- Lambda 関数メトリクス（呼び出し、実行時間、エラー）
- DynamoDB メトリクス（読み書き容量、スロットル）
- ElastiCache メトリクス（CPU、メモリ、接続）

### アラーム

CloudWatch アラームは以下に対して設定：

- 高エラー率（5 分間で 5%以上）
- 高レイテンシ（5 分間で 2 秒以上）
- DynamoDB スロットリング
- Lambda 関数エラー

### ログ集約

すべてのログは CloudWatch Log Groups に集約：

- `/aws/lambda/youtube-efootball-{env}-api`
- `/aws/apigateway/youtube-efootball-{env}`

## 🔄 CI/CD パイプライン

### GitHub Actions ワークフロー

`.github/workflows/deploy.yml` を作成：

```yaml
name: AWSにデプロイ

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy-dev:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: AWS認証情報を設定
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      - name: 開発環境にデプロイ
        run: |
          cd infrastructure
          npm ci
          npm run build
          npx cdk deploy YouTubeEfootballPlayer-dev --require-approval never

  deploy-prod:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: AWS認証情報を設定
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      - name: 本番環境にデプロイ
        run: |
          cd infrastructure
          npm ci
          npm run build
          npx cdk deploy YouTubeEfootballPlayer-prod
```

## 🧪 デプロイメント後テスト

### ヘルスチェック

デプロイメントをヘルスチェックで確認：

```bash
# APIヘルスチェック
curl https://api.your-domain.com/health

# フロントエンドアクセシビリティ
curl -I https://your-domain.com
```

### 統合テスト

デプロイされた環境に対して統合テストを実行：

```bash
cd tests
npm install
ENVIRONMENT=prod npm run test:integration
```

### 負荷テスト

Artillery などのツールで負荷テストを実行：

```bash
# Artilleryをインストール
npm install -g artillery

# 負荷テストを実行
artillery run tests/load/api-load-test.yml
```

## 🔧 トラブルシューティング

### 一般的なデプロイメント問題

1. **CDK ブートストラップが見つからない**

   ```bash
   Error: Need to perform AWS CDK bootstrap
   ```

   解決策: infrastructure ディレクトリで `npx cdk bootstrap` を実行

2. **権限不足**

   ```bash
   Error: User is not authorized to perform action
   ```

   解決策: AWS 認証情報と IAM 権限を確認

3. **Docker ビルド失敗**

   ```bash
   Error: Failed to build Docker image
   ```

   解決策: Docker が実行中で十分なリソースがあることを確認

4. **API Gateway タイムアウト**
   ```bash
   Error: Lambda function timeout
   ```
   解決策: CDK 設定で Lambda タイムアウトを増加

### ロールバック手順

#### 自動ロールバック

```bash
# デプロイメントスクリプトを使用してロールバック
./scripts/deploy-with-strategy.sh prod --rollback
```

#### 手動ロールバック

```bash
# CloudFormationスタックをリスト
aws cloudformation list-stacks

# 前のバージョンにロールバック
aws cloudformation cancel-update-stack --stack-name YouTubeEfootballPlayer-prod
```

### ログ分析

#### Lambda ログを表示

```bash
# 最新のログを取得
aws logs tail /aws/lambda/youtube-efootball-prod-api --follow

# エラーログをフィルター
aws logs filter-log-events \
  --log-group-name /aws/lambda/youtube-efootball-prod-api \
  --filter-pattern "ERROR"
```

#### API Gateway ログを表示

```bash
# API Gateway実行ログを取得
aws logs tail /aws/apigateway/youtube-efootball-prod --follow
```

## 💰 コスト最適化

### 開発環境

- 小さなインスタンスサイズを使用
- より低いしきい値でオートスケーリングを有効
- 該当する場合はスポットインスタンスを使用
- 請求アラートを設定

### 本番環境

- 使用パターンに基づいてインスタンスを適正サイズ化
- 予測可能なワークロードにはリザーブドインスタンスを使用
- CloudWatch コストモニタリングを有効
- ログとバックアップのライフサイクルポリシーを実装

### コストモニタリング

```bash
# 請求アラートを設定
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget-config.json
```

## 🔄 メンテナンス

### 定期的なタスク

- CloudWatch ダッシュボードとアラームを監視
- 四半期ごとに API キーを確認・ローテーション
- 月次で依存関係を更新
- 月次でコストを確認・最適化
- 週次で DynamoDB テーブルをバックアップ

### 更新とパッチ

- まず開発環境で更新をテスト
- 主要な更新にはブルーグリーンデプロイメントを使用
- ロールバック手順を維持
- すべての変更を文書化

## 📞 サポート

デプロイメント問題については：

1. エラー詳細について CloudWatch ログを確認
2. AWS コンソールで CloudFormation イベントを確認
3. [トラブルシューティングガイド](./docs/TROUBLESHOOTING.md) を参照
4. GitHub リポジトリでイシューを作成

---

詳細については、[メイン README](./README.md) または [API ドキュメント](./docs/API.md) を参照してください。
