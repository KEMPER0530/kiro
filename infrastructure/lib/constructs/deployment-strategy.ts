import * as cdk from 'aws-cdk-lib';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface DeploymentStrategyProps {
  config: EnvironmentConfig;
  lambdaFunction: lambda.Function;
  notificationTopic?: sns.Topic;
}

export class DeploymentStrategy extends Construct {
  public readonly deploymentGroup: codedeploy.LambdaDeploymentGroup;
  public readonly alias: lambda.Alias;

  constructor(scope: Construct, id: string, props: DeploymentStrategyProps) {
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

  private getDeploymentConfig(config: EnvironmentConfig): codedeploy.ILambdaDeploymentConfig {
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

  private createAlarms(config: EnvironmentConfig): cloudwatch.Alarm[] {
    const alarms: cloudwatch.Alarm[] = [];

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
      threshold: 10000, // 10秒
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