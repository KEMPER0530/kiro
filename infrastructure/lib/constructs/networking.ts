import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface NetworkingProps {
  config: EnvironmentConfig;
}

export class Networking extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly bastionHost?: ec2.BastionHostLinux;

  constructor(scope: Construct, id: string, props: NetworkingProps) {
    super(scope, id);

    const { config } = props;

    // VPC
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `youtube-efootball-vpc-${config.environment}`,
      cidr: '10.0.0.0/16',
      maxAzs: 2, // 2つのAZを使用
      
      // サブネット設定
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      
      // NAT Gateway設定
      natGateways: config.environment === 'prod' ? 2 : 1,
      
      // DNS設定
      enableDnsHostnames: true,
      enableDnsSupport: true,
      
      // タグ
      tags: {
        Name: `youtube-efootball-vpc-${config.environment}`,
        Environment: config.environment,
        Purpose: 'VPC for YouTube eFootball Player',
      },
    });

    // VPCエンドポイント（DynamoDB）
    this.vpc.addGatewayEndpoint('DynamoDbEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
      subnets: [
        {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // VPCエンドポイント（S3）
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [
        {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // VPCフローログ（本番環境のみ）
    if (config.environment === 'prod') {
      this.vpc.addFlowLog('VpcFlowLog', {
        destination: ec2.FlowLogDestination.toCloudWatchLogs(),
        trafficType: ec2.FlowLogTrafficType.ALL,
      });
    }

    // Bastion Host（開発環境のみ）
    if (config.environment === 'dev') {
      this.bastionHost = new ec2.BastionHostLinux(this, 'BastionHost', {
        vpc: this.vpc,
        instanceName: `youtube-efootball-bastion-${config.environment}`,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        machineImage: ec2.MachineImage.latestAmazonLinux(),
        subnetSelection: {
          subnetType: ec2.SubnetType.PUBLIC,
        },
      });

      // Bastion Hostのセキュリティグループ設定
      this.bastionHost.allowSshAccessFrom(ec2.Peer.anyIpv4());
    }

    // セキュリティグループ（共通）
    const commonSecurityGroup = new ec2.SecurityGroup(this, 'CommonSecurityGroup', {
      vpc: this.vpc,
      description: 'Common security group for internal communication',
      allowAllOutbound: true,
    });

    // 内部通信を許可
    commonSecurityGroup.addIngressRule(
      commonSecurityGroup,
      ec2.Port.allTraffic(),
      'Allow internal communication'
    );

    // 出力
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'ID of the VPC',
      exportName: `${config.environment}-VpcId`,
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      value: this.vpc.vpcCidrBlock,
      description: 'CIDR block of the VPC',
      exportName: `${config.environment}-VpcCidr`,
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.privateSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'IDs of the private subnets',
      exportName: `${config.environment}-PrivateSubnetIds`,
    });

    new cdk.CfnOutput(this, 'PublicSubnetIds', {
      value: this.vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'IDs of the public subnets',
      exportName: `${config.environment}-PublicSubnetIds`,
    });

    if (this.bastionHost) {
      new cdk.CfnOutput(this, 'BastionHostId', {
        value: this.bastionHost.instanceId,
        description: 'ID of the bastion host',
        exportName: `${config.environment}-BastionHostId`,
      });
    }
  }
}