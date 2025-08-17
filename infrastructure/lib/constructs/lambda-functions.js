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
exports.LambdaFunctions = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const constructs_1 = require("constructs");
class LambdaFunctions extends constructs_1.Construct {
    constructor(scope, id, props) {
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
        lambdaSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(6379), 'Allow Redis access');
        // Lambda関数の環境変数
        const environment = {
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
    createCloudWatchAlarms(config) {
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
exports.LambdaFunctions = LambdaFunctions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLWZ1bmN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxhbWJkYS1mdW5jdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0RBQWlEO0FBQ2pELHlEQUEyQztBQUMzQywyREFBNkM7QUFHN0MseURBQTJDO0FBQzNDLDJDQUF1QztBQVd2QyxNQUFhLGVBQWdCLFNBQVEsc0JBQVM7SUFHNUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEyQjtRQUNuRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFaEYsY0FBYztRQUNkLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDM0QsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDO1lBQzNELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDhDQUE4QyxDQUFDO2FBQzNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsaUJBQWlCO1FBQ2pCLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5QyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVsRCxvQkFBb0I7UUFDcEIsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDN0MsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUU7Z0JBQ1AscUJBQXFCO2dCQUNyQixzQkFBc0I7Z0JBQ3RCLG1CQUFtQjthQUNwQjtZQUNE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LGlCQUFpQixFQUFFLENBQUM7WUFDcEIsZ0JBQWdCLEVBQUUscUNBQXFDO1NBQ3hELENBQUMsQ0FBQztRQUVILFdBQVc7UUFDWCxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUU7WUFDdEYsU0FBUyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLGNBQWMsRUFBRTtZQUM3RSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGdCQUFnQixFQUFFLG1DQUFtQztTQUN0RCxDQUFDLENBQUM7UUFFSCxjQUFjO1FBQ2QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLDhCQUE4QixFQUFFO1lBQ3ZGLFNBQVMsRUFBRSxDQUFDO1lBQ1osaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixnQkFBZ0IsRUFBRSxxQ0FBcUM7U0FDeEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBNUpELDBDQTRKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBlbGFzdGljYWNoZSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2FjaGUnO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBFbnZpcm9ubWVudENvbmZpZyB9IGZyb20gJy4uL2NvbmZpZy9lbnZpcm9ubWVudCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGFtYmRhRnVuY3Rpb25zUHJvcHMge1xuICBjb25maWc6IEVudmlyb25tZW50Q29uZmlnO1xuICBmYXZvcml0ZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHNlYXJjaEhpc3RvcnlUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHJlZGlzQ2x1c3RlcjogZWxhc3RpY2FjaGUuQ2ZuQ2FjaGVDbHVzdGVyO1xuICB2cGM6IGVjMi5WcGM7XG59XG5cbmV4cG9ydCBjbGFzcyBMYW1iZGFGdW5jdGlvbnMgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgYmFja2VuZEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IExhbWJkYUZ1bmN0aW9uc1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHsgY29uZmlnLCBmYXZvcml0ZXNUYWJsZSwgc2VhcmNoSGlzdG9yeVRhYmxlLCByZWRpc0NsdXN0ZXIsIHZwYyB9ID0gcHJvcHM7XG5cbiAgICAvLyBMYW1iZGHlrp/ooYzjg63jg7zjg6tcbiAgICBjb25zdCBsYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdMYW1iZGFFeGVjdXRpb25Sb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhVlBDQWNjZXNzRXhlY3V0aW9uUm9sZScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIER5bmFtb0RC44Ki44Kv44K744K55qip6ZmQXG4gICAgZmF2b3JpdGVzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpO1xuICAgIHNlYXJjaEhpc3RvcnlUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSk7XG5cbiAgICAvLyBDbG91ZFdhdGNoIExvZ3PmqKnpmZBcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nR3JvdXAnLFxuICAgICAgICAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLFxuICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgfSkpO1xuXG4gICAgLy8gWC1SYXnmqKnpmZDvvIjmnInlirnjgarloLTlkIjvvIlcbiAgICBpZiAoY29uZmlnLm1vbml0b3JpbmcuZW5hYmxlWFJheSkge1xuICAgICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICd4cmF5OlB1dFRyYWNlU2VnbWVudHMnLFxuICAgICAgICAgICd4cmF5OlB1dFRlbGVtZXRyeVJlY29yZHMnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgfSkpO1xuICAgIH1cblxuICAgIC8vIOOCu+OCreODpeODquODhuOCo+OCsOODq+ODvOODl1xuICAgIGNvbnN0IGxhbWJkYVNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0xhbWJkYVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBMYW1iZGEgZnVuY3Rpb24nLFxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIFJlZGlz44Ki44Kv44K744K555So44Gu44K744Kt44Ol44Oq44OG44Kj44Kw44Or44O844OX44Or44O844OrXG4gICAgbGFtYmRhU2VjdXJpdHlHcm91cC5hZGRFZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxuICAgICAgZWMyLlBvcnQudGNwKDYzNzkpLFxuICAgICAgJ0FsbG93IFJlZGlzIGFjY2VzcydcbiAgICApO1xuXG4gICAgLy8gTGFtYmRh6Zai5pWw44Gu55Kw5aKD5aSJ5pWwXG4gICAgY29uc3QgZW52aXJvbm1lbnQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAuLi5jb25maWcubGFtYmRhLmVudmlyb25tZW50LFxuICAgICAgRFlOQU1PREJfRkFWT1JJVEVTX1RBQkxFOiBmYXZvcml0ZXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBEWU5BTU9EQl9TRUFSQ0hfSElTVE9SWV9UQUJMRTogc2VhcmNoSGlzdG9yeVRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIFJFRElTX0VORFBPSU5UOiByZWRpc0NsdXN0ZXIuYXR0clJlZGlzRW5kcG9pbnRBZGRyZXNzLFxuICAgICAgUkVESVNfUE9SVDogcmVkaXNDbHVzdGVyLmF0dHJSZWRpc0VuZHBvaW50UG9ydCxcbiAgICAgIEFXU19SRUdJT046IGNvbmZpZy5yZWdpb24sXG4gICAgfTtcblxuICAgIC8vIFlvdVR1YmUgQVBJIEtleeOBr+WklumDqOOBi+OCieioreWumlxuICAgIGlmIChwcm9jZXNzLmVudi5ZT1VUVUJFX0FQSV9LRVkpIHtcbiAgICAgIGVudmlyb25tZW50LllPVVRVQkVfQVBJX0tFWSA9IHByb2Nlc3MuZW52LllPVVRVQkVfQVBJX0tFWTtcbiAgICB9XG5cbiAgICAvLyBMYW1iZGHplqLmlbDvvIjjgrPjg7Pjg4bjg4rjgqTjg6Hjg7zjgrjvvIlcbiAgICB0aGlzLmJhY2tlbmRGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0JhY2tlbmRGdW5jdGlvbicsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYHlvdXR1YmUtZWZvb3RiYWxsLWJhY2tlbmQtJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldEltYWdlKCcuLi9iYWNrZW5kJywge1xuICAgICAgICBmaWxlOiAnRG9ja2VyZmlsZS5sYW1iZGEnLFxuICAgICAgfSksXG4gICAgICBoYW5kbGVyOiBsYW1iZGEuSGFuZGxlci5GUk9NX0lNQUdFLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuRlJPTV9JTUFHRSxcbiAgICAgIG1lbW9yeVNpemU6IGNvbmZpZy5sYW1iZGEubWVtb3J5U2l6ZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKGNvbmZpZy5sYW1iZGEudGltZW91dCksXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICB2cGMsXG4gICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICB9LFxuICAgICAgc2VjdXJpdHlHcm91cHM6IFtsYW1iZGFTZWN1cml0eUdyb3VwXSxcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IGNvbmZpZy5sYW1iZGEucmVzZXJ2ZWRDb25jdXJyZW5jeSxcbiAgICAgIFxuICAgICAgLy8gWC1SYXnmnInlirnljJZcbiAgICAgIHRyYWNpbmc6IGNvbmZpZy5tb25pdG9yaW5nLmVuYWJsZVhSYXkgXG4gICAgICAgID8gbGFtYmRhLlRyYWNpbmcuQUNUSVZFIFxuICAgICAgICA6IGxhbWJkYS5UcmFjaW5nLkRJU0FCTEVELFxuICAgICAgXG4gICAgICAvLyDjg63jgrDoqK3lrppcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLkRBWVNfMTQsXG4gICAgICBcbiAgICAgIC8vIOODh+ODg+ODieODrOOCv+ODvOOCreODpeODvFxuICAgICAgZGVhZExldHRlclF1ZXVlOiBuZXcgY2RrLmF3c19zcXMuUXVldWUodGhpcywgJ0JhY2tlbmRGdW5jdGlvbkRMUScsIHtcbiAgICAgICAgcXVldWVOYW1lOiBgeW91dHViZS1lZm9vdGJhbGwtYmFja2VuZC1kbHEtJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksXG4gICAgICB9KSxcbiAgICAgIFxuICAgICAgLy8g44K/44KwXG4gICAgICB0YWdzOiB7XG4gICAgICAgIE5hbWU6IGB5b3V0dWJlLWVmb290YmFsbC1iYWNrZW5kLSR7Y29uZmlnLmVudmlyb25tZW50fWAsXG4gICAgICAgIFB1cnBvc2U6ICdCYWNrZW5kIEFQSSBmb3IgWW91VHViZSBlRm9vdGJhbGwgUGxheWVyJyxcbiAgICAgICAgRW52aXJvbm1lbnQ6IGNvbmZpZy5lbnZpcm9ubWVudCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDbG91ZFdhdGNoIOOCouODqeODvOODoFxuICAgIHRoaXMuY3JlYXRlQ2xvdWRXYXRjaEFsYXJtcyhjb25maWcpO1xuXG4gICAgLy8g5Ye65YqbXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JhY2tlbmRGdW5jdGlvbk5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5iYWNrZW5kRnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdOYW1lIG9mIHRoZSBiYWNrZW5kIExhbWJkYSBmdW5jdGlvbicsXG4gICAgICBleHBvcnROYW1lOiBgJHtjb25maWcuZW52aXJvbm1lbnR9LUJhY2tlbmRGdW5jdGlvbk5hbWVgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JhY2tlbmRGdW5jdGlvbkFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmJhY2tlbmRGdW5jdGlvbi5mdW5jdGlvbkFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBiYWNrZW5kIExhbWJkYSBmdW5jdGlvbicsXG4gICAgICBleHBvcnROYW1lOiBgJHtjb25maWcuZW52aXJvbm1lbnR9LUJhY2tlbmRGdW5jdGlvbkFybmAsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUNsb3VkV2F0Y2hBbGFybXMoY29uZmlnOiBFbnZpcm9ubWVudENvbmZpZykge1xuICAgIGlmICghY29uZmlnLm1vbml0b3JpbmcuZW5hYmxlRGV0YWlsZWRNb25pdG9yaW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8g44Ko44Op44O8546H44Ki44Op44O844OgXG4gICAgdGhpcy5iYWNrZW5kRnVuY3Rpb24ubWV0cmljRXJyb3JzKCkuY3JlYXRlQWxhcm0odGhpcywgJ0JhY2tlbmRGdW5jdGlvbkVycm9yQWxhcm0nLCB7XG4gICAgICB0aHJlc2hvbGQ6IDEwLFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQmFja2VuZCBmdW5jdGlvbiBlcnJvciByYXRlIGlzIGhpZ2gnLFxuICAgIH0pO1xuXG4gICAgLy8g5a6f6KGM5pmC6ZaT44Ki44Op44O844OgXG4gICAgdGhpcy5iYWNrZW5kRnVuY3Rpb24ubWV0cmljRHVyYXRpb24oKS5jcmVhdGVBbGFybSh0aGlzLCAnQmFja2VuZEZ1bmN0aW9uRHVyYXRpb25BbGFybScsIHtcbiAgICAgIHRocmVzaG9sZDogY2RrLkR1cmF0aW9uLnNlY29uZHMoY29uZmlnLmxhbWJkYS50aW1lb3V0ICogMC44KS50b01pbGxpc2Vjb25kcygpLFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQmFja2VuZCBmdW5jdGlvbiBkdXJhdGlvbiBpcyBoaWdoJyxcbiAgICB9KTtcblxuICAgIC8vIOOCueODreODg+ODiOODquODs+OCsOOCouODqeODvOODoFxuICAgIHRoaXMuYmFja2VuZEZ1bmN0aW9uLm1ldHJpY1Rocm90dGxlcygpLmNyZWF0ZUFsYXJtKHRoaXMsICdCYWNrZW5kRnVuY3Rpb25UaHJvdHRsZUFsYXJtJywge1xuICAgICAgdGhyZXNob2xkOiA1LFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQmFja2VuZCBmdW5jdGlvbiBpcyBiZWluZyB0aHJvdHRsZWQnLFxuICAgIH0pO1xuICB9XG59Il19