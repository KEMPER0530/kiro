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
exports.ElastiCache = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const elasticache = __importStar(require("aws-cdk-lib/aws-elasticache"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const constructs_1 = require("constructs");
class ElastiCache extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { config, vpc } = props;
        // セキュリティグループ
        this.securityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
            vpc,
            description: 'Security group for Redis cluster',
            allowAllOutbound: false,
        });
        // Lambda関数からのアクセスを許可
        this.securityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(6379), 'Allow Redis access from VPC');
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
    createSnsTopicForNotifications() {
        const topic = new cdk.aws_sns.Topic(this, 'RedisNotificationTopic', {
            topicName: `youtube-efootball-redis-notifications-${this.node.tryGetContext('environment')}`,
            displayName: 'Redis Cluster Notifications',
        });
        return topic.topicArn;
    }
    generateAuthToken() {
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
    createCloudWatchAlarms(config) {
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
exports.ElastiCache = ElastiCache;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxhc3RpY2FjaGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlbGFzdGljYWNoZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5RUFBMkQ7QUFDM0QseURBQTJDO0FBQzNDLDJDQUF1QztBQVF2QyxNQUFhLFdBQVksU0FBUSxzQkFBUztJQUt4QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXVCO1FBQy9ELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFOUIsYUFBYTtRQUNiLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUNyRSxHQUFHO1lBQ0gsV0FBVyxFQUFFLGtDQUFrQztZQUMvQyxnQkFBZ0IsRUFBRSxLQUFLO1NBQ3hCLENBQUMsQ0FBQztRQUVILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FDL0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUMvQixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFDbEIsNkJBQTZCLENBQzlCLENBQUM7UUFFRixZQUFZO1FBQ1osSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzFFLFdBQVcsRUFBRSxnQ0FBZ0M7WUFDN0MsU0FBUyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztZQUM1RCxvQkFBb0IsRUFBRSx3Q0FBd0MsTUFBTSxDQUFDLFdBQVcsRUFBRTtTQUNuRixDQUFDLENBQUM7UUFFSCxZQUFZO1FBQ1osTUFBTSxjQUFjLEdBQUcsSUFBSSxXQUFXLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQ3BGLHlCQUF5QixFQUFFLFVBQVU7WUFDckMsV0FBVyxFQUFFLG1DQUFtQztZQUNoRCxVQUFVLEVBQUU7Z0JBQ1Ysa0JBQWtCLEVBQUUsYUFBYTtnQkFDakMsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGVBQWUsRUFBRSxJQUFJO2FBQ3RCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsY0FBYztRQUNkLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxXQUFXLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDbkUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUTtZQUMxQyxNQUFNLEVBQUUsT0FBTztZQUNmLGFBQWEsRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWE7WUFDL0MsYUFBYSxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYTtZQUMvQyxXQUFXLEVBQUUsMkJBQTJCLE1BQU0sQ0FBQyxXQUFXLEVBQUU7WUFFNUQsV0FBVztZQUNYLG9CQUFvQixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRztZQUMxQyxtQkFBbUIsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDO1lBRXpELFlBQVk7WUFDWix1QkFBdUIsRUFBRSxjQUFjLENBQUMsR0FBRztZQUUzQyxXQUFXO1lBQ1gsd0JBQXdCLEVBQUUsTUFBTSxDQUFDLFdBQVcsS0FBSyxNQUFNO1lBQ3ZELHVCQUF1QixFQUFFLE1BQU0sQ0FBQyxXQUFXLEtBQUssTUFBTTtZQUN0RCxTQUFTLEVBQUUsTUFBTSxDQUFDLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBRS9FLFdBQVc7WUFDWCxzQkFBc0IsRUFBRSxNQUFNLENBQUMsV0FBVyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdELGNBQWMsRUFBRSxNQUFNLENBQUMsV0FBVyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhO1lBRTdFLFdBQVc7WUFDWCwwQkFBMEIsRUFBRSxxQkFBcUI7WUFDakQsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLFdBQVcsS0FBSyxNQUFNO1lBRXRELE9BQU87WUFDUCxvQkFBb0IsRUFBRSxNQUFNLENBQUMsV0FBVyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFFdkcsU0FBUztZQUNULHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO2dCQUN0RTtvQkFDRSxlQUFlLEVBQUUsaUJBQWlCO29CQUNsQyxrQkFBa0IsRUFBRTt3QkFDbEIsUUFBUSxFQUFFLDBCQUEwQixNQUFNLENBQUMsV0FBVyxFQUFFO3FCQUN6RDtvQkFDRCxTQUFTLEVBQUUsTUFBTTtvQkFDakIsT0FBTyxFQUFFLFVBQVU7aUJBQ3BCO2FBQ0YsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUViLEtBQUs7WUFDTCxJQUFJLEVBQUU7Z0JBQ0o7b0JBQ0UsR0FBRyxFQUFFLE1BQU07b0JBQ1gsS0FBSyxFQUFFLDJCQUEyQixNQUFNLENBQUMsV0FBVyxFQUFFO2lCQUN2RDtnQkFDRDtvQkFDRSxHQUFHLEVBQUUsYUFBYTtvQkFDbEIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxXQUFXO2lCQUMxQjtnQkFDRDtvQkFDRSxHQUFHLEVBQUUsU0FBUztvQkFDZCxLQUFLLEVBQUUsaUNBQWlDO2lCQUN6QztnQkFDRDtvQkFDRSxHQUFHLEVBQUUsaUJBQWlCO29CQUN0QixLQUFLLEVBQUUsTUFBTSxDQUFDLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTTtpQkFDeEQ7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFcEMsS0FBSztRQUNMLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QjtZQUM1QyxXQUFXLEVBQUUsd0JBQXdCO1lBQ3JDLFVBQVUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxXQUFXLGdCQUFnQjtTQUNsRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUNuQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUI7WUFDekMsV0FBVyxFQUFFLG9CQUFvQjtZQUNqQyxVQUFVLEVBQUUsR0FBRyxNQUFNLENBQUMsV0FBVyxZQUFZO1NBQzlDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyw4QkFBOEI7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDbEUsU0FBUyxFQUFFLHlDQUF5QyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsRUFBRTtZQUM1RixXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQztRQUVILE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQztJQUN4QixDQUFDO0lBRU8saUJBQWlCO1FBQ3ZCLG9DQUFvQztRQUNwQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3ZFLFVBQVUsRUFBRSxnQ0FBZ0MsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFDcEYsV0FBVyxFQUFFLG9DQUFvQztZQUNqRCxvQkFBb0IsRUFBRTtnQkFDcEIsb0JBQW9CLEVBQUUsSUFBSTtnQkFDMUIsaUJBQWlCLEVBQUUsV0FBVztnQkFDOUIsaUJBQWlCLEVBQUUsT0FBTztnQkFDMUIsY0FBYyxFQUFFLEVBQUU7YUFDbkI7U0FDRixDQUFDLENBQUM7UUFFSCxPQUFPLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNoRSxDQUFDO0lBRU8sc0JBQXNCLENBQUMsTUFBeUI7UUFDdEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsd0JBQXdCLEVBQUU7WUFDL0MsT0FBTztTQUNSO1FBRUQsYUFBYTtRQUNiLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUNsRCxNQUFNLEVBQUUsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztnQkFDcEMsU0FBUyxFQUFFLGlCQUFpQjtnQkFDNUIsVUFBVSxFQUFFLGdCQUFnQjtnQkFDNUIsYUFBYSxFQUFFO29CQUNiLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUc7aUJBQ2pDO2dCQUNELFNBQVMsRUFBRSxTQUFTO2dCQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ2hDLENBQUM7WUFDRixTQUFTLEVBQUUsRUFBRTtZQUNiLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsZ0JBQWdCLEVBQUUsK0JBQStCO1NBQ2xELENBQUMsQ0FBQztRQUVILGFBQWE7UUFDYixJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUNyRCxNQUFNLEVBQUUsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztnQkFDcEMsU0FBUyxFQUFFLGlCQUFpQjtnQkFDNUIsVUFBVSxFQUFFLCtCQUErQjtnQkFDM0MsYUFBYSxFQUFFO29CQUNiLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUc7aUJBQ2pDO2dCQUNELFNBQVMsRUFBRSxTQUFTO2dCQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ2hDLENBQUM7WUFDRixTQUFTLEVBQUUsRUFBRTtZQUNiLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsZ0JBQWdCLEVBQUUsNEJBQTRCO1NBQy9DLENBQUMsQ0FBQztRQUVILFVBQVU7UUFDVixJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMxRCxNQUFNLEVBQUUsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztnQkFDcEMsU0FBUyxFQUFFLGlCQUFpQjtnQkFDNUIsVUFBVSxFQUFFLGlCQUFpQjtnQkFDN0IsYUFBYSxFQUFFO29CQUNiLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUc7aUJBQ2pDO2dCQUNELFNBQVMsRUFBRSxTQUFTO2dCQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ2hDLENBQUM7WUFDRixTQUFTLEVBQUUsRUFBRTtZQUNiLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsZ0JBQWdCLEVBQUUsZ0NBQWdDO1NBQ25ELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXpNRCxrQ0F5TUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWxhc3RpY2FjaGUgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNhY2hlJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRW52aXJvbm1lbnRDb25maWcgfSBmcm9tICcuLi9jb25maWcvZW52aXJvbm1lbnQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEVsYXN0aUNhY2hlUHJvcHMge1xuICBjb25maWc6IEVudmlyb25tZW50Q29uZmlnO1xuICB2cGM6IGVjMi5WcGM7XG59XG5cbmV4cG9ydCBjbGFzcyBFbGFzdGlDYWNoZSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBjbHVzdGVyOiBlbGFzdGljYWNoZS5DZm5DYWNoZUNsdXN0ZXI7XG4gIHB1YmxpYyByZWFkb25seSBzdWJuZXRHcm91cDogZWxhc3RpY2FjaGUuQ2ZuU3VibmV0R3JvdXA7XG4gIHB1YmxpYyByZWFkb25seSBzZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRWxhc3RpQ2FjaGVQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB7IGNvbmZpZywgdnBjIH0gPSBwcm9wcztcblxuICAgIC8vIOOCu+OCreODpeODquODhuOCo+OCsOODq+ODvOODl1xuICAgIHRoaXMuc2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnUmVkaXNTZWN1cml0eUdyb3VwJywge1xuICAgICAgdnBjLFxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgUmVkaXMgY2x1c3RlcicsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYemWouaVsOOBi+OCieOBruOCouOCr+OCu+OCueOCkuioseWPr1xuICAgIHRoaXMuc2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGVjMi5QZWVyLmlwdjQodnBjLnZwY0NpZHJCbG9jayksXG4gICAgICBlYzIuUG9ydC50Y3AoNjM3OSksXG4gICAgICAnQWxsb3cgUmVkaXMgYWNjZXNzIGZyb20gVlBDJ1xuICAgICk7XG5cbiAgICAvLyDjgrXjg5bjg43jg4Pjg4jjgrDjg6vjg7zjg5dcbiAgICB0aGlzLnN1Ym5ldEdyb3VwID0gbmV3IGVsYXN0aWNhY2hlLkNmblN1Ym5ldEdyb3VwKHRoaXMsICdSZWRpc1N1Ym5ldEdyb3VwJywge1xuICAgICAgZGVzY3JpcHRpb246ICdTdWJuZXQgZ3JvdXAgZm9yIFJlZGlzIGNsdXN0ZXInLFxuICAgICAgc3VibmV0SWRzOiB2cGMucHJpdmF0ZVN1Ym5ldHMubWFwKHN1Ym5ldCA9PiBzdWJuZXQuc3VibmV0SWQpLFxuICAgICAgY2FjaGVTdWJuZXRHcm91cE5hbWU6IGB5b3V0dWJlLWVmb290YmFsbC1yZWRpcy1zdWJuZXQtZ3JvdXAtJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIC8vIOODkeODqeODoeODvOOCv+OCsOODq+ODvOODl1xuICAgIGNvbnN0IHBhcmFtZXRlckdyb3VwID0gbmV3IGVsYXN0aWNhY2hlLkNmblBhcmFtZXRlckdyb3VwKHRoaXMsICdSZWRpc1BhcmFtZXRlckdyb3VwJywge1xuICAgICAgY2FjaGVQYXJhbWV0ZXJHcm91cEZhbWlseTogJ3JlZGlzNy54JyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUGFyYW1ldGVyIGdyb3VwIGZvciBSZWRpcyBjbHVzdGVyJyxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgJ21heG1lbW9yeS1wb2xpY3knOiAnYWxsa2V5cy1scnUnLFxuICAgICAgICAndGltZW91dCc6ICczMDAnLFxuICAgICAgICAndGNwLWtlZXBhbGl2ZSc6ICc2MCcsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gUmVkaXMg44Kv44Op44K544K/44O8XG4gICAgdGhpcy5jbHVzdGVyID0gbmV3IGVsYXN0aWNhY2hlLkNmbkNhY2hlQ2x1c3Rlcih0aGlzLCAnUmVkaXNDbHVzdGVyJywge1xuICAgICAgY2FjaGVOb2RlVHlwZTogY29uZmlnLmVsYXN0aWNhY2hlLm5vZGVUeXBlLFxuICAgICAgZW5naW5lOiAncmVkaXMnLFxuICAgICAgZW5naW5lVmVyc2lvbjogY29uZmlnLmVsYXN0aWNhY2hlLmVuZ2luZVZlcnNpb24sXG4gICAgICBudW1DYWNoZU5vZGVzOiBjb25maWcuZWxhc3RpY2FjaGUubnVtQ2FjaGVOb2RlcyxcbiAgICAgIGNsdXN0ZXJOYW1lOiBgeW91dHViZS1lZm9vdGJhbGwtcmVkaXMtJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgIFxuICAgICAgLy8g44ON44OD44OI44Ov44O844Kv6Kit5a6aXG4gICAgICBjYWNoZVN1Ym5ldEdyb3VwTmFtZTogdGhpcy5zdWJuZXRHcm91cC5yZWYsXG4gICAgICB2cGNTZWN1cml0eUdyb3VwSWRzOiBbdGhpcy5zZWN1cml0eUdyb3VwLnNlY3VyaXR5R3JvdXBJZF0sXG4gICAgICBcbiAgICAgIC8vIOODkeODqeODoeODvOOCv+OCsOODq+ODvOODl1xuICAgICAgY2FjaGVQYXJhbWV0ZXJHcm91cE5hbWU6IHBhcmFtZXRlckdyb3VwLnJlZixcbiAgICAgIFxuICAgICAgLy8g44K744Kt44Ol44Oq44OG44Kj6Kit5a6aXG4gICAgICB0cmFuc2l0RW5jcnlwdGlvbkVuYWJsZWQ6IGNvbmZpZy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxuICAgICAgYXRSZXN0RW5jcnlwdGlvbkVuYWJsZWQ6IGNvbmZpZy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxuICAgICAgYXV0aFRva2VuOiBjb25maWcuZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IHRoaXMuZ2VuZXJhdGVBdXRoVG9rZW4oKSA6IHVuZGVmaW5lZCxcbiAgICAgIFxuICAgICAgLy8g44OQ44OD44Kv44Ki44OD44OX6Kit5a6aXG4gICAgICBzbmFwc2hvdFJldGVudGlvbkxpbWl0OiBjb25maWcuZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IDcgOiAxLFxuICAgICAgc25hcHNob3RXaW5kb3c6IGNvbmZpZy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gJzAzOjAwLTA1OjAwJyA6ICcwNTowMC0wNjowMCcsXG4gICAgICBcbiAgICAgIC8vIOODoeODs+ODhuODiuODs+OCueioreWumlxuICAgICAgcHJlZmVycmVkTWFpbnRlbmFuY2VXaW5kb3c6ICdzdW46MDU6MDAtc3VuOjA2OjAwJyxcbiAgICAgIGF1dG9NaW5vclZlcnNpb25VcGdyYWRlOiBjb25maWcuZW52aXJvbm1lbnQgIT09ICdwcm9kJyxcbiAgICAgIFxuICAgICAgLy8g6YCa55+l6Kit5a6aXG4gICAgICBub3RpZmljYXRpb25Ub3BpY0FybjogY29uZmlnLmVudmlyb25tZW50ID09PSAncHJvZCcgPyB0aGlzLmNyZWF0ZVNuc1RvcGljRm9yTm90aWZpY2F0aW9ucygpIDogdW5kZWZpbmVkLFxuICAgICAgXG4gICAgICAvLyDjg63jgrDphY3kv6HoqK3lrppcbiAgICAgIGxvZ0RlbGl2ZXJ5Q29uZmlndXJhdGlvbnM6IGNvbmZpZy5tb25pdG9yaW5nLmVuYWJsZURldGFpbGVkTW9uaXRvcmluZyA/IFtcbiAgICAgICAge1xuICAgICAgICAgIGRlc3RpbmF0aW9uVHlwZTogJ2Nsb3Vkd2F0Y2gtbG9ncycsXG4gICAgICAgICAgZGVzdGluYXRpb25EZXRhaWxzOiB7XG4gICAgICAgICAgICBsb2dHcm91cDogYC9hd3MvZWxhc3RpY2FjaGUvcmVkaXMvJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGxvZ0Zvcm1hdDogJ2pzb24nLFxuICAgICAgICAgIGxvZ1R5cGU6ICdzbG93LWxvZycsXG4gICAgICAgIH0sXG4gICAgICBdIDogdW5kZWZpbmVkLFxuICAgICAgXG4gICAgICAvLyDjgr/jgrBcbiAgICAgIHRhZ3M6IFtcbiAgICAgICAge1xuICAgICAgICAgIGtleTogJ05hbWUnLFxuICAgICAgICAgIHZhbHVlOiBgeW91dHViZS1lZm9vdGJhbGwtcmVkaXMtJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGtleTogJ0Vudmlyb25tZW50JyxcbiAgICAgICAgICB2YWx1ZTogY29uZmlnLmVudmlyb25tZW50LFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAga2V5OiAnUHVycG9zZScsXG4gICAgICAgICAgdmFsdWU6ICdDYWNoZSBmb3IgWW91VHViZSBBUEkgcmVzcG9uc2VzJyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGtleTogJ0JhY2t1cFJldGVudGlvbicsXG4gICAgICAgICAgdmFsdWU6IGNvbmZpZy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gJzdkYXlzJyA6ICcxZGF5JyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBDbG91ZFdhdGNoIOOCouODqeODvOODoFxuICAgIHRoaXMuY3JlYXRlQ2xvdWRXYXRjaEFsYXJtcyhjb25maWcpO1xuXG4gICAgLy8g5Ye65YqbXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JlZGlzRW5kcG9pbnQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jbHVzdGVyLmF0dHJSZWRpc0VuZHBvaW50QWRkcmVzcyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUmVkaXMgY2x1c3RlciBlbmRwb2ludCcsXG4gICAgICBleHBvcnROYW1lOiBgJHtjb25maWcuZW52aXJvbm1lbnR9LVJlZGlzRW5kcG9pbnRgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JlZGlzUG9ydCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNsdXN0ZXIuYXR0clJlZGlzRW5kcG9pbnRQb3J0LFxuICAgICAgZGVzY3JpcHRpb246ICdSZWRpcyBjbHVzdGVyIHBvcnQnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7Y29uZmlnLmVudmlyb25tZW50fS1SZWRpc1BvcnRgLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTbnNUb3BpY0Zvck5vdGlmaWNhdGlvbnMoKTogc3RyaW5nIHtcbiAgICBjb25zdCB0b3BpYyA9IG5ldyBjZGsuYXdzX3Nucy5Ub3BpYyh0aGlzLCAnUmVkaXNOb3RpZmljYXRpb25Ub3BpYycsIHtcbiAgICAgIHRvcGljTmFtZTogYHlvdXR1YmUtZWZvb3RiYWxsLXJlZGlzLW5vdGlmaWNhdGlvbnMtJHt0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKX1gLFxuICAgICAgZGlzcGxheU5hbWU6ICdSZWRpcyBDbHVzdGVyIE5vdGlmaWNhdGlvbnMnLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRvcGljLnRvcGljQXJuO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZUF1dGhUb2tlbigpOiBzdHJpbmcge1xuICAgIC8vIOacrOeVqueSsOWig+OBp+OBr+OAgVNlY3JldHMgTWFuYWdlcuOBi+OCieWPluW+l+OBmeOCi+OBk+OBqOOCkuaOqOWlqFxuICAgIGNvbnN0IHNlY3JldCA9IG5ldyBjZGsuYXdzX3NlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnUmVkaXNBdXRoVG9rZW4nLCB7XG4gICAgICBzZWNyZXROYW1lOiBgeW91dHViZS1lZm9vdGJhbGwtcmVkaXMtYXV0aC0ke3RoaXMubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1JlZGlzIGNsdXN0ZXIgYXV0aGVudGljYXRpb24gdG9rZW4nLFxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcbiAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6ICd7fScsXG4gICAgICAgIGdlbmVyYXRlU3RyaW5nS2V5OiAnYXV0aFRva2VuJyxcbiAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6ICdcIkAvXFxcXCcsXG4gICAgICAgIHBhc3N3b3JkTGVuZ3RoOiAzMixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2VjcmV0LnNlY3JldFZhbHVlRnJvbUpzb24oJ2F1dGhUb2tlbicpLnVuc2FmZVVud3JhcCgpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVDbG91ZFdhdGNoQWxhcm1zKGNvbmZpZzogRW52aXJvbm1lbnRDb25maWcpIHtcbiAgICBpZiAoIWNvbmZpZy5tb25pdG9yaW5nLmVuYWJsZURldGFpbGVkTW9uaXRvcmluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENQVeS9v+eUqOeOh+OCouODqeODvOODoFxuICAgIG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ1JlZGlzQ3B1QWxhcm0nLCB7XG4gICAgICBtZXRyaWM6IG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0VsYXN0aUNhY2hlJyxcbiAgICAgICAgbWV0cmljTmFtZTogJ0NQVVV0aWxpemF0aW9uJyxcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgIENhY2hlQ2x1c3RlcklkOiB0aGlzLmNsdXN0ZXIucmVmLFxuICAgICAgICB9LFxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiA4MCxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1JlZGlzIENQVSB1dGlsaXphdGlvbiBpcyBoaWdoJyxcbiAgICB9KTtcblxuICAgIC8vIOODoeODouODquS9v+eUqOeOh+OCouODqeODvOODoFxuICAgIG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ1JlZGlzTWVtb3J5QWxhcm0nLCB7XG4gICAgICBtZXRyaWM6IG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0VsYXN0aUNhY2hlJyxcbiAgICAgICAgbWV0cmljTmFtZTogJ0RhdGFiYXNlTWVtb3J5VXNhZ2VQZXJjZW50YWdlJyxcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgIENhY2hlQ2x1c3RlcklkOiB0aGlzLmNsdXN0ZXIucmVmLFxuICAgICAgICB9LFxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiA5MCxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1JlZGlzIG1lbW9yeSB1c2FnZSBpcyBoaWdoJyxcbiAgICB9KTtcblxuICAgIC8vIOaOpee2muaVsOOCouODqeODvOODoFxuICAgIG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ1JlZGlzQ29ubmVjdGlvbnNBbGFybScsIHtcbiAgICAgIG1ldHJpYzogbmV3IGNkay5hd3NfY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRWxhc3RpQ2FjaGUnLFxuICAgICAgICBtZXRyaWNOYW1lOiAnQ3VyckNvbm5lY3Rpb25zJyxcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgIENhY2hlQ2x1c3RlcklkOiB0aGlzLmNsdXN0ZXIucmVmLFxuICAgICAgICB9LFxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiA1MCxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1JlZGlzIGNvbm5lY3Rpb24gY291bnQgaXMgaGlnaCcsXG4gICAgfSk7XG4gIH1cbn0iXX0=