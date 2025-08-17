import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './config/environment';
export interface YouTubeEfootballPlayerStackProps extends cdk.StackProps {
    config: EnvironmentConfig;
}
export declare class YouTubeEfootballPlayerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: YouTubeEfootballPlayerStackProps);
}
