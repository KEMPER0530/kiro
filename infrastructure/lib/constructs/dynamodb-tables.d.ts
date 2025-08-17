import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
export interface DynamoDBTablesProps {
    config: EnvironmentConfig;
}
export declare class DynamoDBTables extends Construct {
    readonly favoritesTable: dynamodb.Table;
    readonly searchHistoryTable: dynamodb.Table;
    constructor(scope: Construct, id: string, props: DynamoDBTablesProps);
    private createCloudWatchAlarms;
}
