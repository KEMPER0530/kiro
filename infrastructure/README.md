# YouTube eFootball Player - AWS CDK Infrastructure

このディレクトリには、YouTube eFootball Player アプリケーションの AWS インフラストラクチャを AWS CDK で定義したコードが含まれています。

## アーキテクチャ概要

### インフラストラクチャコンポーネント

- **VPC**: プライベートネットワーク環境
- **DynamoDB**: お気に入りと検索履歴の永続化
- **ElastiCache Redis**: YouTube API レスポンスのキャッシュ
- **Lambda**: バックエンド API（コンテナイメージ）
- **API Gateway**: RESTful API エンドポイント
- **S3 + CloudFront**: フロントエンドの静的ホスティング
- **WAF**: セキュリティ保護（本番環境のみ）

### 環境構成

- **開発環境 (dev)**: コスト最適化、デバッグ機能有効
- **本番環境 (prod)**: 高可用性、セキュリティ強化、監視充実

## 前提条件

### 必要なソフトウェア

- Node.js 18+
- AWS CLI v2
- AWS CDK v2
- Docker

### AWS 認証情報

```bash
# AWS CLIの設定
aws configure

# または環境変数で設定
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=ap-northeast-1
```

### 環境変数

```bash
export YOUTUBE_API_KEY=your-youtube-api-key
```

## セットアップ

### 1. 依存関係のインストール

```bash
cd infrastructure
npm install
```

### 2. TypeScript のコンパイル

```bash
npm run build
```

### 3. CDK ブートストラップ（初回のみ）

```bash
npm run bootstrap
# または
./scripts/deploy.sh dev --bootstrap
```

## デプロイメント

### 開発環境へのデプロイ

```bash
# 基本的なデプロイ
./scripts/deploy.sh dev

# 差分確認付きデプロイ
./scripts/deploy.sh dev --diff

# 自動承認でデプロイ
./scripts/deploy.sh dev --approve
```

### 本番環境へのデプロイ

```bash
# 本番環境デプロイ（確認あり）
./scripts/deploy.sh prod

# 差分確認付きデプロイ
./scripts/deploy.sh prod --diff
```

### その他の CDK コマンド

```bash
# スタックの差分確認
npm run diff

# CloudFormationテンプレートの生成
npm run synth

# スタックの削除
npm run destroy
```

## 設定

### 環境設定ファイル

設定は `lib/config/environment.ts` で管理されています。

```typescript
// 開発環境の設定例
const devConfig = {
  environment: 'dev',
  region: 'ap-northeast-1',
  dynamodb: {
    billingMode: 'PAY_PER_REQUEST',
    pointInTimeRecovery: false,
  },
  lambda: {
    memorySize: 512,
    timeout: 30,
  },
  // ...
};
```

### カスタマイズ可能な設定項目

#### DynamoDB

- テーブル名
- 課金モード（PAY_PER_REQUEST / PROVISIONED）
- ポイントインタイムリカバリ
- 暗号化設定

#### Lambda

- メモリサイズ
- タイムアウト
- 予約済み同時実行数
- 環境変数

#### API Gateway

- スロットリング設定
- CORS 設定
- ログレベル

#### CloudFront

- 価格クラス
- キャッシュ動作
- 地理的制限

#### ElastiCache

- ノードタイプ
- ノード数
- エンジンバージョン

## 監視とログ

### CloudWatch メトリクス

- Lambda 関数のエラー率、実行時間、スロットリング
- API Gateway のレスポンス時間、エラー率
- DynamoDB の読み書きキャパシティ
- ElastiCache の CPU、メモリ使用率

### ログ

- Lambda 関数ログ: `/aws/lambda/youtube-efootball-backend-{env}`
- API Gateway ログ: `/aws/apigateway/youtube-efootball-{env}`
- VPC フローログ（本番環境のみ）

### アラーム

本番環境では以下のアラームが設定されます：

- Lambda 関数のエラー率が 10%を超過
- API Gateway の 5XX エラー率が 1%を超過
- DynamoDB の読み書きキャパシティが 80%を超過
- ElastiCache の CPU 使用率が 80%を超過

## セキュリティ

### 本番環境のセキュリティ機能

- **WAF**: SQL injection、XSS 攻撃の防御
- **VPC**: プライベートネットワーク分離
- **暗号化**: DynamoDB、ElastiCache、S3 の暗号化
- **IAM**: 最小権限の原則
- **CloudTrail**: API 呼び出しの監査ログ

### セキュリティベストプラクティス

- 定期的なセキュリティパッチの適用
- IAM ロールの定期的な見直し
- アクセスログの監視
- 不要なリソースの削除

## コスト最適化

### 開発環境

- DynamoDB: オンデマンド課金
- ElastiCache: t3.micro インスタンス
- Lambda: 512MB メモリ
- CloudFront: Price Class 100

### 本番環境

- DynamoDB: 使用量に応じてプロビジョニング検討
- ElastiCache: 適切なインスタンスサイズ
- Lambda: パフォーマンスに応じたメモリ調整
- CloudFront: 全世界配信

### コスト監視

- AWS Cost Explorer での定期的な確認
- 予算アラートの設定
- 未使用リソースの定期的な削除

## トラブルシューティング

### よくある問題

