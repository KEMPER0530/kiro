import * as lambda from 'aws-cdk-lib/aws-lambda';
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
export declare class LambdaFunctions extends Construct {
    readonly backendFunction: lambda.Function;
    constructor(scope: Construct, id: string, props: LambdaFunctionsProps);
    private createCloudWatchAlarms;
}
