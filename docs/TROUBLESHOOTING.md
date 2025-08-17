# トラブルシューティングガイド

このガイドでは、YouTube eFootball Player アプリケーションでよくある問題の診断と解決方法を説明します。

## 🚨 よくある問題

### 開発環境の問題

#### Docker コンテナの問題

**問題**: コンテナの起動に失敗するか、すぐにクラッシュする

**症状**:

- `docker-compose up` が失敗する
- コンテナがエラーコードで終了する
- ポートバインディングエラー

**解決策**:

1. **ポート競合を確認**:

   ```bash
   # ポートが既に使用されているかチェック
   lsof -i :3000  # フロントエンドポート
   lsof -i :3001  # バックエンドポート
   lsof -i :6379  # Redisポート
   lsof -i :4566  # LocalStackポート

   # ポートを使用しているプロセスを終了
   sudo kill -9 <PID>
   ```

2. **Docker 環境をクリーンアップ**:

   ```bash
   # 全コンテナを停止
   docker-compose down

   # コンテナとボリュームを削除
   docker-compose down -v --remove-orphans

   # Dockerシステムをクリーンアップ
   docker system prune -a

   # コンテナを再ビルド
   docker-compose up --build
   ```

3. **Docker リソースを確認**:

   ```bash
   # Dockerディスク使用量を確認
   docker system df

   # 利用可能メモリを確認
   docker stats
   ```

#### LocalStack 接続問題

**問題**: LocalStack DynamoDB に接続できない

**症状**:

- DynamoDB 操作が失敗する
- "Connection refused" エラー
- テーブルが見つからないエラー

**解決策**:

1. **LocalStack が実行中であることを確認**:

   ```bash
   # LocalStackヘルスを確認
   curl http://localhost:4566/health

   # LocalStackログを確認
   docker-compose logs localstack
   ```

2. **DynamoDB テーブルを初期化**:

   ```bash
   # 初期化スクリプトを実行
   ./scripts/init-localstack.sh

   # テーブルが存在することを確認
   aws --endpoint-url=http://localhost:4566 dynamodb list-tables
   ```

3. **AWS CLI 設定を確認**:
   ```bash
   # LocalStack用のダミー認証情報を設定
   export AWS_ACCESS_KEY_ID=test
   export AWS_SECRET_ACCESS_KEY=test
   export AWS_DEFAULT_REGION=us-east-1
   ```

#### Redis 接続問題

**問題**: Redis 接続失敗

**症状**:

- キャッシュ操作が失敗する
- "ECONNREFUSED" エラー
- API レスポンスが遅い

**解決策**:

1. **Redis コンテナを確認**:

   ```bash
   # Redisコンテナステータスを確認
   docker-compose ps redis

   # Redisログを確認
   docker-compose logs redis

   # Redis接続をテスト
   docker exec -it youtube-eafc-player_redis_1 redis-cli ping
   ```

2. **Redis キャッシュをクリア**:

   ```bash
   # Redisに接続
   docker exec -it youtube-eafc-player_redis_1 redis-cli

   # 全キーをクリア
   FLUSHALL
   ```

### API 問題

#### YouTube API クォータ超過

**問題**: YouTube API がクォータ超過エラーを返す

**症状**:

- YouTube API から HTTP 403 エラー
- "quotaExceeded" エラーメッセージ
- 検索結果が返されない

**解決策**:

1. **API キーとクォータを確認**:

   ```bash
   # APIキーが設定されていることを確認
   echo $YOUTUBE_API_KEY

   # Google Cloud Consoleでクォータ使用量を確認
   # https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
   ```

2. **リクエスト最適化を実装**:

   ```javascript
   // より積極的にキャッシュを使用してAPI呼び出しを削減
   const CACHE_DURATION = 3600; // 5分ではなく1時間

   // 可能な場合はリクエストをバッチ処理
   // 開発環境ではmaxResultsを少なくする
   ```

3. **開発用にモックデータを使用**:
   ```javascript
   // 開発環境ではモックYouTubeサービスを使用
   if (process.env.NODE_ENV === 'development') {
     const mockYouTubeService = require('./mockYouTubeService');
     module.exports = mockYouTubeService;
   }
   ```

#### API レート制限問題

**問題**: API リクエストがレート制限される

**症状**:

