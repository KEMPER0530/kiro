import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
export interface FrontendHostingProps {
    config: EnvironmentConfig;
    apiGatewayUrl: string;
    webAclArn?: string;
}
export declare class FrontendHosting extends Construct {
    readonly bucket: s3.Bucket;
    readonly distribution: cloudfront.Distribution;
    readonly oai: cloudfront.OriginAccessIdentity;
    constructor(scope: Construct, id: string, props: FrontendHostingProps);
    private createCloudWatchAlarms;
}
