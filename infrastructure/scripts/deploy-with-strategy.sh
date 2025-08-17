#!/bin/bash

# デプロイメント戦略付きデプロイスクリプト
# Usage: ./deploy-with-strategy.sh <environment> [--strategy=<strategy>] [--approve]

set -e

# 色付きログ関数
log_info() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[0;33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# 使用方法を表示
show_usage() {
    echo "Usage: $0 <environment> [options]"
    echo ""
    echo "Arguments:"
    echo "  environment    Target environment (dev, prod)"
    echo ""
    echo "Options:"
    echo "  --strategy=<strategy>  Deployment strategy (canary, linear, all-at-once)"
    echo "  --approve             Auto-approve deployment without confirmation"
    echo "  --rollback           Rollback to previous version"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev --approve"
    echo "  $0 prod --strategy=canary"
    echo "  $0 prod --rollback"
}

# パラメータ解析
ENVIRONMENT=""
STRATEGY=""
AUTO_APPROVE=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --strategy=*)
            STRATEGY="${1#*=}"
            shift
            ;;
        --approve)
            AUTO_APPROVE=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# 必須パラメータチェック
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Environment is required"
    show_usage
    exit 1
fi

# 環境変数チェック
if [[ -z "$AWS_REGION" ]]; then
    export AWS_REGION="ap-northeast-1"
    log_warn "AWS_REGION not set, using default: $AWS_REGION"
fi

# CDKがインストールされているかチェック
if ! command -v cdk &> /dev/null; then
    log_error "AWS CDK is not installed. Please install it first:"
    log_error "npm install -g aws-cdk"
    exit 1
fi

# AWS認証情報チェック
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured or invalid"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT environment"

# ロールバック処理
if [[ "$ROLLBACK" == true ]]; then
    log_info "Initiating rollback for $ENVIRONMENT environment"
    
    # 最新のデプロイメントIDを取得
    DEPLOYMENT_ID=$(aws deploy list-deployments \
        --application-name "youtube-efootball-$ENVIRONMENT" \
        --deployment-group-name "youtube-efootball-$ENVIRONMENT-deployment-group" \
        --include-only-statuses "Succeeded" \
        --query 'deployments[1]' \
        --output text 2>/dev/null || echo "")
    
    if [[ -z "$DEPLOYMENT_ID" || "$DEPLOYMENT_ID" == "None" ]]; then
        log_error "No previous successful deployment found for rollback"
        exit 1
    fi
    
    log_info "Rolling back to deployment: $DEPLOYMENT_ID"
    
    aws deploy stop-deployment \
        --deployment-id "$DEPLOYMENT_ID" \
        --auto-rollback-enabled
    
    log_info "Rollback initiated successfully"
    exit 0
fi

# デプロイメント戦略の設定
if [[ -n "$STRATEGY" ]]; then
    case $STRATEGY in
        canary|linear|all-at-once)
            log_info "Using deployment strategy: $STRATEGY"
            export DEPLOYMENT_STRATEGY="$STRATEGY"
            ;;
        *)
            log_error "Invalid deployment strategy: $STRATEGY"
            log_error "Valid strategies: canary, linear, all-at-once"
            exit 1
            ;;
    esac
fi

# 依存関係のインストール
log_info "Installing dependencies..."
npm ci

# CDK Bootstrap（初回のみ）
log_info "Checking CDK bootstrap status..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit &> /dev/null; then
    log_info "Bootstrapping CDK..."
    cdk bootstrap
fi

# CDK差分確認
log_info "Checking deployment diff..."
cdk diff "YouTubeEfootballPlayer-$ENVIRONMENT" || true

# 確認プロンプト（自動承認でない場合）
if [[ "$AUTO_APPROVE" != true ]]; then
    echo ""
    read -p "Do you want to proceed with the deployment? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
fi

# デプロイメント実行
log_info "Starting CDK deployment..."

# 環境変数の設定
export CDK_ENVIRONMENT="$ENVIRONMENT"

# デプロイメント実行
if cdk deploy "YouTubeEfootballPlayer-$ENVIRONMENT" \
    --require-approval never \
    --outputs-file "outputs-$ENVIRONMENT.json" \
    --progress events; then
    
    log_info "CDK deployment completed successfully"
    
    # 出力ファイルが存在する場合、重要な情報を表示
    if [[ -f "outputs-$ENVIRONMENT.json" ]]; then
        log_info "Deployment outputs:"
        cat "outputs-$ENVIRONMENT.json" | jq -r 'to_entries[] | "\(.key): \(.value)"' 2>/dev/null || cat "outputs-$ENVIRONMENT.json"
    fi
    
    # デプロイメント後のヘルスチェック
    log_info "Running post-deployment health checks..."
    
    # API Gateway エンドポイントの取得
    API_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "YouTubeEfootballPlayer-$ENVIRONMENT" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$API_ENDPOINT" && "$API_ENDPOINT" != "None" ]]; then
        log_info "Testing API endpoint: $API_ENDPOINT"
        
        # ヘルスチェックエンドポイントをテスト
        if curl -f -s "$API_ENDPOINT/health" > /dev/null; then
            log_info "✅ API health check passed"
        else
            log_warn "⚠️  API health check failed, but deployment was successful"
        fi
    fi
    
    # CloudWatch ダッシュボードURL
    DASHBOARD_URL="https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=YouTubeEfootball-$ENVIRONMENT"
    log_info "📊 CloudWatch Dashboard: $DASHBOARD_URL"
    
    # CodeDeploy コンソールURL
    CODEDEPLOY_URL="https://console.aws.amazon.com/codesuite/codedeploy/applications/youtube-efootball-$ENVIRONMENT"
    log_info "🚀 CodeDeploy Console: $CODEDEPLOY_URL"
    
    log_info "🎉 Deployment to $ENVIRONMENT completed successfully!"
    
else
    log_error "❌ CDK deployment failed"
    
    # 失敗時のトラブルシューティング情報
    log_error "Troubleshooting steps:"
    log_error "1. Check CloudFormation events in AWS Console"
    log_error "2. Review CDK logs above for specific errors"
    log_error "3. Verify AWS credentials and permissions"
    log_error "4. Check if all required environment variables are set"
    
    exit 1
fi

# クリーンアップ
log_info "Cleaning up temporary files..."
rm -f "outputs-$ENVIRONMENT.json" 2>/dev/null || true

log_info "Deployment script completed"