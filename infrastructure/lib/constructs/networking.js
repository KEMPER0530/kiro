"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Networking = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const constructs_1 = require("constructs");
class Networking extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { config } = props;
        // VPC
        this.vpc = new ec2.Vpc(this, 'Vpc', {
            vpcName: `youtube-efootball-vpc-${config.environment}`,
            cidr: '10.0.0.0/16',
            maxAzs: 2,
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
        commonSecurityGroup.addIngressRule(commonSecurityGroup, ec2.Port.allTraffic(), 'Allow internal communication');
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
exports.Networking = Networking;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29ya2luZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5ldHdvcmtpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBQzNDLDJDQUF1QztBQU92QyxNQUFhLFVBQVcsU0FBUSxzQkFBUztJQUl2QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztRQUV6QixNQUFNO1FBQ04sSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUNsQyxPQUFPLEVBQUUseUJBQXlCLE1BQU0sQ0FBQyxXQUFXLEVBQUU7WUFDdEQsSUFBSSxFQUFFLGFBQWE7WUFDbkIsTUFBTSxFQUFFLENBQUM7WUFFVCxVQUFVO1lBQ1YsbUJBQW1CLEVBQUU7Z0JBQ25CO29CQUNFLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07aUJBQ2xDO2dCQUNEO29CQUNFLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxTQUFTO29CQUNmLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQjtpQkFDL0M7Z0JBQ0Q7b0JBQ0UsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFVBQVU7b0JBQ2hCLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtpQkFDNUM7YUFDRjtZQUVELGdCQUFnQjtZQUNoQixXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVsRCxRQUFRO1lBQ1Isa0JBQWtCLEVBQUUsSUFBSTtZQUN4QixnQkFBZ0IsRUFBRSxJQUFJO1lBRXRCLEtBQUs7WUFDTCxJQUFJLEVBQUU7Z0JBQ0osSUFBSSxFQUFFLHlCQUF5QixNQUFNLENBQUMsV0FBVyxFQUFFO2dCQUNuRCxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7Z0JBQy9CLE9BQU8sRUFBRSxrQ0FBa0M7YUFDNUM7U0FDRixDQUFDLENBQUM7UUFFSCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsRUFBRTtZQUM5QyxPQUFPLEVBQUUsR0FBRyxDQUFDLDRCQUE0QixDQUFDLFFBQVE7WUFDbEQsT0FBTyxFQUFFO2dCQUNQO29CQUNFLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQjtpQkFDL0M7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILGlCQUFpQjtRQUNqQixJQUFJLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLFlBQVksRUFBRTtZQUN4QyxPQUFPLEVBQUUsR0FBRyxDQUFDLDRCQUE0QixDQUFDLEVBQUU7WUFDNUMsT0FBTyxFQUFFO2dCQUNQO29CQUNFLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQjtpQkFDL0M7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILG1CQUFtQjtRQUNuQixJQUFJLE1BQU0sQ0FBQyxXQUFXLEtBQUssTUFBTSxFQUFFO1lBQ2pDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRTtnQkFDaEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDdEQsV0FBVyxFQUFFLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHO2FBQ3hDLENBQUMsQ0FBQztTQUNKO1FBRUQsdUJBQXVCO1FBQ3ZCLElBQUksTUFBTSxDQUFDLFdBQVcsS0FBSyxLQUFLLEVBQUU7WUFDaEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO2dCQUMvRCxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7Z0JBQ2IsWUFBWSxFQUFFLDZCQUE2QixNQUFNLENBQUMsV0FBVyxFQUFFO2dCQUMvRCxZQUFZLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7Z0JBQy9FLFlBQVksRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFO2dCQUNsRCxlQUFlLEVBQUU7b0JBQ2YsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTtpQkFDbEM7YUFDRixDQUFDLENBQUM7WUFFSCw0QkFBNEI7WUFDNUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7U0FDekQ7UUFFRCxpQkFBaUI7UUFDakIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzdFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUNiLFdBQVcsRUFBRSxrREFBa0Q7WUFDL0QsZ0JBQWdCLEVBQUUsSUFBSTtTQUN2QixDQUFDLENBQUM7UUFFSCxVQUFVO1FBQ1YsbUJBQW1CLENBQUMsY0FBYyxDQUNoQyxtQkFBbUIsRUFDbkIsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFDckIsOEJBQThCLENBQy9CLENBQUM7UUFFRixLQUFLO1FBQ0wsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7WUFDL0IsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSztZQUNyQixXQUFXLEVBQUUsZUFBZTtZQUM1QixVQUFVLEVBQUUsR0FBRyxNQUFNLENBQUMsV0FBVyxRQUFRO1NBQzFDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQ2pDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVk7WUFDNUIsV0FBVyxFQUFFLHVCQUF1QjtZQUNwQyxVQUFVLEVBQUUsR0FBRyxNQUFNLENBQUMsV0FBVyxVQUFVO1NBQzVDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQ3ZFLFdBQVcsRUFBRSw0QkFBNEI7WUFDekMsVUFBVSxFQUFFLEdBQUcsTUFBTSxDQUFDLFdBQVcsbUJBQW1CO1NBQ3JELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDekMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQ3RFLFdBQVcsRUFBRSwyQkFBMkI7WUFDeEMsVUFBVSxFQUFFLEdBQUcsTUFBTSxDQUFDLFdBQVcsa0JBQWtCO1NBQ3BELENBQUMsQ0FBQztRQUVILElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNwQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtnQkFDdkMsS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVTtnQkFDbEMsV0FBVyxFQUFFLHdCQUF3QjtnQkFDckMsVUFBVSxFQUFFLEdBQUcsTUFBTSxDQUFDLFdBQVcsZ0JBQWdCO2FBQ2xELENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztDQUNGO0FBNUlELGdDQTRJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVudmlyb25tZW50Q29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL2Vudmlyb25tZW50JztcblxuZXhwb3J0IGludGVyZmFjZSBOZXR3b3JraW5nUHJvcHMge1xuICBjb25maWc6IEVudmlyb25tZW50Q29uZmlnO1xufVxuXG5leHBvcnQgY2xhc3MgTmV0d29ya2luZyBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSB2cGM6IGVjMi5WcGM7XG4gIHB1YmxpYyByZWFkb25seSBiYXN0aW9uSG9zdD86IGVjMi5CYXN0aW9uSG9zdExpbnV4O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBOZXR3b3JraW5nUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgeyBjb25maWcgfSA9IHByb3BzO1xuXG4gICAgLy8gVlBDXG4gICAgdGhpcy52cGMgPSBuZXcgZWMyLlZwYyh0aGlzLCAnVnBjJywge1xuICAgICAgdnBjTmFtZTogYHlvdXR1YmUtZWZvb3RiYWxsLXZwYy0ke2NvbmZpZy5lbnZpcm9ubWVudH1gLFxuICAgICAgY2lkcjogJzEwLjAuMC4wLzE2JyxcbiAgICAgIG1heEF6czogMiwgLy8gMuOBpOOBrkFa44KS5L2/55SoXG4gICAgICBcbiAgICAgIC8vIOOCteODluODjeODg+ODiOioreWumlxuICAgICAgc3VibmV0Q29uZmlndXJhdGlvbjogW1xuICAgICAgICB7XG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgIG5hbWU6ICdQdWJsaWMnLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGNpZHJNYXNrOiAyNCxcbiAgICAgICAgICBuYW1lOiAnUHJpdmF0ZScsXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGNpZHJNYXNrOiAyOCxcbiAgICAgICAgICBuYW1lOiAnSXNvbGF0ZWQnLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgXG4gICAgICAvLyBOQVQgR2F0ZXdheeioreWumlxuICAgICAgbmF0R2F0ZXdheXM6IGNvbmZpZy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gMiA6IDEsXG4gICAgICBcbiAgICAgIC8vIEROU+ioreWumlxuICAgICAgZW5hYmxlRG5zSG9zdG5hbWVzOiB0cnVlLFxuICAgICAgZW5hYmxlRG5zU3VwcG9ydDogdHJ1ZSxcbiAgICAgIFxuICAgICAgLy8g44K/44KwXG4gICAgICB0YWdzOiB7XG4gICAgICAgIE5hbWU6IGB5b3V0dWJlLWVmb290YmFsbC12cGMtJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgICAgRW52aXJvbm1lbnQ6IGNvbmZpZy5lbnZpcm9ubWVudCxcbiAgICAgICAgUHVycG9zZTogJ1ZQQyBmb3IgWW91VHViZSBlRm9vdGJhbGwgUGxheWVyJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBWUEPjgqjjg7Pjg4njg53jgqTjg7Pjg4jvvIhEeW5hbW9EQu+8iVxuICAgIHRoaXMudnBjLmFkZEdhdGV3YXlFbmRwb2ludCgnRHluYW1vRGJFbmRwb2ludCcsIHtcbiAgICAgIHNlcnZpY2U6IGVjMi5HYXRld2F5VnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkRZTkFNT0RCLFxuICAgICAgc3VibmV0czogW1xuICAgICAgICB7XG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBWUEPjgqjjg7Pjg4njg53jgqTjg7Pjg4jvvIhTM++8iVxuICAgIHRoaXMudnBjLmFkZEdhdGV3YXlFbmRwb2ludCgnUzNFbmRwb2ludCcsIHtcbiAgICAgIHNlcnZpY2U6IGVjMi5HYXRld2F5VnBjRW5kcG9pbnRBd3NTZXJ2aWNlLlMzLFxuICAgICAgc3VibmV0czogW1xuICAgICAgICB7XG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBWUEPjg5Xjg63jg7zjg63jgrDvvIjmnKznlarnkrDlooPjga7jgb/vvIlcbiAgICBpZiAoY29uZmlnLmVudmlyb25tZW50ID09PSAncHJvZCcpIHtcbiAgICAgIHRoaXMudnBjLmFkZEZsb3dMb2coJ1ZwY0Zsb3dMb2cnLCB7XG4gICAgICAgIGRlc3RpbmF0aW9uOiBlYzIuRmxvd0xvZ0Rlc3RpbmF0aW9uLnRvQ2xvdWRXYXRjaExvZ3MoKSxcbiAgICAgICAgdHJhZmZpY1R5cGU6IGVjMi5GbG93TG9nVHJhZmZpY1R5cGUuQUxMLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQmFzdGlvbiBIb3N077yI6ZaL55m655Kw5aKD44Gu44G/77yJXG4gICAgaWYgKGNvbmZpZy5lbnZpcm9ubWVudCA9PT0gJ2RldicpIHtcbiAgICAgIHRoaXMuYmFzdGlvbkhvc3QgPSBuZXcgZWMyLkJhc3Rpb25Ib3N0TGludXgodGhpcywgJ0Jhc3Rpb25Ib3N0Jywge1xuICAgICAgICB2cGM6IHRoaXMudnBjLFxuICAgICAgICBpbnN0YW5jZU5hbWU6IGB5b3V0dWJlLWVmb290YmFsbC1iYXN0aW9uLSR7Y29uZmlnLmVudmlyb25tZW50fWAsXG4gICAgICAgIGluc3RhbmNlVHlwZTogZWMyLkluc3RhbmNlVHlwZS5vZihlYzIuSW5zdGFuY2VDbGFzcy5UMywgZWMyLkluc3RhbmNlU2l6ZS5NSUNSTyksXG4gICAgICAgIG1hY2hpbmVJbWFnZTogZWMyLk1hY2hpbmVJbWFnZS5sYXRlc3RBbWF6b25MaW51eCgpLFxuICAgICAgICBzdWJuZXRTZWxlY3Rpb246IHtcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgLy8gQmFzdGlvbiBIb3N044Gu44K744Kt44Ol44Oq44OG44Kj44Kw44Or44O844OX6Kit5a6aXG4gICAgICB0aGlzLmJhc3Rpb25Ib3N0LmFsbG93U3NoQWNjZXNzRnJvbShlYzIuUGVlci5hbnlJcHY0KCkpO1xuICAgIH1cblxuICAgIC8vIOOCu+OCreODpeODquODhuOCo+OCsOODq+ODvOODl++8iOWFsemAmu+8iVxuICAgIGNvbnN0IGNvbW1vblNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0NvbW1vblNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGM6IHRoaXMudnBjLFxuICAgICAgZGVzY3JpcHRpb246ICdDb21tb24gc2VjdXJpdHkgZ3JvdXAgZm9yIGludGVybmFsIGNvbW11bmljYXRpb24nLFxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIOWGhemDqOmAmuS/oeOCkuioseWPr1xuICAgIGNvbW1vblNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICBjb21tb25TZWN1cml0eUdyb3VwLFxuICAgICAgZWMyLlBvcnQuYWxsVHJhZmZpYygpLFxuICAgICAgJ0FsbG93IGludGVybmFsIGNvbW11bmljYXRpb24nXG4gICAgKTtcblxuICAgIC8vIOWHuuWKm1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdWcGNJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnZwYy52cGNJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnSUQgb2YgdGhlIFZQQycsXG4gICAgICBleHBvcnROYW1lOiBgJHtjb25maWcuZW52aXJvbm1lbnR9LVZwY0lkYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdWcGNDaWRyJywge1xuICAgICAgdmFsdWU6IHRoaXMudnBjLnZwY0NpZHJCbG9jayxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ0lEUiBibG9jayBvZiB0aGUgVlBDJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2NvbmZpZy5lbnZpcm9ubWVudH0tVnBjQ2lkcmAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJpdmF0ZVN1Ym5ldElkcycsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnZwYy5wcml2YXRlU3VibmV0cy5tYXAoc3VibmV0ID0+IHN1Ym5ldC5zdWJuZXRJZCkuam9pbignLCcpLFxuICAgICAgZGVzY3JpcHRpb246ICdJRHMgb2YgdGhlIHByaXZhdGUgc3VibmV0cycsXG4gICAgICBleHBvcnROYW1lOiBgJHtjb25maWcuZW52aXJvbm1lbnR9LVByaXZhdGVTdWJuZXRJZHNgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1B1YmxpY1N1Ym5ldElkcycsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnZwYy5wdWJsaWNTdWJuZXRzLm1hcChzdWJuZXQgPT4gc3VibmV0LnN1Ym5ldElkKS5qb2luKCcsJyksXG4gICAgICBkZXNjcmlwdGlvbjogJ0lEcyBvZiB0aGUgcHVibGljIHN1Ym5ldHMnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7Y29uZmlnLmVudmlyb25tZW50fS1QdWJsaWNTdWJuZXRJZHNgLFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuYmFzdGlvbkhvc3QpIHtcbiAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCYXN0aW9uSG9zdElkJywge1xuICAgICAgICB2YWx1ZTogdGhpcy5iYXN0aW9uSG9zdC5pbnN0YW5jZUlkLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0lEIG9mIHRoZSBiYXN0aW9uIGhvc3QnLFxuICAgICAgICBleHBvcnROYW1lOiBgJHtjb25maWcuZW52aXJvbm1lbnR9LUJhc3Rpb25Ib3N0SWRgLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG59Il19