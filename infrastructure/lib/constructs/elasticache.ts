import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface ElastiCacheProps {
  config: EnvironmentConfig;
  vpc: ec2.Vpc;
}

export class ElastiCache extends Construct {
  public readonly cluster: elasticache.CfnCacheCluster;
  public readonly subnetGroup: elasticache.CfnSubnetGroup;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: ElastiCacheProps) {
    super(scope, id);

    const { config, vpc } = props;

    // セキュリティグループ
    this.securityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for Redis cluster',
      allowAllOutbound: false,
    });

    // Lambda関数からのアクセスを許可
    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(6379),
      'Allow Redis access from VPC'
    );

    // サブネットグループ
    this.subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis cluster',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
      cacheSubnetGroupName: `youtube-efootball-redis-subnet-group-${config.environment}`,
    });

    // パラメータグループ
    const parameterGroup = new elasticache.CfnParameterGroup(this, 'RedisParameterGroup', {
      cacheParameterGroupFamily: 'redis7.x',
      description: 'Parameter group for Redis cluster',
      properties: {
        'maxmemory-policy': 'allkeys-lru',
        'timeout': '300',
        'tcp-keepalive': '60',
      },
    });

    // Redis クラスター
    this.cluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: config.elasticache.nodeType,
      engine: 'redis',
      engineVersion: config.elasticache.engineVersion,
      numCacheNodes: config.elasticache.numCacheNodes,
      clusterName: `youtube-efootball-redis-${config.environment}`,
      
      // ネットワーク設定
      cacheSubnetGroupName: this.subnetGroup.ref,
      vpcSecurityGroupIds: [this.securityGroup.securityGroupId],
      
      // パラメータグループ
      cacheParameterGroupName: parameterGroup.ref,
      
      // セキュリティ設定
      transitEncryptionEnabled: config.environment === 'prod',
      atRestEncryptionEnabled: config.environment === 'prod',
      authToken: config.environment === 'prod' ? this.generateAuthToken() : undefined,
      
      // バックアップ設定
      snapshotRetentionLimit: config.environment === 'prod' ? 7 : 1,
      snapshotWindow: config.environment === 'prod' ? '03:00-05:00' : '05:00-06:00',
      
      // メンテナンス設定
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      autoMinorVersionUpgrade: config.environment !== 'prod',
      
      // 通知設定
      notificationTopicArn: config.environment === 'prod' ? this.createSnsTopicForNotifications() : undefined,
      
      // ログ配信設定
      logDeliveryConfigurations: config.monitoring.enableDetailedMonitoring ? [
        {
          destinationType: 'cloudwatch-logs',
          destinationDetails: {
            logGroup: `/aws/elasticache/redis/${config.environment}`,
          },
          logFormat: 'json',
          logType: 'slow-log',
        },
      ] : undefined,
      
      // タグ
      tags: [
        {
          key: 'Name',
          value: `youtube-efootball-redis-${config.environment}`,
        },
        {
          key: 'Environment',
          value: config.environment,
        },
        {
          key: 'Purpose',
          value: 'Cache for YouTube API responses',
        },
        {
          key: 'BackupRetention',
          value: config.environment === 'prod' ? '7days' : '1day',
        },
      ],
    });

    // CloudWatch アラーム
    this.createCloudWatchAlarms(config);

    // 出力
    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.cluster.attrRedisEndpointAddress,
      description: 'Redis cluster endpoint',
      exportName: `${config.environment}-RedisEndpoint`,
    });

    new cdk.CfnOutput(this, 'RedisPort', {
      value: this.cluster.attrRedisEndpointPort,
      description: 'Redis cluster port',
      exportName: `${config.environment}-RedisPort`,
    });
  }

  private createSnsTopicForNotifications(): string {
    const topic = new cdk.aws_sns.Topic(this, 'RedisNotificationTopic', {
      topicName: `youtube-efootball-redis-notifications-${this.node.tryGetContext('environment')}`,
      displayName: 'Redis Cluster Notifications',
    });

    return topic.topicArn;
  }

  private generateAuthToken(): string {
    // 本番環境では、Secrets Managerから取得することを推奨
    const secret = new cdk.aws_secretsmanager.Secret(this, 'RedisAuthToken', {
      secretName: `youtube-efootball-redis-auth-${this.node.tryGetContext('environment')}`,
      description: 'Redis cluster authentication token',
      generateSecretString: {
        secretStringTemplate: '{}',
        generateStringKey: 'authToken',
        excludeCharacters: '"@/\\',
        passwordLength: 32,
      },
    });

    return secret.secretValueFromJson('authToken').unsafeUnwrap();
  }

  private createCloudWatchAlarms(config: EnvironmentConfig) {
    if (!config.monitoring.enableDetailedMonitoring) {
      return;
    }

    // CPU使用率アラーム
    new cdk.aws_cloudwatch.Alarm(this, 'RedisCpuAlarm', {
      metric: new cdk.aws_cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Redis CPU utilization is high',
    });

    // メモリ使用率アラーム
    new cdk.aws_cloudwatch.Alarm(this, 'RedisMemoryAlarm', {
      metric: new cdk.aws_cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'DatabaseMemoryUsagePercentage',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 90,
      evaluationPeriods: 2,
      alarmDescription: 'Redis memory usage is high',
    });

    // 接続数アラーム
    new cdk.aws_cloudwatch.Alarm(this, 'RedisConnectionsAlarm', {
      metric: new cdk.aws_cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CurrConnections',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 50,
      evaluationPeriods: 2,
      alarmDescription: 'Redis connection count is high',
    });
  }
}