- HTTP 429 エラー
- "Too Many Requests" メッセージ
- レスポンス時間が遅い

**解決策**:

1. **レート制限ヘッダーを確認**:

   ```bash
   # APIレスポンスヘッダーを確認
   curl -I http://localhost:3001/api/videos/search?q=eFootball

   # 以下を確認:
   # X-RateLimit-Limit: 100
   # X-RateLimit-Remaining: 0
   # X-RateLimit-Reset: 1640995200
   ```

2. **指数バックオフを実装**:
   ```javascript
   const retryWithBackoff = async (fn, maxRetries = 3) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.response?.status === 429 && i < maxRetries - 1) {
           const delay = Math.pow(2, i) * 1000; // 指数バックオフ
           await new Promise((resolve) => setTimeout(resolve, delay));
           continue;
         }
         throw error;
       }
     }
   };
   ```

### フロントエンド問題

#### ビルド失敗

**問題**: フロントエンドビルドが失敗する

**症状**:

- TypeScript コンパイルエラー
- モジュールが見つからないエラー
- ビルドプロセスがクラッシュする

**解決策**:

1. **node_modules をクリアして再インストール**:

   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **TypeScript 設定を確認**:

   ```bash
   # TypeScriptコンパイラを直接実行
   npx tsc --noEmit

   # 型エラーを確認
   npx tsc --listFiles
   ```

3. **依存関係を更新**:

   ```bash
   # 古いパッケージを確認
   npm outdated

   # パッケージを更新
   npm update
   ```

#### ランタイムエラー

**問題**: アプリケーションがクラッシュするかブラウザでエラーを表示する

**症状**:

- 白い画面（White Screen of Death）
- コンソールで JavaScript エラー
- コンポーネントレンダリング失敗

**解決策**:

1. **ブラウザコンソールを確認**:

   ```javascript
   // ブラウザ開発者ツールを開く（F12）
   // Consoleタブでエラーを確認
   // Networkタブで失敗したリクエストを確認
   ```

2. **エラーバウンダリを有効化**:

   ```typescript
   // Reactエラーをキャッチするエラーバウンダリを追加
   class ErrorBoundary extends React.Component {
     constructor(props) {
       super(props);
       this.state = { hasError: false };
     }

     static getDerivedStateFromError(error) {
       return { hasError: true };
     }

     componentDidCatch(error, errorInfo) {
       console.error('バウンダリでキャッチされたエラー:', error, errorInfo);
     }

     render() {
       if (this.state.hasError) {
         return <h1>何かが間違っています。</h1>;
       }
       return this.props.children;
     }
   }
   ```

3. **API 接続を確認**:

   ```bash
   # APIエンドポイントを直接テスト
   curl http://localhost:3001/api/videos/search?q=test

   # CORSヘッダーを確認
   curl -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS \
        http://localhost:3001/api/videos/search
   ```

### バックエンド問題

#### サーバー起動失敗

**問題**: バックエンドサーバーの起動に失敗する

**症状**:

- "Port already in use" エラー
- モジュールインポートエラー
- データベース接続失敗

**解決策**:

1. **ポート可用性を確認**:

   ```bash
   # ポート3001を使用しているプロセスを終了
   lsof -ti:3001 | xargs kill -9

   # または異なるポートを使用
   export PORT=3002
   npm start
   ```

2. **環境変数を確認**:

   ```bash
   # 必要な環境変数を確認
   echo $YOUTUBE_API_KEY
   echo $NODE_ENV
   echo $REDIS_URL

   # .envファイルから読み込み
   source .env
   ```

3. **依存関係を確認**:

   ```bash
   # 依存関係を再インストール
   rm -rf node_modules package-lock.json
   npm install

   # ピア依存関係の問題を確認
   npm ls
   ```

#### データベース操作失敗

**問題**: DynamoDB 操作が失敗する

**症状**:

- "ResourceNotFoundException" エラー
- "ValidationException" エラー
- タイムアウトエラー

**解決策**:

1. **テーブル存在を確認**:

   ```bash
   # DynamoDBテーブルをリスト
   aws --endpoint-url=http://localhost:4566 dynamodb list-tables

   # テーブル構造を説明
   aws --endpoint-url=http://localhost:4566 dynamodb describe-table \
     --table-name efootball-favorites
   ```

