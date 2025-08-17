import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
export interface NetworkingProps {
    config: EnvironmentConfig;
}
export declare class Networking extends Construct {
    readonly vpc: ec2.Vpc;
    readonly bastionHost?: ec2.BastionHostLinux;
    constructor(scope: Construct, id: string, props: NetworkingProps);
}
