#!/bin/bash

set -e

# 色付きの出力用関数
print_success() {
    echo -e "\033[32m✓ $1\033[0m"
}

print_error() {
    echo -e "\033[31m✗ $1\033[0m"
}

print_info() {
    echo -e "\033[34mℹ $1\033[0m"
}

print_warning() {
    echo -e "\033[33m⚠ $1\033[0m"
}

# 使用方法を表示
show_usage() {
    echo "使用方法: $0 [環境] [オプション]"
    echo ""
    echo "環境:"
    echo "  dev     開発環境にデプロイ"
    echo "  prod    本番環境にデプロイ"
    echo ""
    echo "オプション:"
    echo "  --bootstrap     CDKブートストラップを実行"
    echo "  --diff          デプロイ前に差分を表示"
    echo "  --no-build      フロントエンドのビルドをスキップ"
    echo "  --approve       確認なしでデプロイ"
    echo "  -h, --help      このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0 dev --bootstrap"
    echo "  $0 prod --diff"
}

# 引数の解析
ENVIRONMENT=""
BOOTSTRAP=false
SHOW_DIFF=false
NO_BUILD=false
AUTO_APPROVE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --bootstrap)
            BOOTSTRAP=true
            shift
            ;;
        --diff)
            SHOW_DIFF=true
            shift
            ;;
        --no-build)
            NO_BUILD=true
            shift
            ;;
        --approve)
            AUTO_APPROVE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "不明なオプション: $1"
            show_usage
            exit 1
            ;;
    esac
done

# 環境が指定されていない場合はエラー
if [ -z "$ENVIRONMENT" ]; then
    print_error "環境を指定してください (dev または prod)"
    show_usage
    exit 1
fi

print_info "YouTube eFootball Player - AWS CDK デプロイメント"
print_info "環境: $ENVIRONMENT"

# 作業ディレクトリに移動
cd "$(dirname "$0")/.."

# 必要な環境変数の確認
if [ -z "$YOUTUBE_API_KEY" ]; then
    print_warning "YOUTUBE_API_KEY環境変数が設定されていません"
    read -p "YouTube API Keyを入力してください: " YOUTUBE_API_KEY
    export YOUTUBE_API_KEY
fi

# AWS認証情報の確認
print_info "AWS認証情報を確認中..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    print_error "AWS認証情報が設定されていません"
    print_info "aws configure または AWS_PROFILE環境変数を設定してください"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "ap-northeast-1")

print_success "AWS Account: $ACCOUNT_ID"
print_success "AWS Region: $REGION"

# 依存関係のインストール
print_info "依存関係をインストール中..."
npm install

# TypeScriptのコンパイル
print_info "TypeScriptをコンパイル中..."
npm run build

# CDKブートストラップ（必要な場合）
if [ "$BOOTSTRAP" = true ]; then
    print_info "CDKブートストラップを実行中..."
    npx cdk bootstrap aws://$ACCOUNT_ID/$REGION
    print_success "CDKブートストラップが完了しました"
fi

# フロントエンドのビルド
if [ "$NO_BUILD" = false ]; then
    print_info "フロントエンドをビルド中..."
    cd ../frontend
    npm install
    npm run build
    cd ../infrastructure
    print_success "フロントエンドのビルドが完了しました"
fi

# CDK差分の表示（必要な場合）
if [ "$SHOW_DIFF" = true ]; then
    print_info "デプロイ差分を表示中..."
    npx cdk diff --context environment=$ENVIRONMENT
    echo ""
    read -p "デプロイを続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "デプロイをキャンセルしました"
        exit 0
    fi
fi

# デプロイの実行
print_info "デプロイを開始します..."

DEPLOY_COMMAND="npx cdk deploy --context environment=$ENVIRONMENT"

if [ "$AUTO_APPROVE" = true ]; then
    DEPLOY_COMMAND="$DEPLOY_COMMAND --require-approval never"
fi

# 本番環境の場合は追加の確認
if [ "$ENVIRONMENT" = "prod" ] && [ "$AUTO_APPROVE" = false ]; then
    print_warning "本番環境にデプロイしようとしています"
    read -p "本当に本番環境にデプロイしますか？ (yes/no): " -r
    if [[ ! $REPLY = "yes" ]]; then
        print_info "デプロイをキャンセルしました"
        exit 0
    fi
fi

# デプロイ実行
eval $DEPLOY_COMMAND

if [ $? -eq 0 ]; then
    print_success "デプロイが正常に完了しました！"
    
    # デプロイ後の情報表示
    print_info "デプロイ情報を取得中..."
    
    STACK_NAME="YouTubeEfootballPlayer-$ENVIRONMENT"
    
    # CloudFormationスタックの出力を取得
    WEBSITE_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`ApplicationUrl`].OutputValue' \
        --output text 2>/dev/null || echo "取得できませんでした")
    
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
        --output text 2>/dev/null || echo "取得できませんでした")
    
    echo ""
    echo "=== デプロイ完了情報 ==="
    echo "環境: $ENVIRONMENT"
    echo "スタック名: $STACK_NAME"
    echo "ウェブサイトURL: $WEBSITE_URL"
    echo "API URL: $API_URL"
    echo "========================"
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        print_info "開発環境のデプロイが完了しました。上記のURLでアプリケーションにアクセスできます。"
    else
        print_info "本番環境のデプロイが完了しました。DNS設定やドメイン設定を確認してください。"
    fi
    
else
    print_error "デプロイに失敗しました"
    exit 1
fi