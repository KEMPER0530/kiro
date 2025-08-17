import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
export interface WafProps {
    scope: 'REGIONAL' | 'CLOUDFRONT';
    resourceArn?: string;
    environment: string;
}
export declare class WafConstruct extends Construct {
    readonly webAcl: wafv2.CfnWebACL;
    readonly logGroup: logs.LogGroup;
    constructor(scope: Construct, id: string, props: WafProps);
    associateWithResource(resourceArn: string): wafv2.CfnWebACLAssociation;
}
