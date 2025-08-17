"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiGateway = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const wafv2 = __importStar(require("aws-cdk-lib/aws-wafv2"));
const constructs_1 = require("constructs");
class ApiGateway extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { config, backendFunction } = props;
        // CloudWatch Logs グループ
        const logGroup = new logs.LogGroup(this, 'ApiGatewayLogGroup', {
            logGroupName: `/aws/apigateway/youtube-efootball-${config.environment}`,
            retention: logs.RetentionDays.DAYS_14,
            removalPolicy: config.environment === 'prod'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        // API Gateway REST API
        this.api = new apigateway.RestApi(this, 'Api', {
            restApiName: `youtube-efootball-api-${config.environment}`,
            description: `YouTube eFootball Player API - ${config.environment}`,
            // CORS設定
            defaultCorsPreflightOptions: {
                allowOrigins: config.apiGateway.cors.allowOrigins,
                allowMethods: config.apiGateway.cors.allowMethods,
                allowHeaders: config.apiGateway.cors.allowHeaders,
                allowCredentials: false,
            },
            // スロットリング設定
            deployOptions: {
                stageName: config.environment,
                throttlingRateLimit: config.apiGateway.throttling.rateLimit,
                throttlingBurstLimit: config.apiGateway.throttling.burstLimit,
                // ログ設定
                accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
                    caller: true,
                    httpMethod: true,
                    ip: true,
                    protocol: true,
                    requestTime: true,
                    resourcePath: true,
                    responseLength: true,
                    status: true,
                    user: true,
                }),
                // X-Ray有効化
                tracingEnabled: config.monitoring.enableXRay,
                // メトリクス有効化
                metricsEnabled: config.monitoring.enableDetailedMonitoring,
                dataTraceEnabled: config.environment === 'dev',
                loggingLevel: config.environment === 'dev'
                    ? apigateway.MethodLoggingLevel.INFO
                    : apigateway.MethodLoggingLevel.ERROR,
            },
            // エンドポイント設定
            endpointConfiguration: {
                types: [apigateway.EndpointType.REGIONAL],
            },
            // バイナリメディアタイプ
            binaryMediaTypes: ['image/*', 'application/octet-stream'],
        });
        // Lambda統合
        const lambdaIntegration = new apigateway.LambdaIntegration(backendFunction, {
            requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
            proxy: true,
        });
        // APIリソースとメソッドの設定
        this.setupApiResources(lambdaIntegration, config);
        // WAF設定（本番環境のみ）
        if (config.security.enableWaf) {
            this.setupWaf(config);
        }
        // CloudWatch アラーム
        this.createCloudWatchAlarms(config);
        // 出力
        new cdk.CfnOutput(this, 'ApiGatewayUrl', {
            value: this.api.url,
            description: 'URL of the API Gateway',
            exportName: `${config.environment}-ApiGatewayUrl`,
        });
        new cdk.CfnOutput(this, 'ApiGatewayId', {
            value: this.api.restApiId,
            description: 'ID of the API Gateway',
            exportName: `${config.environment}-ApiGatewayId`,
        });
    }
    setupApiResources(lambdaIntegration, config) {
        // /api リソース
        const apiResource = this.api.root.addResource('api');
        // /api/videos リソース
        const videosResource = apiResource.addResource('videos');
        // /api/videos/search
        const searchResource = videosResource.addResource('search');
        searchResource.addMethod('GET', lambdaIntegration, {
            requestParameters: {
                'method.request.querystring.q': false,
                'method.request.querystring.category': false,
                'method.request.querystring.maxResults': false,
            },
        });
        // /api/videos/popular
        const popularResource = videosResource.addResource('popular');
        popularResource.addMethod('GET', lambdaIntegration);
        // /api/videos/related/{videoId}
        const relatedResource = videosResource.addResource('related');
        const videoIdResource = relatedResource.addResource('{videoId}');
        videoIdResource.addMethod('GET', lambdaIntegration, {
            requestParameters: {
                'method.request.path.videoId': true,
            },
        });
        // /api/favorites リソース
        const favoritesResource = apiResource.addResource('favorites');
        favoritesResource.addMethod('GET', lambdaIntegration, {
            requestParameters: {
                'method.request.querystring.userId': true,
            },
        });
        favoritesResource.addMethod('POST', lambdaIntegration);
        // /api/favorites/{videoId}
        const favoriteVideoResource = favoritesResource.addResource('{videoId}');
        favoriteVideoResource.addMethod('DELETE', lambdaIntegration, {
            requestParameters: {
                'method.request.path.videoId': true,
                'method.request.querystring.userId': true,
            },
        });
        // /api/search-history リソース
        const searchHistoryResource = apiResource.addResource('search-history');
        searchHistoryResource.addMethod('GET', lambdaIntegration, {
            requestParameters: {
                'method.request.querystring.userId': true,
            },
        });
        searchHistoryResource.addMethod('POST', lambdaIntegration);
        searchHistoryResource.addMethod('DELETE', lambdaIntegration, {
            requestParameters: {
                'method.request.querystring.userId': true,
            },
        });
        // /api/search-history/{timestamp}
        const timestampResource = searchHistoryResource.addResource('{timestamp}');
        timestampResource.addMethod('DELETE', lambdaIntegration, {
            requestParameters: {
                'method.request.path.timestamp': true,
                'method.request.querystring.userId': true,
            },
        });
        // ヘルスチェックエンドポイント
        const healthResource = apiResource.addResource('health');
        healthResource.addMethod('GET', lambdaIntegration);
    }
    setupWaf(config) {
        // WAF Web ACL
        const webAcl = new wafv2.CfnWebACL(this, 'ApiGatewayWebAcl', {
            scope: 'REGIONAL',
            defaultAction: { allow: {} },
            rules: [
                // レート制限ルール
                {
                    name: 'RateLimitRule',
                    priority: 1,
                    statement: {
                        rateBasedStatement: {
                            limit: 2000,
                            aggregateKeyType: 'IP',
                        },
                    },
                    action: { block: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'RateLimitRule',
                    },
                },
                // AWS管理ルール - 共通ルールセット
                {
                    name: 'AWSManagedRulesCommonRuleSet',
                    priority: 2,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesCommonRuleSet',
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'CommonRuleSetMetric',
                    },
                },
                // AWS管理ルール - 既知の悪いインプット
                {
                    name: 'AWSManagedRulesKnownBadInputsRuleSet',
                    priority: 3,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesKnownBadInputsRuleSet',
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'KnownBadInputsRuleSetMetric',
                    },
                },
            ],
            visibilityConfig: {
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
                metricName: 'YouTubeEfootballWebAcl',
            },
            tags: [
                {
                    key: 'Name',
                    value: `youtube-efootball-waf-${config.environment}`,
                },
                {
                    key: 'Environment',
                    value: config.environment,
                },
            ],
        });
        // WAFをAPI Gatewayに関連付け
        new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
            resourceArn: this.api.deploymentStage.stageArn,
            webAclArn: webAcl.attrArn,
        });
    }
    createCloudWatchAlarms(config) {
        if (!config.monitoring.enableDetailedMonitoring) {
            return;
        }
        // 4XXエラーアラーム
        this.api.metricClientError().createAlarm(this, 'Api4XXErrorAlarm', {
            threshold: 10,
            evaluationPeriods: 2,
            alarmDescription: 'API Gateway 4XX error rate is high',
        });
        // 5XXエラーアラーム
        this.api.metricServerError().createAlarm(this, 'Api5XXErrorAlarm', {
            threshold: 5,
            evaluationPeriods: 2,
            alarmDescription: 'API Gateway 5XX error rate is high',
        });
        // レイテンシアラーム
        this.api.metricLatency().createAlarm(this, 'ApiLatencyAlarm', {
            threshold: 5000,
            evaluationPeriods: 2,
            alarmDescription: 'API Gateway latency is high',
        });
    }
}
exports.ApiGateway = ApiGateway;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWdhdGV3YXkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcGktZ2F0ZXdheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1RUFBeUQ7QUFFekQsMkRBQTZDO0FBQzdDLDZEQUErQztBQUMvQywyQ0FBdUM7QUFRdkMsTUFBYSxVQUFXLFNBQVEsc0JBQVM7SUFJdkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTFDLHVCQUF1QjtRQUN2QixNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzdELFlBQVksRUFBRSxxQ0FBcUMsTUFBTSxDQUFDLFdBQVcsRUFBRTtZQUN2RSxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3JDLGFBQWEsRUFBRSxNQUFNLENBQUMsV0FBVyxLQUFLLE1BQU07Z0JBQzFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07Z0JBQzFCLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDOUIsQ0FBQyxDQUFDO1FBRUgsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7WUFDN0MsV0FBVyxFQUFFLHlCQUF5QixNQUFNLENBQUMsV0FBVyxFQUFFO1lBQzFELFdBQVcsRUFBRSxrQ0FBa0MsTUFBTSxDQUFDLFdBQVcsRUFBRTtZQUVuRSxTQUFTO1lBQ1QsMkJBQTJCLEVBQUU7Z0JBQzNCLFlBQVksRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FB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QUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ2pFLFNBQVMsRUFBRSxFQUFFO1lBQ2IsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixnQkFBZ0IsRUFBRSxvQ0FBb0M7U0FDdkQsQ0FBQyxDQUFDO1FBRUgsYUFBYTtRQUNiLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ2pFLFNBQVMsRUFBRSxDQUFDO1lBQ1osaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixnQkFBZ0IsRUFBRSxvQ0FBb0M7U0FDdkQsQ0FBQyxDQUFDO1FBRUgsWUFBWTtRQUNaLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUM1RCxTQUFTLEVBQUUsSUFBSTtZQUNmLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsZ0JBQWdCLEVBQUUsNkJBQTZCO1NBQ2hELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTlSRCxnQ0E4UkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIHdhZnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy13YWZ2Mic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVudmlyb25tZW50Q29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL2Vudmlyb25tZW50JztcblxuZXhwb3J0IGludGVyZmFjZSBBcGlHYXRld2F5UHJvcHMge1xuICBjb25maWc6IEVudmlyb25tZW50Q29uZmlnO1xuICBiYWNrZW5kRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcbn1cblxuZXhwb3J0IGNsYXNzIEFwaUdhdGV3YXkgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgYXBpOiBhcGlnYXRld2F5LlJlc3RBcGk7XG4gIHB1YmxpYyByZWFkb25seSBkb21haW5OYW1lPzogYXBpZ2F0ZXdheS5Eb21haW5OYW1lO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBcGlHYXRld2F5UHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgeyBjb25maWcsIGJhY2tlbmRGdW5jdGlvbiB9ID0gcHJvcHM7XG5cbiAgICAvLyBDbG91ZFdhdGNoIExvZ3Mg44Kw44Or44O844OXXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnQXBpR2F0ZXdheUxvZ0dyb3VwJywge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9hcGlnYXRld2F5L3lvdXR1YmUtZWZvb3RiYWxsLSR7Y29uZmlnLmVudmlyb25tZW50fWAsXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5EQVlTXzE0LFxuICAgICAgcmVtb3ZhbFBvbGljeTogY29uZmlnLmVudmlyb25tZW50ID09PSAncHJvZCcgXG4gICAgICAgID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIFxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheSBSRVNUIEFQSVxuICAgIHRoaXMuYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnQXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6IGB5b3V0dWJlLWVmb290YmFsbC1hcGktJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiBgWW91VHViZSBlRm9vdGJhbGwgUGxheWVyIEFQSSAtICR7Y29uZmlnLmVudmlyb25tZW50fWAsXG4gICAgICBcbiAgICAgIC8vIENPUlPoqK3lrppcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGNvbmZpZy5hcGlHYXRld2F5LmNvcnMuYWxsb3dPcmlnaW5zLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGNvbmZpZy5hcGlHYXRld2F5LmNvcnMuYWxsb3dNZXRob2RzLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IGNvbmZpZy5hcGlHYXRld2F5LmNvcnMuYWxsb3dIZWFkZXJzLFxuICAgICAgICBhbGxvd0NyZWRlbnRpYWxzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBcbiAgICAgIC8vIOOCueODreODg+ODiOODquODs+OCsOioreWumlxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6IGNvbmZpZy5lbnZpcm9ubWVudCxcbiAgICAgICAgdGhyb3R0bGluZ1JhdGVMaW1pdDogY29uZmlnLmFwaUdhdGV3YXkudGhyb3R0bGluZy5yYXRlTGltaXQsXG4gICAgICAgIHRocm90dGxpbmdCdXJzdExpbWl0OiBjb25maWcuYXBpR2F0ZXdheS50aHJvdHRsaW5nLmJ1cnN0TGltaXQsXG4gICAgICAgIFxuICAgICAgICAvLyDjg63jgrDoqK3lrppcbiAgICAgICAgYWNjZXNzTG9nRGVzdGluYXRpb246IG5ldyBhcGlnYXRld2F5LkxvZ0dyb3VwTG9nRGVzdGluYXRpb24obG9nR3JvdXApLFxuICAgICAgICBhY2Nlc3NMb2dGb3JtYXQ6IGFwaWdhdGV3YXkuQWNjZXNzTG9nRm9ybWF0Lmpzb25XaXRoU3RhbmRhcmRGaWVsZHMoe1xuICAgICAgICAgIGNhbGxlcjogdHJ1ZSxcbiAgICAgICAgICBodHRwTWV0aG9kOiB0cnVlLFxuICAgICAgICAgIGlwOiB0cnVlLFxuICAgICAgICAgIHByb3RvY29sOiB0cnVlLFxuICAgICAgICAgIHJlcXVlc3RUaW1lOiB0cnVlLFxuICAgICAgICAgIHJlc291cmNlUGF0aDogdHJ1ZSxcbiAgICAgICAgICByZXNwb25zZUxlbmd0aDogdHJ1ZSxcbiAgICAgICAgICBzdGF0dXM6IHRydWUsXG4gICAgICAgICAgdXNlcjogdHJ1ZSxcbiAgICAgICAgfSksXG4gICAgICAgIFxuICAgICAgICAvLyBYLVJheeacieWKueWMllxuICAgICAgICB0cmFjaW5nRW5hYmxlZDogY29uZmlnLm1vbml0b3JpbmcuZW5hYmxlWFJheSxcbiAgICAgICAgXG4gICAgICAgIC8vIOODoeODiOODquOCr+OCueacieWKueWMllxuICAgICAgICBtZXRyaWNzRW5hYmxlZDogY29uZmlnLm1vbml0b3JpbmcuZW5hYmxlRGV0YWlsZWRNb25pdG9yaW5nLFxuICAgICAgICBkYXRhVHJhY2VFbmFibGVkOiBjb25maWcuZW52aXJvbm1lbnQgPT09ICdkZXYnLFxuICAgICAgICBsb2dnaW5nTGV2ZWw6IGNvbmZpZy5lbnZpcm9ubWVudCA9PT0gJ2RldicgXG4gICAgICAgICAgPyBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPIFxuICAgICAgICAgIDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuRVJST1IsXG4gICAgICB9LFxuICAgICAgXG4gICAgICAvLyDjgqjjg7Pjg4njg53jgqTjg7Pjg4joqK3lrppcbiAgICAgIGVuZHBvaW50Q29uZmlndXJhdGlvbjoge1xuICAgICAgICB0eXBlczogW2FwaWdhdGV3YXkuRW5kcG9pbnRUeXBlLlJFR0lPTkFMXSxcbiAgICAgIH0sXG4gICAgICBcbiAgICAgIC8vIOODkOOCpOODiuODquODoeODh+OCo+OCouOCv+OCpOODl1xuICAgICAgYmluYXJ5TWVkaWFUeXBlczogWydpbWFnZS8qJywgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddLFxuICAgIH0pO1xuXG4gICAgLy8gTGFtYmRh57Wx5ZCIXG4gICAgY29uc3QgbGFtYmRhSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihiYWNrZW5kRnVuY3Rpb24sIHtcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHsgJ2FwcGxpY2F0aW9uL2pzb24nOiAneyBcInN0YXR1c0NvZGVcIjogXCIyMDBcIiB9JyB9LFxuICAgICAgcHJveHk6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBBUEnjg6rjgr3jg7zjgrnjgajjg6Hjgr3jg4Pjg4njga7oqK3lrppcbiAgICB0aGlzLnNldHVwQXBpUmVzb3VyY2VzKGxhbWJkYUludGVncmF0aW9uLCBjb25maWcpO1xuXG4gICAgLy8gV0FG6Kit5a6a77yI5pys55Wq55Kw5aKD44Gu44G/77yJXG4gICAgaWYgKGNvbmZpZy5zZWN1cml0eS5lbmFibGVXYWYpIHtcbiAgICAgIHRoaXMuc2V0dXBXYWYoY29uZmlnKTtcbiAgICB9XG5cbiAgICAvLyBDbG91ZFdhdGNoIOOCouODqeODvOODoFxuICAgIHRoaXMuY3JlYXRlQ2xvdWRXYXRjaEFsYXJtcyhjb25maWcpO1xuXG4gICAgLy8g5Ye65YqbXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUdhdGV3YXlVcmwnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hcGkudXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdVUkwgb2YgdGhlIEFQSSBHYXRld2F5JyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2NvbmZpZy5lbnZpcm9ubWVudH0tQXBpR2F0ZXdheVVybGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpR2F0ZXdheUlkJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXBpLnJlc3RBcGlJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnSUQgb2YgdGhlIEFQSSBHYXRld2F5JyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2NvbmZpZy5lbnZpcm9ubWVudH0tQXBpR2F0ZXdheUlkYCxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBBcGlSZXNvdXJjZXMobGFtYmRhSW50ZWdyYXRpb246IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24sIGNvbmZpZzogRW52aXJvbm1lbnRDb25maWcpIHtcbiAgICAvLyAvYXBpIOODquOCveODvOOCuVxuICAgIGNvbnN0IGFwaVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYXBpJyk7XG5cbiAgICAvLyAvYXBpL3ZpZGVvcyDjg6rjgr3jg7zjgrlcbiAgICBjb25zdCB2aWRlb3NSZXNvdXJjZSA9IGFwaVJlc291cmNlLmFkZFJlc291cmNlKCd2aWRlb3MnKTtcbiAgICBcbiAgICAvLyAvYXBpL3ZpZGVvcy9zZWFyY2hcbiAgICBjb25zdCBzZWFyY2hSZXNvdXJjZSA9IHZpZGVvc1Jlc291cmNlLmFkZFJlc291cmNlKCdzZWFyY2gnKTtcbiAgICBzZWFyY2hSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIGxhbWJkYUludGVncmF0aW9uLCB7XG4gICAgICByZXF1ZXN0UGFyYW1ldGVyczoge1xuICAgICAgICAnbWV0aG9kLnJlcXVlc3QucXVlcnlzdHJpbmcucSc6IGZhbHNlLFxuICAgICAgICAnbWV0aG9kLnJlcXVlc3QucXVlcnlzdHJpbmcuY2F0ZWdvcnknOiBmYWxzZSxcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnF1ZXJ5c3RyaW5nLm1heFJlc3VsdHMnOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyAvYXBpL3ZpZGVvcy9wb3B1bGFyXG4gICAgY29uc3QgcG9wdWxhclJlc291cmNlID0gdmlkZW9zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3BvcHVsYXInKTtcbiAgICBwb3B1bGFyUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbik7XG5cbiAgICAvLyAvYXBpL3ZpZGVvcy9yZWxhdGVkL3t2aWRlb0lkfVxuICAgIGNvbnN0IHJlbGF0ZWRSZXNvdXJjZSA9IHZpZGVvc1Jlc291cmNlLmFkZFJlc291cmNlKCdyZWxhdGVkJyk7XG4gICAgY29uc3QgdmlkZW9JZFJlc291cmNlID0gcmVsYXRlZFJlc291cmNlLmFkZFJlc291cmNlKCd7dmlkZW9JZH0nKTtcbiAgICB2aWRlb0lkUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbiwge1xuICAgICAgcmVxdWVzdFBhcmFtZXRlcnM6IHtcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnBhdGgudmlkZW9JZCc6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gL2FwaS9mYXZvcml0ZXMg44Oq44K944O844K5XG4gICAgY29uc3QgZmF2b3JpdGVzUmVzb3VyY2UgPSBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZmF2b3JpdGVzJyk7XG4gICAgZmF2b3JpdGVzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBsYW1iZGFJbnRlZ3JhdGlvbiwge1xuICAgICAgcmVxdWVzdFBhcmFtZXRlcnM6IHtcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnF1ZXJ5c3RyaW5nLnVzZXJJZCc6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIGZhdm9yaXRlc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIGxhbWJkYUludGVncmF0aW9uKTtcbiAgICBcbiAgICAvLyAvYXBpL2Zhdm9yaXRlcy97dmlkZW9JZH1cbiAgICBjb25zdCBmYXZvcml0ZVZpZGVvUmVzb3VyY2UgPSBmYXZvcml0ZXNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne3ZpZGVvSWR9Jyk7XG4gICAgZmF2b3JpdGVWaWRlb1Jlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbGFtYmRhSW50ZWdyYXRpb24sIHtcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdtZXRob2QucmVxdWVzdC5wYXRoLnZpZGVvSWQnOiB0cnVlLFxuICAgICAgICAnbWV0aG9kLnJlcXVlc3QucXVlcnlzdHJpbmcudXNlcklkJzogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyAvYXBpL3NlYXJjaC1oaXN0b3J5IOODquOCveODvOOCuVxuICAgIGNvbnN0IHNlYXJjaEhpc3RvcnlSZXNvdXJjZSA9IGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdzZWFyY2gtaGlzdG9yeScpO1xuICAgIHNlYXJjaEhpc3RvcnlSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIGxhbWJkYUludGVncmF0aW9uLCB7XG4gICAgICByZXF1ZXN0UGFyYW1ldGVyczoge1xuICAgICAgICAnbWV0aG9kLnJlcXVlc3QucXVlcnlzdHJpbmcudXNlcklkJzogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgc2VhcmNoSGlzdG9yeVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIGxhbWJkYUludGVncmF0aW9uKTtcbiAgICBzZWFyY2hIaXN0b3J5UmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBsYW1iZGFJbnRlZ3JhdGlvbiwge1xuICAgICAgcmVxdWVzdFBhcmFtZXRlcnM6IHtcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnF1ZXJ5c3RyaW5nLnVzZXJJZCc6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gL2FwaS9zZWFyY2gtaGlzdG9yeS97dGltZXN0YW1wfVxuICAgIGNvbnN0IHRpbWVzdGFtcFJlc291cmNlID0gc2VhcmNoSGlzdG9yeVJlc291cmNlLmFkZFJlc291cmNlKCd7dGltZXN0YW1wfScpO1xuICAgIHRpbWVzdGFtcFJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbGFtYmRhSW50ZWdyYXRpb24sIHtcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdtZXRob2QucmVxdWVzdC5wYXRoLnRpbWVzdGFtcCc6IHRydWUsXG4gICAgICAgICdtZXRob2QucmVxdWVzdC5xdWVyeXN0cmluZy51c2VySWQnOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIOODmOODq+OCueODgeOCp+ODg+OCr+OCqOODs+ODieODneOCpOODs+ODiFxuICAgIGNvbnN0IGhlYWx0aFJlc291cmNlID0gYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xuICAgIGhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbGFtYmRhSW50ZWdyYXRpb24pO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXR1cFdhZihjb25maWc6IEVudmlyb25tZW50Q29uZmlnKSB7XG4gICAgLy8gV0FGIFdlYiBBQ0xcbiAgICBjb25zdCB3ZWJBY2wgPSBuZXcgd2FmdjIuQ2ZuV2ViQUNMKHRoaXMsICdBcGlHYXRld2F5V2ViQWNsJywge1xuICAgICAgc2NvcGU6ICdSRUdJT05BTCcsXG4gICAgICBkZWZhdWx0QWN0aW9uOiB7IGFsbG93OiB7fSB9LFxuICAgICAgcnVsZXM6IFtcbiAgICAgICAgLy8g44Os44O844OI5Yi26ZmQ44Or44O844OrXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnUmF0ZUxpbWl0UnVsZScsXG4gICAgICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICAgICAgc3RhdGVtZW50OiB7XG4gICAgICAgICAgICByYXRlQmFzZWRTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgbGltaXQ6IDIwMDAsXG4gICAgICAgICAgICAgIGFnZ3JlZ2F0ZUtleVR5cGU6ICdJUCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYWN0aW9uOiB7IGJsb2NrOiB7fSB9LFxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnUmF0ZUxpbWl0UnVsZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgLy8gQVdT566h55CG44Or44O844OrIC0g5YWx6YCa44Or44O844Or44K744OD44OIXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzQ29tbW9uUnVsZVNldCcsXG4gICAgICAgICAgcHJpb3JpdHk6IDIsXG4gICAgICAgICAgb3ZlcnJpZGVBY3Rpb246IHsgbm9uZToge30gfSxcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgIG1hbmFnZWRSdWxlR3JvdXBTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgdmVuZG9yTmFtZTogJ0FXUycsXG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0NvbW1vblJ1bGVTZXRNZXRyaWMnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIC8vIEFXU+euoeeQhuODq+ODvOODqyAtIOaXouefpeOBruaCquOBhOOCpOODs+ODl+ODg+ODiFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzUnVsZVNldCcsXG4gICAgICAgICAgcHJpb3JpdHk6IDMsXG4gICAgICAgICAgb3ZlcnJpZGVBY3Rpb246IHsgbm9uZToge30gfSxcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgIG1hbmFnZWRSdWxlR3JvdXBTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgdmVuZG9yTmFtZTogJ0FXUycsXG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNLbm93bkJhZElucHV0c1J1bGVTZXQnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnS25vd25CYWRJbnB1dHNSdWxlU2V0TWV0cmljJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICBtZXRyaWNOYW1lOiAnWW91VHViZUVmb290YmFsbFdlYkFjbCcsXG4gICAgICB9LFxuICAgICAgdGFnczogW1xuICAgICAgICB7XG4gICAgICAgICAga2V5OiAnTmFtZScsXG4gICAgICAgICAgdmFsdWU6IGB5b3V0dWJlLWVmb290YmFsbC13YWYtJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGtleTogJ0Vudmlyb25tZW50JyxcbiAgICAgICAgICB2YWx1ZTogY29uZmlnLmVudmlyb25tZW50LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIFdBRuOCkkFQSSBHYXRld2F544Gr6Zai6YCj5LuY44GRXG4gICAgbmV3IHdhZnYyLkNmbldlYkFDTEFzc29jaWF0aW9uKHRoaXMsICdXZWJBY2xBc3NvY2lhdGlvbicsIHtcbiAgICAgIHJlc291cmNlQXJuOiB0aGlzLmFwaS5kZXBsb3ltZW50U3RhZ2Uuc3RhZ2VBcm4sXG4gICAgICB3ZWJBY2xBcm46IHdlYkFjbC5hdHRyQXJuLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVDbG91ZFdhdGNoQWxhcm1zKGNvbmZpZzogRW52aXJvbm1lbnRDb25maWcpIHtcbiAgICBpZiAoIWNvbmZpZy5tb25pdG9yaW5nLmVuYWJsZURldGFpbGVkTW9uaXRvcmluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIDRYWOOCqOODqeODvOOCouODqeODvOODoFxuICAgIHRoaXMuYXBpLm1ldHJpY0NsaWVudEVycm9yKCkuY3JlYXRlQWxhcm0odGhpcywgJ0FwaTRYWEVycm9yQWxhcm0nLCB7XG4gICAgICB0aHJlc2hvbGQ6IDEwLFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgNFhYIGVycm9yIHJhdGUgaXMgaGlnaCcsXG4gICAgfSk7XG5cbiAgICAvLyA1WFjjgqjjg6njg7zjgqLjg6njg7zjg6BcbiAgICB0aGlzLmFwaS5tZXRyaWNTZXJ2ZXJFcnJvcigpLmNyZWF0ZUFsYXJtKHRoaXMsICdBcGk1WFhFcnJvckFsYXJtJywge1xuICAgICAgdGhyZXNob2xkOiA1LFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgNVhYIGVycm9yIHJhdGUgaXMgaGlnaCcsXG4gICAgfSk7XG5cbiAgICAvLyDjg6zjgqTjg4bjg7PjgrfjgqLjg6njg7zjg6BcbiAgICB0aGlzLmFwaS5tZXRyaWNMYXRlbmN5KCkuY3JlYXRlQWxhcm0odGhpcywgJ0FwaUxhdGVuY3lBbGFybScsIHtcbiAgICAgIHRocmVzaG9sZDogNTAwMCwgLy8gNeenklxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgbGF0ZW5jeSBpcyBoaWdoJyxcbiAgICB9KTtcbiAgfVxufSJdfQ==