2. **テーブルデータを確認**:

   ```bash
   # テーブル内容をスキャン
   aws --endpoint-url=http://localhost:4566 dynamodb scan \
     --table-name efootball-favorites

   # 特定のアイテムをクエリ
   aws --endpoint-url=http://localhost:4566 dynamodb get-item \
     --table-name efootball-favorites \
     --key '{"userId":{"S":"test-user"},"videoId":{"S":"test-video"}}'
   ```

3. **データベースをリセット**:
   ```bash
   # テーブルを削除して再作成
   ./scripts/init-localstack.sh --reset
   ```

### デプロイメント問題

#### CDK デプロイメント失敗

**問題**: AWS CDK デプロイメントが失敗する

**症状**:

- CloudFormation スタック作成失敗
- 権限拒否エラー
- リソース制限超過エラー

**解決策**:

1. **AWS 認証情報を確認**:

   ```bash
   # AWS認証情報を確認
   aws sts get-caller-identity

   # AWSリージョンを確認
   aws configure get region

   # 権限をテスト
   aws iam get-user
   ```

2. **CDK をブートストラップ**:

   ```bash
   # ターゲットリージョンでCDKをブートストラップ
   cd infrastructure
   npx cdk bootstrap

   # ブートストラップスタックを確認
   aws cloudformation describe-stacks --stack-name CDKToolkit
   ```

3. **CloudFormation イベントを確認**:

   ```bash
   # スタックイベントを表示
   aws cloudformation describe-stack-events \
     --stack-name YouTubeEfootballPlayer-dev

   # 失敗したリソースを確認
   aws cloudformation list-stack-resources \
     --stack-name YouTubeEfootballPlayer-dev \
     --stack-resource-status-filter CREATE_FAILED UPDATE_FAILED
   ```

#### Lambda 関数問題

**問題**: Lambda 関数の実行に失敗する

**症状**:

- 関数タイムアウトエラー
- メモリ制限超過
- コールドスタート問題

**解決策**:

1. **CloudWatch ログを確認**:

   ```bash
   # Lambdaログを表示
   aws logs tail /aws/lambda/youtube-efootball-dev-api --follow

   # エラーログをフィルター
   aws logs filter-log-events \
     --log-group-name /aws/lambda/youtube-efootball-dev-api \
     --filter-pattern "ERROR"
   ```

2. **Lambda リソースを増加**:

   ```typescript
   // CDKスタックで
   const lambdaFunction = new Function(this, 'ApiFunction', {
     memorySize: 1024, // 512から増加
     timeout: Duration.seconds(60), // 30から増加
     // ... その他の設定
   });
   ```

3. **コールドスタートを最適化**:

   ```javascript
   // 接続をウォーム状態に保つ
   let dbConnection;
   let redisConnection;

   exports.handler = async (event) => {
     if (!dbConnection) {
       dbConnection = await createDbConnection();
     }
     if (!redisConnection) {
       redisConnection = await createRedisConnection();
     }
     // ... ハンドラーロジック
   };
   ```

## 🔍 デバッグツール

### ログとモニタリング

#### デバッグログを有効化

```bash
# バックエンドデバッグログ
export DEBUG=youtube-efootball:*
npm start

# フロントエンドデバッグログ
export REACT_APP_DEBUG=true
npm start
```

#### 構造化ログ

```javascript
// 構造化ログ形式を使用
const logger = {
  info: (message, meta = {}) => {
    console.log(
      JSON.stringify({
        level: 'info',
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      })
    );
  },
  error: (message, error, meta = {}) => {
    console.error(
      JSON.stringify({
        level: 'error',
        message,
        error: error?.message,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        ...meta,
      })
    );
  },
};
```

### パフォーマンスモニタリング

#### API レスポンス時間モニタリング

```javascript
// レスポンス時間ミドルウェアを追加
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
});
```

#### メモリ使用量モニタリング

```javascript
// メモリ使用量を監視
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log('メモリ使用量:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
  });
}, 30000); // 30秒ごと
```

### ネットワークデバッグ

#### API リクエストデバッグ

```bash
# 詳細出力でcurlを使用
curl -v http://localhost:3001/api/videos/search?q=eFootball

# より良いフォーマットでhttpieを使用
http GET localhost:3001/api/videos/search q==eFootball

# ネットワークトラフィックを監視
sudo tcpdump -i lo0 port 3001
```

