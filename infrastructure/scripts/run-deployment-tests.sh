#!/bin/bash

# デプロイメント後の自動テスト実行スクリプト
# Usage: ./run-deployment-tests.sh <environment> [--test-type=<type>]

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

log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

# 使用方法を表示
show_usage() {
    echo "Usage: $0 <environment> [options]"
    echo ""
    echo "Arguments:"
    echo "  environment    Target environment (dev, prod)"
    echo ""
    echo "Options:"
    echo "  --test-type=<type>    Test type to run (smoke, integration, e2e, all)"
    echo "  --timeout=<seconds>   Test timeout in seconds (default: 300)"
    echo "  --retry=<count>       Number of retries for failed tests (default: 3)"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev --test-type=smoke"
    echo "  $0 prod --test-type=all --timeout=600"
}

# パラメータ解析
ENVIRONMENT=""
TEST_TYPE="smoke"
TIMEOUT=300
RETRY_COUNT=3

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --test-type=*)
            TEST_TYPE="${1#*=}"
            shift
            ;;
        --timeout=*)
            TIMEOUT="${1#*=}"
            shift
            ;;
        --retry=*)
            RETRY_COUNT="${1#*=}"
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

# テストタイプの検証
case $TEST_TYPE in
    smoke|integration|e2e|all)
        log_info "Running $TEST_TYPE tests for $ENVIRONMENT environment"
        ;;
    *)
        log_error "Invalid test type: $TEST_TYPE"
        log_error "Valid types: smoke, integration, e2e, all"
        exit 1
        ;;
esac

# 環境情報の取得
log_info "Retrieving environment information..."

# CloudFormationスタックから出力を取得
get_stack_output() {
    local output_key="$1"
    aws cloudformation describe-stacks \
        --stack-name "YouTubeEfootballPlayer-$ENVIRONMENT" \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text 2>/dev/null || echo ""
}

API_ENDPOINT=$(get_stack_output "ApiEndpoint")
WEBSITE_URL=$(get_stack_output "WebsiteUrl")
CLOUDFRONT_DOMAIN=$(get_stack_output "CloudFrontDomain")

if [[ -z "$API_ENDPOINT" || "$API_ENDPOINT" == "None" ]]; then
    log_error "Could not retrieve API endpoint from CloudFormation stack"
    exit 1
fi

log_info "API Endpoint: $API_ENDPOINT"
log_info "Website URL: $WEBSITE_URL"
log_info "CloudFront Domain: $CLOUDFRONT_DOMAIN"

# テスト環境変数の設定
export TEST_API_ENDPOINT="$API_ENDPOINT"
export TEST_WEBSITE_URL="$WEBSITE_URL"
export TEST_ENVIRONMENT="$ENVIRONMENT"
export TEST_TIMEOUT="$TIMEOUT"

# テスト結果ディレクトリの作成
TEST_RESULTS_DIR="../tests/test-results/$ENVIRONMENT-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TEST_RESULTS_DIR"

log_info "Test results will be saved to: $TEST_RESULTS_DIR"

# リトライ機能付きテスト実行関数
run_test_with_retry() {
    local test_command="$1"
    local test_name="$2"
    local attempt=1
    
    while [[ $attempt -le $RETRY_COUNT ]]; do
        log_info "Running $test_name (attempt $attempt/$RETRY_COUNT)..."
        
        if timeout "$TIMEOUT" bash -c "$test_command"; then
            log_success "$test_name passed"
            return 0
        else
            log_warn "$test_name failed (attempt $attempt/$RETRY_COUNT)"
            if [[ $attempt -eq $RETRY_COUNT ]]; then
                log_error "$test_name failed after $RETRY_COUNT attempts"
                return 1
            fi
            attempt=$((attempt + 1))
            sleep 10
        fi
    done
}

# スモークテスト実行
run_smoke_tests() {
    log_info "🔥 Running smoke tests..."
    
    # API ヘルスチェック
    run_test_with_retry "curl -f -s '$API_ENDPOINT/health' > /dev/null" "API Health Check"
    
    # 基本的なエンドポイントテスト
    run_test_with_retry "curl -f -s '$API_ENDPOINT/api/youtube/search?q=test&maxResults=1' > /dev/null" "YouTube Search API"
    
    # フロントエンドアクセステスト
    if [[ -n "$WEBSITE_URL" && "$WEBSITE_URL" != "None" ]]; then
        run_test_with_retry "curl -f -s '$WEBSITE_URL' > /dev/null" "Frontend Access"
    fi
    
    log_success "✅ Smoke tests completed"
}

