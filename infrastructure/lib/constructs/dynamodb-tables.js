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
exports.DynamoDBTables = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const constructs_1 = require("constructs");
class DynamoDBTables extends constructs_1.Construct {
    constructor(scope, id, props) {
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
    createCloudWatchAlarms(config) {
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
exports.DynamoDBTables = DynamoDBTables;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1vZGItdGFibGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZHluYW1vZGItdGFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCwyQ0FBdUM7QUFPdkMsTUFBYSxjQUFlLFNBQVEsc0JBQVM7SUFJM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFekIsWUFBWTtRQUNaLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUMvRCxTQUFTLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0I7WUFDN0MsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUNELFdBQVcsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsS0FBSyxpQkFBaUI7Z0JBQzVELENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7Z0JBQ3RDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFdBQVc7WUFDcEMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUI7WUFDeEQsYUFBYSxFQUFFLE1BQU0sQ0FBQyxXQUFXLEtBQUssTUFBTTtnQkFDMUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtnQkFDMUIsQ0FBQyxDQUFDLEdB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QixFQUFFLDRDQUE0QztTQUMvRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLDRCQUE0QixDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxpQ0FBaUMsRUFBRTtZQUNoSCxTQUFTLEVBQUUsRUFBRTtZQUNiLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsZ0JBQWdCLEVBQUUsNkNBQTZDO1NBQ2hFLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTlJRCx3Q0E4SUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRW52aXJvbm1lbnRDb25maWcgfSBmcm9tICcuLi9jb25maWcvZW52aXJvbm1lbnQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIER5bmFtb0RCVGFibGVzUHJvcHMge1xuICBjb25maWc6IEVudmlyb25tZW50Q29uZmlnO1xufVxuXG5leHBvcnQgY2xhc3MgRHluYW1vREJUYWJsZXMgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgZmF2b3JpdGVzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgc2VhcmNoSGlzdG9yeVRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRHluYW1vREJUYWJsZXNQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB7IGNvbmZpZyB9ID0gcHJvcHM7XG5cbiAgICAvLyDjgYrmsJfjgavlhaXjgorjg4bjg7zjg5bjg6tcbiAgICB0aGlzLmZhdm9yaXRlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdGYXZvcml0ZXNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogY29uZmlnLmR5bmFtb2RiLmZhdm9yaXRlc1RhYmxlTmFtZSxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAndXNlcklkJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiAndmlkZW9JZCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBjb25maWcuZHluYW1vZGIuYmlsbGluZ01vZGUgPT09ICdQQVlfUEVSX1JFUVVFU1QnIFxuICAgICAgICA/IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCBcbiAgICAgICAgOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QUk9WSVNJT05FRCxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IGNvbmZpZy5keW5hbW9kYi5wb2ludEluVGltZVJlY292ZXJ5LFxuICAgICAgcmVtb3ZhbFBvbGljeTogY29uZmlnLmVudmlyb25tZW50ID09PSAncHJvZCcgXG4gICAgICAgID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIFxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgICBcbiAgICAgIC8vIOOCv+OCsFxuICAgICAgdGFnczoge1xuICAgICAgICBOYW1lOiBjb25maWcuZHluYW1vZGIuZmF2b3JpdGVzVGFibGVOYW1lLFxuICAgICAgICBQdXJwb3NlOiAnU3RvcmUgdXNlciBmYXZvcml0ZSB2aWRlb3MnLFxuICAgICAgICBFbnZpcm9ubWVudDogY29uZmlnLmVudmlyb25tZW50LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIOaknOe0ouWxpeattOODhuODvOODluODq1xuICAgIHRoaXMuc2VhcmNoSGlzdG9yeVRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdTZWFyY2hIaXN0b3J5VGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGNvbmZpZy5keW5hbW9kYi5zZWFyY2hIaXN0b3J5VGFibGVOYW1lLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICd1c2VySWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6ICd0aW1lc3RhbXAnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICBiaWxsaW5nTW9kZTogY29uZmlnLmR5bmFtb2RiLmJpbGxpbmdNb2RlID09PSAnUEFZX1BFUl9SRVFVRVNUJyBcbiAgICAgICAgPyBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QgXG4gICAgICAgIDogZHluYW1vZGIuQmlsbGluZ01vZGUuUFJPVklTSU9ORUQsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiBjb25maWcuZHluYW1vZGIucG9pbnRJblRpbWVSZWNvdmVyeSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNvbmZpZy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnIFxuICAgICAgICA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiBcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgXG4gICAgICAvLyBUVEzoqK3lrprvvIjmpJzntKLlsaXmrbTjga85MOaXpeOBp+iHquWLleWJiumZpO+8iVxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ3R0bCcsXG4gICAgICBcbiAgICAgIC8vIOOCv+OCsFxuICAgICAgdGFnczoge1xuICAgICAgICBOYW1lOiBjb25maWcuZHluYW1vZGIuc2VhcmNoSGlzdG9yeVRhYmxlTmFtZSxcbiAgICAgICAgUHVycG9zZTogJ1N0b3JlIHVzZXIgc2VhcmNoIGhpc3RvcnknLFxuICAgICAgICBFbnZpcm9ubWVudDogY29uZmlnLmVudmlyb25tZW50LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIOaknOe0ouWxpeattOODhuODvOODluODq+OBrkdTSe+8iOOCq+ODhuOCtOODquWIpeaknOe0oueUqO+8iVxuICAgIHRoaXMuc2VhcmNoSGlzdG9yeVRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ0NhdGVnb3J5SW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICd1c2VySWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6ICdjYXRlZ29yeScsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXG4gICAgfSk7XG5cbiAgICAvLyBDbG91ZFdhdGNoIOOCouODqeODvOODoOioreWumlxuICAgIHRoaXMuY3JlYXRlQ2xvdWRXYXRjaEFsYXJtcyhjb25maWcpO1xuXG4gICAgLy8g5Ye65YqbXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Zhdm9yaXRlc1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmZhdm9yaXRlc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTmFtZSBvZiB0aGUgRmF2b3JpdGVzIER5bmFtb0RCIHRhYmxlJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2NvbmZpZy5lbnZpcm9ubWVudH0tRmF2b3JpdGVzVGFibGVOYW1lYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZWFyY2hIaXN0b3J5VGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuc2VhcmNoSGlzdG9yeVRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTmFtZSBvZiB0aGUgU2VhcmNoIEhpc3RvcnkgRHluYW1vREIgdGFibGUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7Y29uZmlnLmVudmlyb25tZW50fS1TZWFyY2hIaXN0b3J5VGFibGVOYW1lYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGYXZvcml0ZXNUYWJsZUFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmZhdm9yaXRlc1RhYmxlLnRhYmxlQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdBUk4gb2YgdGhlIEZhdm9yaXRlcyBEeW5hbW9EQiB0YWJsZScsXG4gICAgICBleHBvcnROYW1lOiBgJHtjb25maWcuZW52aXJvbm1lbnR9LUZhdm9yaXRlc1RhYmxlQXJuYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZWFyY2hIaXN0b3J5VGFibGVBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5zZWFyY2hIaXN0b3J5VGFibGUudGFibGVBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FSTiBvZiB0aGUgU2VhcmNoIEhpc3RvcnkgRHluYW1vREIgdGFibGUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7Y29uZmlnLmVudmlyb25tZW50fS1TZWFyY2hIaXN0b3J5VGFibGVBcm5gLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVDbG91ZFdhdGNoQWxhcm1zKGNvbmZpZzogRW52aXJvbm1lbnRDb25maWcpIHtcbiAgICBpZiAoIWNvbmZpZy5tb25pdG9yaW5nLmVuYWJsZURldGFpbGVkTW9uaXRvcmluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIOOBiuawl+OBq+WFpeOCiuODhuODvOODluODq+OBruOCouODqeODvOODoFxuICAgIHRoaXMuZmF2b3JpdGVzVGFibGUubWV0cmljKCdDb25zdW1lZFJlYWRDYXBhY2l0eVVuaXRzJykuY3JlYXRlQWxhcm0odGhpcywgJ0Zhdm9yaXRlc1JlYWRDYXBhY2l0eUFsYXJtJywge1xuICAgICAgdGhyZXNob2xkOiA4MCxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0Zhdm9yaXRlcyB0YWJsZSByZWFkIGNhcGFjaXR5IGlzIGhpZ2gnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5mYXZvcml0ZXNUYWJsZS5tZXRyaWMoJ0NvbnN1bWVkV3JpdGVDYXBhY2l0eVVuaXRzJykuY3JlYXRlQWxhcm0odGhpcywgJ0Zhdm9yaXRlc1dyaXRlQ2FwYWNpdHlBbGFybScsIHtcbiAgICAgIHRocmVzaG9sZDogODAsXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdGYXZvcml0ZXMgdGFibGUgd3JpdGUgY2FwYWNpdHkgaXMgaGlnaCcsXG4gICAgfSk7XG5cbiAgICAvLyDmpJzntKLlsaXmrbTjg4bjg7zjg5bjg6vjga7jgqLjg6njg7zjg6BcbiAgICB0aGlzLnNlYXJjaEhpc3RvcnlUYWJsZS5tZXRyaWMoJ0NvbnN1bWVkUmVhZENhcGFjaXR5VW5pdHMnKS5jcmVhdGVBbGFybSh0aGlzLCAnU2VhcmNoSGlzdG9yeVJlYWRDYXBhY2l0eUFsYXJtJywge1xuICAgICAgdGhyZXNob2xkOiA4MCxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1NlYXJjaCBoaXN0b3J5IHRhYmxlIHJlYWQgY2FwYWNpdHkgaXMgaGlnaCcsXG4gICAgfSk7XG5cbiAgICB0aGlzLnNlYXJjaEhpc3RvcnlUYWJsZS5tZXRyaWMoJ0NvbnN1bWVkV3JpdGVDYXBhY2l0eVVuaXRzJykuY3JlYXRlQWxhcm0odGhpcywgJ1NlYXJjaEhpc3RvcnlXcml0ZUNhcGFjaXR5QWxhcm0nLCB7XG4gICAgICB0aHJlc2hvbGQ6IDgwLFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnU2VhcmNoIGhpc3RvcnkgdGFibGUgd3JpdGUgY2FwYWNpdHkgaXMgaGlnaCcsXG4gICAgfSk7XG4gIH1cbn0iXX0=