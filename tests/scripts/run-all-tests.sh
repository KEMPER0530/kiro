#!/bin/bash

set -e

echo "=== YouTube eFootball Player - 統合テスト・E2Eテスト実行スクリプト ==="

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

# クリーンアップ関数
cleanup() {
    print_info "テスト環境をクリーンアップ中..."
    cd "$(dirname "$0")/.."
    docker-compose -f docker/docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true
    print_success "クリーンアップ完了"
}

# エラー時のクリーンアップ
trap cleanup EXIT

# 引数の解析
RUN_INTEGRATION=true
RUN_E2E=true
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --integration-only)
            RUN_E2E=false
            shift
            ;;
        --e2e-only)
            RUN_INTEGRATION=false
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -h|--help)
            echo "使用方法: $0 [オプション]"
            echo "オプション:"
            echo "  --integration-only  統合テストのみ実行"
            echo "  --e2e-only         E2Eテストのみ実行"
            echo "  --skip-build       Dockerイメージのビルドをスキップ"
            echo "  -h, --help         このヘルプを表示"
            exit 0
            ;;
        *)
            print_error "不明なオプション: $1"
            exit 1
            ;;
    esac
done

# 作業ディレクトリに移動
cd "$(dirname "$0")/.."

print_info "テスト実行を開始します..."

# 環境変数の確認
if [ -z "$YOUTUBE_API_KEY" ]; then
    print_warning "YOUTUBE_API_KEY環境変数が設定されていません。一部のテストが失敗する可能性があります。"
fi

# 既存のコンテナをクリーンアップ
print_info "既存のテスト環境をクリーンアップ中..."
docker-compose -f docker/docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true

# 依存関係のインストール
print_info "テスト依存関係をインストール中..."
npm install

# LocalStackとRedisを起動
print_info "LocalStackとRedisを起動中..."
docker-compose -f docker/docker-compose.test.yml up -d localstack redis

# LocalStackの初期化を待機
print_info "LocalStackの初期化を待機中..."
sleep 10

# DynamoDBテーブルを作成
print_info "DynamoDBテーブルを作成中..."
node scripts/setup-localstack.js

# 統合テストの実行
if [ "$RUN_INTEGRATION" = true ]; then
    print_info "統合テストを実行中..."
    
    if [ "$SKIP_BUILD" = true ]; then
        docker-compose -f docker/docker-compose.test.yml up --no-build integration-tests --abort-on-container-exit
    else
        docker-compose -f docker/docker-compose.test.yml up --build integration-tests --abort-on-container-exit
    fi
    
    INTEGRATION_EXIT_CODE=$?
    
    if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
        print_success "統合テストが正常に完了しました"
    else
        print_error "統合テストが失敗しました (終了コード: $INTEGRATION_EXIT_CODE)"
    fi
else
    print_info "統合テストをスキップしました"
    INTEGRATION_EXIT_CODE=0
fi

# E2Eテストの実行
if [ "$RUN_E2E" = true ]; then
    print_info "E2Eテストを実行中..."
    
    if [ "$SKIP_BUILD" = true ]; then
        docker-compose -f docker/docker-compose.test.yml up --no-build e2e-tests --abort-on-container-exit
    else
        docker-compose -f docker/docker-compose.test.yml up --build e2e-tests --abort-on-container-exit
    fi
    
    E2E_EXIT_CODE=$?
    
    if [ $E2E_EXIT_CODE -eq 0 ]; then
        print_success "E2Eテストが正常に完了しました"
    else
        print_error "E2Eテストが失敗しました (終了コード: $E2E_EXIT_CODE)"
    fi
else
    print_info "E2Eテストをスキップしました"
    E2E_EXIT_CODE=0
fi

# 結果の表示
echo ""
echo "=== テスト結果サマリー ==="

if [ "$RUN_INTEGRATION" = true ]; then
    if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
        print_success "統合テスト: 成功"
    else
        print_error "統合テスト: 失敗"
    fi
fi

if [ "$RUN_E2E" = true ]; then
    if [ $E2E_EXIT_CODE -eq 0 ]; then
        print_success "E2Eテスト: 成功"
    else
        print_error "E2Eテスト: 失敗"
    fi
fi

# 全体の終了コード
OVERALL_EXIT_CODE=$((INTEGRATION_EXIT_CODE + E2E_EXIT_CODE))

if [ $OVERALL_EXIT_CODE -eq 0 ]; then
    print_success "すべてのテストが正常に完了しました！"
else
    print_error "一部のテストが失敗しました"
fi

exit $OVERALL_EXIT_CODE