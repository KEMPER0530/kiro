import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface DynamoDBTablesProps {
  config: EnvironmentConfig;
}

export class DynamoDBTables extends Construct {
  public readonly favoritesTable: dynamodb.Table;
  public readonly searchHistoryTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDBTablesProps) {
    super(scope, id);

    const { config } = props;

    // お気に入りテーブル
    this.favoritesTable = new dynamodb.Table(this, 'FavoritesTable', {
      tableName: config.dynamodb.favoritesTableName,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'videoId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: config.dynamodb.billingMode === 'PAY_PER_REQUEST' 
        ? dynamodb.BillingMode.PAY_PER_REQUEST 
        : dynamodb.BillingMode.PROVISIONED,
      pointInTimeRecovery: config.dynamodb.pointInTimeRecovery,
      removalPolicy: config.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      
      // タグ
      tags: {
        Name: config.dynamodb.favoritesTableName,
        Purpose: 'Store user favorite videos',
        Environment: config.environment,
      },
    });

    // 検索履歴テーブル
    this.searchHistoryTable = new dynamodb.Table(this, 'SearchHistoryTable', {
      tableName: config.dynamodb.searchHistoryTableName,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: config.dynamodb.billingMode === 'PAY_PER_REQUEST' 
        ? dynamodb.BillingMode.PAY_PER_REQUEST 
        : dynamodb.BillingMode.PROVISIONED,
      pointInTimeRecovery: config.dynamodb.pointInTimeRecovery,
      removalPolicy: config.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      
      // TTL設定（検索履歴は90日で自動削除）
      timeToLiveAttribute: 'ttl',
      
      // タグ
      tags: {
        Name: config.dynamodb.searchHistoryTableName,
        Purpose: 'Store user search history',
        Environment: config.environment,
      },
    });

    // 検索履歴テーブルのGSI（カテゴリ別検索用）
    this.searchHistoryTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'category',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // CloudWatch アラーム設定
    this.createCloudWatchAlarms(config);

    // 出力
    new cdk.CfnOutput(this, 'FavoritesTableName', {
      value: this.favoritesTable.tableName,
      description: 'Name of the Favorites DynamoDB table',
      exportName: `${config.environment}-FavoritesTableName`,
    });

    new cdk.CfnOutput(this, 'SearchHistoryTableName', {
      value: this.searchHistoryTable.tableName,
      description: 'Name of the Search History DynamoDB table',
      exportName: `${config.environment}-SearchHistoryTableName`,
    });

    new cdk.CfnOutput(this, 'FavoritesTableArn', {
      value: this.favoritesTable.tableArn,
      description: 'ARN of the Favorites DynamoDB table',
      exportName: `${config.environment}-FavoritesTableArn`,
    });

    new cdk.CfnOutput(this, 'SearchHistoryTableArn', {
      value: this.searchHistoryTable.tableArn,
      description: 'ARN of the Search History DynamoDB table',
      exportName: `${config.environment}-SearchHistoryTableArn`,
    });
  }

  private createCloudWatchAlarms(config: EnvironmentConfig) {
    if (!config.monitoring.enableDetailedMonitoring) {
      return;
    }

    // お気に入りテーブルのアラーム
    this.favoritesTable.metric('ConsumedReadCapacityUnits').createAlarm(this, 'FavoritesReadCapacityAlarm', {
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Favorites table read capacity is high',
    });

    this.favoritesTable.metric('ConsumedWriteCapacityUnits').createAlarm(this, 'FavoritesWriteCapacityAlarm', {
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Favorites table write capacity is high',
    });

    // 検索履歴テーブルのアラーム
    this.searchHistoryTable.metric('ConsumedReadCapacityUnits').createAlarm(this, 'SearchHistoryReadCapacityAlarm', {
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Search history table read capacity is high',
    });

    this.searchHistoryTable.metric('ConsumedWriteCapacityUnits').createAlarm(this, 'SearchHistoryWriteCapacityAlarm', {
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Search history table write capacity is high',
    });
  }
}