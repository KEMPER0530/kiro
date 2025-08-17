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
exports.DeploymentStrategy = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const codedeploy = __importStar(require("aws-cdk-lib/aws-codedeploy"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const constructs_1 = require("constructs");
class DeploymentStrategy extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { config, lambdaFunction, notificationTopic } = props;
        // Lambda エイリアス
        this.alias = new lambda.Alias(this, 'LambdaAlias', {
            aliasName: config.environment,
            version: lambdaFunction.currentVersion,
            description: `Alias for ${config.environment} environment`,
        });
        // デプロイメント設定
        const deploymentConfig = this.getDeploymentConfig(config);
        // アラーム設定
        const alarms = this.createAlarms(config);
        // デプロイメントグループ
        this.deploymentGroup = new codedeploy.LambdaDeploymentGroup(this, 'DeploymentGroup', {
            alias: this.alias,
            deploymentConfig,
            alarms,
            // 自動ロールバック設定
            autoRollback: {
                failedDeployment: true,
                stoppedDeployment: true,
                deploymentInAlarm: config.environment === 'prod',
            },
            // 通知設定
            ...(notificationTopic && {
                onSuccess: notificationTopic,
                onFailure: notificationTopic,
            }),
        });
        // 出力
        new cdk.CfnOutput(this, 'LambdaAliasArn', {
            value: this.alias.functionArn,
            description: 'ARN of the Lambda alias',
            exportName: `${config.environment}-LambdaAliasArn`,
        });
        new cdk.CfnOutput(this, 'DeploymentGroupName', {
            value: this.deploymentGroup.deploymentGroupName,
            description: 'Name of the CodeDeploy deployment group',
            exportName: `${config.environment}-DeploymentGroupName`,
        });
    }
    getDeploymentConfig(config) {
        switch (config.environment) {
            case 'dev':
                // 開発環境では高速デプロイメント
                return codedeploy.LambdaDeploymentConfig.ALL_AT_ONCE;
            case 'prod':
                // 本番環境では段階的デプロイメント
                return config.deploymentStrategy === 'canary'
                    ? codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES
                    : codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE;
            default:
                return codedeploy.LambdaDeploymentConfig.ALL_AT_ONCE;
        }
    }
    createAlarms(config) {
        const alarms = [];
        // 本番環境のみアラームを設定
        if (config.environment !== 'prod') {
            return alarms;
        }
        // エラー率アラーム
        const errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
            alarmName: `${config.environment}-lambda-error-rate`,
            alarmDescription: 'Lambda function error rate is too high',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Errors',
                dimensionsMap: {
                    FunctionName: this.alias.functionName,
                    Resource: `${this.alias.functionName}:${this.alias.aliasName}`,
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(1),
            }),
            threshold: 5,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // レスポンス時間アラーム
        const durationAlarm = new cloudwatch.Alarm(this, 'DurationAlarm', {
            alarmName: `${config.environment}-lambda-duration`,
            alarmDescription: 'Lambda function duration is too high',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Duration',
                dimensionsMap: {
                    FunctionName: this.alias.functionName,
                    Resource: `${this.alias.functionName}:${this.alias.aliasName}`,
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(1),
            }),
            threshold: 10000,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // スロットリングアラーム
        const throttleAlarm = new cloudwatch.Alarm(this, 'ThrottleAlarm', {
            alarmName: `${config.environment}-lambda-throttles`,
            alarmDescription: 'Lambda function is being throttled',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Throttles',
                dimensionsMap: {
                    FunctionName: this.alias.functionName,
                    Resource: `${this.alias.functionName}:${this.alias.aliasName}`,
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(1),
            }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        alarms.push(errorRateAlarm, durationAlarm, throttleAlarm);
        return alarms;
    }
}
exports.DeploymentStrategy = DeploymentStrategy;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95bWVudC1zdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlcGxveW1lbnQtc3RyYXRlZ3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdUVBQXlEO0FBQ3pELCtEQUFpRDtBQUNqRCx1RUFBeUQ7QUFFekQsMkNBQXVDO0FBU3ZDLE1BQWEsa0JBQW1CLFNBQVEsc0JBQVM7SUFJL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE4QjtRQUN0RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTVELGVBQWU7UUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ2pELFNBQVMsRUFBRSxNQUFNLENBQUMsV0FBVztZQUM3QixPQUFPLEVBQUUsY0FBYyxDQUFDLGNBQWM7WUFDdEMsV0FBVyxFQUFFLGFBQWEsTUFBTSxDQUFDLFdBQVcsY0FBYztTQUMzRCxDQUFDLENBQUM7UUFFSCxZQUFZO1FBQ1osTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFMUQsU0FBUztRQUNULE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFekMsY0FBYztRQUNkLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxVQUFVLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ25GLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixnQkFBZ0I7WUFDaEIsTUFBTTtZQUVOLGFBQWE7WUFDYixZQUFZLEVBQUU7Z0JBQ1osZ0JBQWdCLEVBQUUs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LENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7YUFDaEMsQ0FBQztZQUNGLFNBQVMsRUFBRSxDQUFDO1lBQ1osaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsa0NBQWtDO1lBQ3BGLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO1NBQzVELENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMxRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUFoSkQsZ0RBZ0pDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGNvZGVkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZGVkZXBsb3knO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgY2xvdWR3YXRjaCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaCc7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVudmlyb25tZW50Q29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL2Vudmlyb25tZW50JztcblxuZXhwb3J0IGludGVyZmFjZSBEZXBsb3ltZW50U3RyYXRlZ3lQcm9wcyB7XG4gIGNvbmZpZzogRW52aXJvbm1lbnRDb25maWc7XG4gIGxhbWJkYUZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XG4gIG5vdGlmaWNhdGlvblRvcGljPzogc25zLlRvcGljO1xufVxuXG5leHBvcnQgY2xhc3MgRGVwbG95bWVudFN0cmF0ZWd5IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGRlcGxveW1lbnRHcm91cDogY29kZWRlcGxveS5MYW1iZGFEZXBsb3ltZW50R3JvdXA7XG4gIHB1YmxpYyByZWFkb25seSBhbGlhczogbGFtYmRhLkFsaWFzO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBEZXBsb3ltZW50U3RyYXRlZ3lQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB7IGNvbmZpZywgbGFtYmRhRnVuY3Rpb24sIG5vdGlmaWNhdGlvblRvcGljIH0gPSBwcm9wcztcblxuICAgIC8vIExhbWJkYSDjgqjjgqTjg6rjgqLjgrlcbiAgICB0aGlzLmFsaWFzID0gbmV3IGxhbWJkYS5BbGlhcyh0aGlzLCAnTGFtYmRhQWxpYXMnLCB7XG4gICAgICBhbGlhc05hbWU6IGNvbmZpZy5lbnZpcm9ubWVudCxcbiAgICAgIHZlcnNpb246IGxhbWJkYUZ1bmN0aW9uLmN1cnJlbnRWZXJzaW9uLFxuICAgICAgZGVzY3JpcHRpb246IGBBbGlhcyBmb3IgJHtjb25maWcuZW52aXJvbm1lbnR9IGVudmlyb25tZW50YCxcbiAgICB9KTtcblxuICAgIC8vIOODh+ODl+ODreOCpOODoeODs+ODiOioreWumlxuICAgIGNvbnN0IGRlcGxveW1lbnRDb25maWcgPSB0aGlzLmdldERlcGxveW1lbnRDb25maWcoY29uZmlnKTtcblxuICAgIC8vIOOCouODqeODvOODoOioreWumlxuICAgIGNvbnN0IGFsYXJtcyA9IHRoaXMuY3JlYXRlQWxhcm1zKGNvbmZpZyk7XG5cbiAgICAvLyDjg4fjg5fjg63jgqTjg6Hjg7Pjg4jjgrDjg6vjg7zjg5dcbiAgICB0aGlzLmRlcGxveW1lbnRHcm91cCA9IG5ldyBjb2RlZGVwbG95LkxhbWJkYURlcGxveW1lbnRHcm91cCh0aGlzLCAnRGVwbG95bWVudEdyb3VwJywge1xuICAgICAgYWxpYXM6IHRoaXMuYWxpYXMsXG4gICAgICBkZXBsb3ltZW50Q29uZmlnLFxuICAgICAgYWxhcm1zLFxuICAgICAgXG4gICAgICAvLyDoh6rli5Xjg63jg7zjg6vjg5Djg4Pjgq/oqK3lrppcbiAgICAgIGF1dG9Sb2xsYmFjazoge1xuICAgICAgICBmYWlsZWREZXBsb3ltZW50OiB0cnVlLFxuICAgICAgICBzdG9wcGVkRGVwbG95bWVudDogdHJ1ZSxcbiAgICAgICAgZGVwbG95bWVudEluQWxhcm06IGNvbmZpZy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxuICAgICAgfSxcbiAgICAgIFxuICAgICAgLy8g6YCa55+l6Kit5a6aXG4gICAgICAuLi4obm90aWZpY2F0aW9uVG9waWMgJiYge1xuICAgICAgICBvblN1Y2Nlc3M6IG5vdGlmaWNhdGlvblRvcGljLFxuICAgICAgICBvbkZhaWx1cmU6IG5vdGlmaWNhdGlvblRvcGljLFxuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICAvLyDlh7rliptcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTGFtYmRhQWxpYXNBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hbGlhcy5mdW5jdGlvbkFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBMYW1iZGEgYWxpYXMnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7Y29uZmlnLmVudmlyb25tZW50fS1MYW1iZGFBbGlhc0FybmAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGVwbG95bWVudEdyb3VwTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmRlcGxveW1lbnRHcm91cC5kZXBsb3ltZW50R3JvdXBOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdOYW1lIG9mIHRoZSBDb2RlRGVwbG95IGRlcGxveW1lbnQgZ3JvdXAnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7Y29uZmlnLmVudmlyb25tZW50fS1EZXBsb3ltZW50R3JvdXBOYW1lYCxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGVwbG95bWVudENvbmZpZyhjb25maWc6IEVudmlyb25tZW50Q29uZmlnKTogY29kZWRlcGxveS5JTGFtYmRhRGVwbG95bWVudENvbmZpZyB7XG4gICAgc3dpdGNoIChjb25maWcuZW52aXJvbm1lbnQpIHtcbiAgICAgIGNhc2UgJ2Rldic6XG4gICAgICAgIC8vIOmWi+eZuueSsOWig+OBp+OBr+mrmOmAn+ODh+ODl+ODreOCpOODoeODs+ODiFxuICAgICAgICByZXR1cm4gY29kZWRlcGxveS5MYW1iZGFEZXBsb3ltZW50Q29uZmlnLkFMTF9BVF9PTkNFO1xuICAgICAgXG4gICAgICBjYXNlICdwcm9kJzpcbiAgICAgICAgLy8g5pys55Wq55Kw5aKD44Gn44Gv5q616ZqO55qE44OH44OX44Ot44Kk44Oh44Oz44OIXG4gICAgICAgIHJldHVybiBjb25maWcuZGVwbG95bWVudFN0cmF0ZWd5ID09PSAnY2FuYXJ5JyBcbiAgICAgICAgICA/IGNvZGVkZXBsb3kuTGFtYmRhRGVwbG95bWVudENvbmZpZy5DQU5BUllfMTBQRVJDRU5UXzVNSU5VVEVTXG4gICAgICAgICAgOiBjb2RlZGVwbG95LkxhbWJkYURlcGxveW1lbnRDb25maWcuTElORUFSXzEwUEVSQ0VOVF9FVkVSWV8xTUlOVVRFO1xuICAgICAgXG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gY29kZWRlcGxveS5MYW1iZGFEZXBsb3ltZW50Q29uZmlnLkFMTF9BVF9PTkNFO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQWxhcm1zKGNvbmZpZzogRW52aXJvbm1lbnRDb25maWcpOiBjbG91ZHdhdGNoLkFsYXJtW10ge1xuICAgIGNvbnN0IGFsYXJtczogY2xvdWR3YXRjaC5BbGFybVtdID0gW107XG5cbiAgICAvLyDmnKznlarnkrDlooPjga7jgb/jgqLjg6njg7zjg6DjgpLoqK3lrppcbiAgICBpZiAoY29uZmlnLmVudmlyb25tZW50ICE9PSAncHJvZCcpIHtcbiAgICAgIHJldHVybiBhbGFybXM7XG4gICAgfVxuXG4gICAgLy8g44Ko44Op44O8546H44Ki44Op44O844OgXG4gICAgY29uc3QgZXJyb3JSYXRlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnRXJyb3JSYXRlQWxhcm0nLCB7XG4gICAgICBhbGFybU5hbWU6IGAke2NvbmZpZy5lbnZpcm9ubWVudH0tbGFtYmRhLWVycm9yLXJhdGVgLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0xhbWJkYSBmdW5jdGlvbiBlcnJvciByYXRlIGlzIHRvbyBoaWdoJyxcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0xhbWJkYScsXG4gICAgICAgIG1ldHJpY05hbWU6ICdFcnJvcnMnLFxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgRnVuY3Rpb25OYW1lOiB0aGlzLmFsaWFzLmZ1bmN0aW9uTmFtZSxcbiAgICAgICAgICBSZXNvdXJjZTogYCR7dGhpcy5hbGlhcy5mdW5jdGlvbk5hbWV9OiR7dGhpcy5hbGlhcy5hbGlhc05hbWV9YCxcbiAgICAgICAgfSxcbiAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcygxKSxcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiA1LFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcbiAgICB9KTtcblxuICAgIC8vIOODrOOCueODneODs+OCueaZgumWk+OCouODqeODvOODoFxuICAgIGNvbnN0IGR1cmF0aW9uQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnRHVyYXRpb25BbGFybScsIHtcbiAgICAgIGFsYXJtTmFtZTogYCR7Y29uZmlnLmVudmlyb25tZW50fS1sYW1iZGEtZHVyYXRpb25gLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0xhbWJkYSBmdW5jdGlvbiBkdXJhdGlvbiBpcyB0b28gaGlnaCcsXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9MYW1iZGEnLFxuICAgICAgICBtZXRyaWNOYW1lOiAnRHVyYXRpb24nLFxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgRnVuY3Rpb25OYW1lOiB0aGlzLmFsaWFzLmZ1bmN0aW9uTmFtZSxcbiAgICAgICAgICBSZXNvdXJjZTogYCR7dGhpcy5hbGlhcy5mdW5jdGlvbk5hbWV9OiR7dGhpcy5hbGlhcy5hbGlhc05hbWV9YCxcbiAgICAgICAgfSxcbiAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXG4gICAgICB9KSxcbiAgICAgIHRocmVzaG9sZDogMTAwMDAsIC8vIDEw56eSXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxuICAgIH0pO1xuXG4gICAgLy8g44K544Ot44OD44OI44Oq44Oz44Kw44Ki44Op44O844OgXG4gICAgY29uc3QgdGhyb3R0bGVBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdUaHJvdHRsZUFsYXJtJywge1xuICAgICAgYWxhcm1OYW1lOiBgJHtjb25maWcuZW52aXJvbm1lbnR9LWxhbWJkYS10aHJvdHRsZXNgLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0xhbWJkYSBmdW5jdGlvbiBpcyBiZWluZyB0aHJvdHRsZWQnLFxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICBuYW1lc3BhY2U6ICdBV1MvTGFtYmRhJyxcbiAgICAgICAgbWV0cmljTmFtZTogJ1Rocm90dGxlcycsXG4gICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcbiAgICAgICAgICBGdW5jdGlvbk5hbWU6IHRoaXMuYWxpYXMuZnVuY3Rpb25OYW1lLFxuICAgICAgICAgIFJlc291cmNlOiBgJHt0aGlzLmFsaWFzLmZ1bmN0aW9uTmFtZX06JHt0aGlzLmFsaWFzLmFsaWFzTmFtZX1gLFxuICAgICAgICB9LFxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxuICAgICAgfSksXG4gICAgICB0aHJlc2hvbGQ6IDEsXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX09SX0VRVUFMX1RPX1RIUkVTSE9MRCxcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxuICAgIH0pO1xuXG4gICAgYWxhcm1zLnB1c2goZXJyb3JSYXRlQWxhcm0sIGR1cmF0aW9uQWxhcm0sIHRocm90dGxlQWxhcm0pO1xuICAgIHJldHVybiBhbGFybXM7XG4gIH1cbn0iXX0=