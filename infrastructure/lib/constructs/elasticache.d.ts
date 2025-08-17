import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
export interface ElastiCacheProps {
    config: EnvironmentConfig;
    vpc: ec2.Vpc;
}
export declare class ElastiCache extends Construct {
    readonly cluster: elasticache.CfnCacheCluster;
    readonly subnetGroup: elasticache.CfnSubnetGroup;
    readonly securityGroup: ec2.SecurityGroup;
    constructor(scope: Construct, id: string, props: ElastiCacheProps);
    private createSnsTopicForNotifications;
    private generateAuthToken;
    private createCloudWatchAlarms;
}
