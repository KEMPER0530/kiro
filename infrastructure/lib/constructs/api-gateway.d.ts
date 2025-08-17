import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
export interface ApiGatewayProps {
    config: EnvironmentConfig;
    backendFunction: lambda.Function;
}
export declare class ApiGateway extends Construct {
    readonly api: apigateway.RestApi;
    readonly domainName?: apigateway.DomainName;
    constructor(scope: Construct, id: string, props: ApiGatewayProps);
    private setupApiResources;
    private setupWaf;
    private createCloudWatchAlarms;
}