#### CORS デバッグ

```javascript
// CORSデバッグミドルウェアを追加
app.use((req, res, next) => {
  console.log('CORSデバッグ:', {
    origin: req.headers.origin,
    method: req.method,
    headers: req.headers,
  });
  next();
});
```

## 🛠️ ヘルスチェック

### アプリケーションヘルスチェック

包括的なヘルスチェックエンドポイントを作成：

```javascript
// バックエンドヘルスチェック
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,
    checks: {},
  };

  try {
    // Redis接続を確認
    await redisClient.ping();
    health.checks.redis = 'ok';
  } catch (error) {
    health.checks.redis = 'error';
    health.status = 'degraded';
  }

  try {
    // DynamoDB接続を確認
    await dynamodb.listTables().promise();
    health.checks.dynamodb = 'ok';
  } catch (error) {
    health.checks.dynamodb = 'error';
    health.status = 'degraded';
  }

  try {
    // YouTube APIを確認
    const response = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          part: 'snippet',
          q: 'test',
          maxResults: 1,
          key: process.env.YOUTUBE_API_KEY,
        },
        timeout: 5000,
      }
    );
    health.checks.youtube_api = 'ok';
  } catch (error) {
    health.checks.youtube_api = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### 自動ヘルスモニタリング

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="http://localhost:3001/health"
RESPONSE=$(curl -s -w "%{http_code}" $HEALTH_URL)
HTTP_CODE="${RESPONSE: -3}"
BODY="${RESPONSE%???}"

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ ヘルスチェック成功"
    echo "$BODY" | jq .
else
    echo "❌ ヘルスチェック失敗 (HTTP $HTTP_CODE)"
    echo "$BODY"
    exit 1
fi
```

## 📞 ヘルプを得る

### ログ収集

問題を報告する際は、関連するログを収集してください：

```bash
#!/bin/bash
# collect-logs.sh

echo "トラブルシューティング用ログを収集中..."

# ログディレクトリを作成
mkdir -p troubleshooting-logs

# Dockerログ
docker-compose logs > troubleshooting-logs/docker-compose.log

# アプリケーションログ
docker-compose logs frontend > troubleshooting-logs/frontend.log
docker-compose logs backend > troubleshooting-logs/backend.log
docker-compose logs redis > troubleshooting-logs/redis.log
docker-compose logs localstack > troubleshooting-logs/localstack.log

# システム情報
echo "システム情報:" > troubleshooting-logs/system-info.txt
uname -a >> troubleshooting-logs/system-info.txt
docker --version >> troubleshooting-logs/system-info.txt
node --version >> troubleshooting-logs/system-info.txt
npm --version >> troubleshooting-logs/system-info.txt

# 環境変数（サニタイズ済み）
echo "環境変数:" > troubleshooting-logs/env-vars.txt
env | grep -E "(NODE_ENV|PORT|REDIS_URL)" >> troubleshooting-logs/env-vars.txt

# パッケージバージョン
cd frontend && npm list --depth=0 > ../troubleshooting-logs/frontend-packages.txt
cd ../backend && npm list --depth=0 > ../troubleshooting-logs/backend-packages.txt

echo "ログがtroubleshooting-logs/ディレクトリに収集されました"
echo "問題を報告する際はこれらのログを含めてください"
```

### 問題報告テンプレート

問題を報告する際は以下を含めてください：

1. **環境情報**:

   - オペレーティングシステムとバージョン
   - Node.js バージョン
   - Docker バージョン
   - ブラウザバージョン（フロントエンド問題の場合）

2. **再現手順**:

   - 実行した正確なコマンド
   - 使用した設定
   - 期待される動作 vs 実際の動作

3. **エラーメッセージ**:

   - 完全なエラーメッセージ
   - スタックトレース
   - ログファイル

4. **追加コンテキスト**:
   - 最近行った変更
   - 試行した回避策
   - 機能への影響

### サポートチャンネル

- **GitHub イシュー**: バグ報告と機能リクエスト用
- **ドキュメント**: まず既存のドキュメントを確認
- **コミュニティ**: `youtube-efootball-player` タグ付きで Stack Overflow

---

詳細については、[メイン README](../README.md) または [開発ガイド](./DEVELOPMENT.md) を参照してください。
