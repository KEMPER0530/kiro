import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface ApiGatewayProps {
  config: EnvironmentConfig;
  backendFunction: lambda.Function;
}

export class ApiGateway extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly domainName?: apigateway.DomainName;

  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
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

  private setupApiResources(lambdaIntegration: apigateway.LambdaIntegration, config: EnvironmentConfig) {
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

  private setupWaf(config: EnvironmentConfig) {
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

  private createCloudWatchAlarms(config: EnvironmentConfig) {
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
      threshold: 5000, // 5秒
      evaluationPeriods: 2,
      alarmDescription: 'API Gateway latency is high',
    });
  }
}