#### 1. デプロイエラー

```bash
# ログの確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/youtube-efootball"

# CloudFormationイベントの確認
aws cloudformation describe-stack-events --stack-name YouTubeEfootballPlayer-dev
```

#### 2. Lambda 関数のエラー

```bash
# Lambda関数のログを確認
aws logs tail /aws/lambda/youtube-efootball-backend-dev --follow

# 関数の設定確認
aws lambda get-function --function-name youtube-efootball-backend-dev
```

#### 3. API Gateway の問題

```bash
# API Gatewayのログ確認
aws logs tail /aws/apigateway/youtube-efootball-dev --follow

# APIの設定確認
aws apigateway get-rest-apis
```

#### 4. DynamoDB の問題

```bash
# テーブルの状態確認
aws dynamodb describe-table --table-name efootball-favorites-dev

# テーブルのメトリクス確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=efootball-favorites-dev \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### ログの確認方法

```bash
# 全体的なログの確認
aws logs describe-log-groups --query 'logGroups[?contains(logGroupName, `youtube-efootball`)].logGroupName'

# 特定のログストリームの確認
aws logs describe-log-streams --log-group-name "/aws/lambda/youtube-efootball-backend-dev"

# リアルタイムログの監視
aws logs tail /aws/lambda/youtube-efootball-backend-dev --follow
```

## CI/CD パイプライン

### パイプラインのセットアップ

#### 1. GitHub Secrets の設定

以下のシークレットを GitHub リポジトリに設定してください：

```
AWS_ACCESS_KEY_ID_DEV=your-dev-access-key
AWS_SECRET_ACCESS_KEY_DEV=your-dev-secret-key
AWS_ACCESS_KEY_ID_PROD=your-prod-access-key
AWS_SECRET_ACCESS_KEY_PROD=your-prod-secret-key
YOUTUBE_API_KEY=your-youtube-api-key
GITHUB_TOKEN=your-github-token
SLACK_WEBHOOK_URL=your-slack-webhook-url (optional)
```

#### 2. パイプラインのデプロイ

```bash
# パイプラインスタックのデプロイ
export GITHUB_OWNER="your-github-username"
export GITHUB_REPO="youtube-efootball-player"
export GITHUB_BRANCH="main"

npm run deploy:pipeline
```

#### 3. 戦略的デプロイメント

```bash
# カナリアデプロイメント（本番環境）
./scripts/deploy-with-strategy.sh prod --strategy=canary

# 線形デプロイメント（本番環境）
./scripts/deploy-with-strategy.sh prod --strategy=linear

# 自動承認付きデプロイ（開発環境）
./scripts/deploy-with-strategy.sh dev --approve

# ロールバック
./scripts/deploy-with-strategy.sh prod --rollback
```

### デプロイメント後テスト

```bash
# スモークテスト
./scripts/run-deployment-tests.sh dev --test-type=smoke

# 統合テスト
./scripts/run-deployment-tests.sh dev --test-type=integration

# E2Eテスト
./scripts/run-deployment-tests.sh prod --test-type=e2e

# 全テスト実行
./scripts/run-deployment-tests.sh prod --test-type=all

# タイムアウト設定付きテスト
./scripts/run-deployment-tests.sh dev --test-type=integration --timeout=600
```

### パイプラインの特徴

#### 自動化されたワークフロー

- **変更検出**: ファイル変更に基づく条件付き実行
- **並列テスト**: バックエンド、フロントエンド、統合テストの並列実行
- **段階的デプロイ**: 開発環境 → 手動承認 → 本番環境
- **自動ロールバック**: 失敗時の自動復旧

#### セキュリティ機能

- **脆弱性スキャン**: Trivy による自動セキュリティスキャン
- **シークレット管理**: AWS Secrets Manager との統合
- **権限分離**: 環境別の AWS 認証情報

#### 監視と通知

- **Slack 通知**: デプロイ成功/失敗の自動通知
- **CloudWatch 統合**: メトリクスとアラームの自動設定
- **テストレポート**: 詳細なテスト結果の保存

### GitHub Actions ワークフロー

プロジェクトには包括的な GitHub Actions ワークフローが含まれています：

- **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
  - 変更検出による条件付き実行
  - バックエンド・フロントエンドテスト
  - 統合・E2E テスト
  - セキュリティスキャン
  - 環境別デプロイメント
  - 自動通知

### AWS CodePipeline

CDK Pipelines を使用したセルフミューテーティングパイプライン：

- **ソース**: GitHub リポジトリ
- **テスト**: 自動テスト実行
- **デプロイ**: 段階的デプロイメント
- **承認**: 手動承認ゲート
- **監視**: CloudWatch との統合

## リソース削除

### 開発環境の削除

```bash
npx cdk destroy --context environment=dev
```

### 本番環境の削除

```bash
# 注意: 本番環境のデータは失われます
npx cdk destroy --context environment=prod
```

### 手動削除が必要なリソース

- S3 バケット内のオブジェクト（バージョニング有効時）
- CloudWatch Logs のログストリーム
- ElastiCache のスナップショット

## サポート

### ドキュメント

- [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

### 問題報告

プロジェクトの Issue トラッカーで問題を報告してください。

### 貢献

インフラストラクチャの改善提案やプルリクエストを歓迎します。
