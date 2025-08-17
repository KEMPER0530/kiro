import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
export interface IamRolesProps {
    config: EnvironmentConfig;
    favoritesTable: dynamodb.Table;
    searchHistoryTable: dynamodb.Table;
    frontendBucket: s3.Bucket;
}
export declare class IamRoles extends Construct {
    readonly lambdaExecutionRole: iam.Role;
    readonly codePipelineRole: iam.Role;
    readonly codeBuildRole: iam.Role;
    readonly cloudFormationRole: iam.Role;
    constructor(scope: Construct, id: string, props: IamRolesProps);
    private createLambdaExecutionRole;
    private createCodePipelineRole;
    private createCodeBuildRole;
    private createCloudFormationRole;
}