# 統合テスト実行
run_integration_tests() {
    log_info "🔗 Running integration tests..."
    
    cd ../tests
    
    # 統合テストの実行
    run_test_with_retry "npm run test:integration -- --environment=$ENVIRONMENT --reporter=json --outputFile=$TEST_RESULTS_DIR/integration-results.json" "Integration Tests"
    
    cd ../infrastructure
    log_success "✅ Integration tests completed"
}

# E2Eテスト実行
run_e2e_tests() {
    log_info "🎭 Running E2E tests..."
    
    cd ../tests
    
    # E2Eテストの実行
    run_test_with_retry "npm run test:e2e -- --environment=$ENVIRONMENT --reporter=json --outputFile=$TEST_RESULTS_DIR/e2e-results.json" "E2E Tests"
    
    cd ../infrastructure
    log_success "✅ E2E tests completed"
}

# パフォーマンステスト実行
run_performance_tests() {
    log_info "⚡ Running performance tests..."
    
    # 簡単な負荷テスト
    run_test_with_retry "
        for i in {1..10}; do
            curl -f -s '$API_ENDPOINT/health' > /dev/null &
        done
        wait
    " "Basic Load Test"
    
    # レスポンス時間テスト
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$API_ENDPOINT/health")
    if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
        log_error "Response time too slow: ${RESPONSE_TIME}s"
        return 1
    else
        log_success "Response time OK: ${RESPONSE_TIME}s"
    fi
}

# セキュリティテスト実行
run_security_tests() {
    log_info "🔒 Running security tests..."
    
    # HTTPS確認
    if [[ "$API_ENDPOINT" == https://* ]]; then
        log_success "API endpoint uses HTTPS"
    else
        log_error "API endpoint should use HTTPS"
        return 1
    fi
    
    # セキュリティヘッダーチェック
    SECURITY_HEADERS=$(curl -I -s "$API_ENDPOINT/health" | grep -i "x-frame-options\\|x-content-type-options\\|x-xss-protection" | wc -l)
    if [[ $SECURITY_HEADERS -ge 2 ]]; then
        log_success "Security headers present"
    else
        log_warn "Some security headers missing"
    fi
}

# メインテスト実行
main() {
    local test_failed=false
    
    log_info "🚀 Starting deployment tests for $ENVIRONMENT environment"
    
    case $TEST_TYPE in
        smoke)
            run_smoke_tests || test_failed=true
            ;;
        integration)
            run_integration_tests || test_failed=true
            ;;
        e2e)
            run_e2e_tests || test_failed=true
            ;;
        all)
            run_smoke_tests || test_failed=true
            run_integration_tests || test_failed=true
            run_e2e_tests || test_failed=true
            run_performance_tests || test_failed=true
            run_security_tests || test_failed=true
            ;;
    esac
    
    # テスト結果の集約
    log_info "📊 Generating test report..."
    
    cat > "$TEST_RESULTS_DIR/test-summary.json" << EOF
{
  "environment": "$ENVIRONMENT",
  "testType": "$TEST_TYPE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "apiEndpoint": "$API_ENDPOINT",
  "websiteUrl": "$WEBSITE_URL",
  "testsPassed": $([ "$test_failed" = false ] && echo "true" || echo "false"),
  "duration": "$SECONDS seconds"
}
EOF
    
    if [[ "$test_failed" = true ]]; then
        log_error "❌ Some tests failed. Check the test results in: $TEST_RESULTS_DIR"
        
        # Slackに通知（環境変数が設定されている場合）
        if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"🚨 Deployment tests failed for $ENVIRONMENT environment\\nAPI: $API_ENDPOINT\\nTest Type: $TEST_TYPE\"}" \
                "$SLACK_WEBHOOK_URL" || true
        fi
        
        exit 1
    else
        log_success "🎉 All tests passed successfully!"
        
        # Slackに成功通知
        if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"✅ Deployment tests passed for $ENVIRONMENT environment\\nAPI: $API_ENDPOINT\\nTest Type: $TEST_TYPE\"}" \
                "$SLACK_WEBHOOK_URL" || true
        fi
        
        exit 0
    fi
}

# スクリプト実行
main