import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface LambdaFunctionsProps {
  config: EnvironmentConfig;
  favoritesTable: dynamodb.Table;
  searchHistoryTable: dynamodb.Table;
  redisCluster: elasticache.CfnCacheCluster;
  vpc: ec2.Vpc;
}

export class LambdaFunctions extends Construct {
  public readonly backendFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaFunctionsProps) {
    super(scope, id);

    const { config, favoritesTable, searchHistoryTable, redisCluster, vpc } = props;

    // Lambda実行ロール
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // DynamoDBアクセス権限
    favoritesTable.grantReadWriteData(lambdaRole);
    searchHistoryTable.grantReadWriteData(lambdaRole);

    // CloudWatch Logs権限
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));

    // X-Ray権限（有効な場合）
    if (config.monitoring.enableXRay) {
      lambdaRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
        ],
        resources: ['*'],
      }));
    }

    // セキュリティグループ
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda function',
      allowAllOutbound: true,
    });

    // Redisアクセス用のセキュリティグループルール
    lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(6379),
      'Allow Redis access'
    );

    // Lambda関数の環境変数
    const environment: Record<string, string> = {
      ...config.lambda.environment,
      DYNAMODB_FAVORITES_TABLE: favoritesTable.tableName,
      DYNAMODB_SEARCH_HISTORY_TABLE: searchHistoryTable.tableName,
      REDIS_ENDPOINT: redisCluster.attrRedisEndpointAddress,
      REDIS_PORT: redisCluster.attrRedisEndpointPort,
      AWS_REGION: config.region,
    };

    // YouTube API Keyは外部から設定
    if (process.env.YOUTUBE_API_KEY) {
      environment.YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    }

    // Lambda関数（コンテナイメージ）
    this.backendFunction = new lambda.Function(this, 'BackendFunction', {
      functionName: `youtube-efootball-backend-${config.environment}`,
      code: lambda.Code.fromAssetImage('../backend', {
        file: 'Dockerfile.lambda',
      }),
      handler: lambda.Handler.FROM_IMAGE,
      runtime: lambda.Runtime.FROM_IMAGE,
      memorySize: config.lambda.memorySize,
      timeout: cdk.Duration.seconds(config.lambda.timeout),
      role: lambdaRole,
      environment,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
      reservedConcurrentExecutions: config.lambda.reservedConcurrency,
      
      // X-Ray有効化
      tracing: config.monitoring.enableXRay 
        ? lambda.Tracing.ACTIVE 
        : lambda.Tracing.DISABLED,
      
      // ログ設定
      logRetention: logs.RetentionDays.DAYS_14,
      
      // デッドレターキュー
      deadLetterQueue: new cdk.aws_sqs.Queue(this, 'BackendFunctionDLQ', {
        queueName: `youtube-efootball-backend-dlq-${config.environment}`,
        retentionPeriod: cdk.Duration.days(14),
      }),
      
      // タグ
      tags: {
        Name: `youtube-efootball-backend-${config.environment}`,
        Purpose: 'Backend API for YouTube eFootball Player',
        Environment: config.environment,
      },
    });

    // CloudWatch アラーム
    this.createCloudWatchAlarms(config);

    // 出力
    new cdk.CfnOutput(this, 'BackendFunctionName', {
      value: this.backendFunction.functionName,
      description: 'Name of the backend Lambda function',
      exportName: `${config.environment}-BackendFunctionName`,
    });

    new cdk.CfnOutput(this, 'BackendFunctionArn', {
      value: this.backendFunction.functionArn,
      description: 'ARN of the backend Lambda function',
      exportName: `${config.environment}-BackendFunctionArn`,
    });
  }

  private createCloudWatchAlarms(config: EnvironmentConfig) {
    if (!config.monitoring.enableDetailedMonitoring) {
      return;
    }

    // エラー率アラーム
    this.backendFunction.metricErrors().createAlarm(this, 'BackendFunctionErrorAlarm', {
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'Backend function error rate is high',
    });

    // 実行時間アラーム
    this.backendFunction.metricDuration().createAlarm(this, 'BackendFunctionDurationAlarm', {
      threshold: cdk.Duration.seconds(config.lambda.timeout * 0.8).toMilliseconds(),
      evaluationPeriods: 2,
      alarmDescription: 'Backend function duration is high',
    });

    // スロットリングアラーム
    this.backendFunction.metricThrottles().createAlarm(this, 'BackendFunctionThrottleAlarm', {
      threshold: 5,
      evaluationPeriods: 2,
      alarmDescription: 'Backend function is being throttled',
    });
  }
}