import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
export interface DeploymentStrategyProps {
    config: EnvironmentConfig;
    lambdaFunction: lambda.Function;
    notificationTopic?: sns.Topic;
}
export declare class DeploymentStrategy extends Construct {
    readonly deploymentGroup: codedeploy.LambdaDeploymentGroup;
    readonly alias: lambda.Alias;
    constructor(scope: Construct, id: string, props: DeploymentStrategyProps);
    private getDeploymentConfig;
    private createAlarms;
}
