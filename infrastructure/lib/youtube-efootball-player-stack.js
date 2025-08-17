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
exports.YouTubeEfootballPlayerStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const networking_1 = require("./constructs/networking");
const dynamodb_tables_1 = require("./constructs/dynamodb-tables");
const elasticache_1 = require("./constructs/elasticache");
const lambda_functions_1 = require("./constructs/lambda-functions");
const api_gateway_1 = require("./constructs/api-gateway");
const frontend_hosting_1 = require("./constructs/frontend-hosting");
const waf_1 = require("./constructs/waf");
class YouTubeEfootballPlayerStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { config } = props;
        // ネットワーキング
        const networking = new networking_1.Networking(this, 'Networking', {
            config,
        });
        // DynamoDB テーブル
        const dynamoTables = new dynamodb_tables_1.DynamoDBTables(this, 'DynamoTables', {
            config,
        });
        // ElastiCache Redis クラスター
        const elastiCache = new elasticache_1.ElastiCache(this, 'ElastiCache', {
            config,
            vpc: networking.vpc,
        });
        // Lambda 関数
        const lambdaFunctions = new lambda_functions_1.LambdaFunctions(this, 'LambdaFunctions', {
            config,
            favoritesTable: dynamoTables.favoritesTable,
            searchHistoryTable: dynamoTables.searchHistoryTable,
            redisCluster: elastiCache.cluster,
            vpc: networking.vpc,
        });
        // API Gateway
        const apiGateway = new api_gateway_1.ApiGateway(this, 'ApiGateway', {
            config,
            backendFunction: lambdaFunctions.backendFunction,
        });
        // WAF for API Gateway
        const apiWaf = new waf_1.WafConstruct(this, 'ApiWaf', {
            scope: 'REGIONAL',
            environment: config.environment
        });
        // Associate WAF with API Gateway
        apiWaf.associateWithResource(apiGateway.api.deploymentStage.stageArn);
        // WAF for CloudFront (must be created before CloudFront distribution)
        const cloudfrontWaf = new waf_1.WafConstruct(this, 'CloudFrontWaf', {
            scope: 'CLOUDFRONT',
            environment: config.environment
        });
        // フロントエンドホスティング
        const frontendHosting = new frontend_hosting_1.FrontendHosting(this, 'FrontendHosting', {
            config,
            apiGatewayUrl: apiGateway.api.url,
            webAclArn: cloudfrontWaf.webAcl.attrArn,
        });
        // スタック全体の出力
        new cdk.CfnOutput(this, 'StackName', {
            value: this.stackName,
            description: 'Name of the CloudFormation stack',
        });
        new cdk.CfnOutput(this, 'Environment', {
            value: config.environment,
            description: 'Environment name',
        });
        new cdk.CfnOutput(this, 'Region', {
            value: this.region,
            description: 'AWS region',
        });
        new cdk.CfnOutput(this, 'ApplicationUrl', {
            value: `https://${frontendHosting.distribution.distributionDomainName}`,
            description: 'URL of the deployed application',
        });
        // タグをスタック全体に適用
        cdk.Tags.of(this).add('Project', 'YouTubeEfootballPlayer');
        cdk.Tags.of(this).add('Environment', config.environment);
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
        cdk.Tags.of(this).add('Owner', 'YouTubeEfootballPlayerTeam');
    }
}
exports.YouTubeEfootballPlayerStack = YouTubeEfootballPlayerStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1lZm9vdGJhbGwtcGxheWVyLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsieW91dHViZS1lZm9vdGJhbGwtcGxheWVyLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBR25DLHdEQUFxRDtBQUNyRCxrRUFBOEQ7QUFDOUQsMERBQXVEO0FBQ3ZELG9FQUFnRTtBQUNoRSwwREFBc0Q7QUFDdEQsb0VBQWdFO0FBQ2hFLDBDQUFnRDtBQU1oRCxNQUFhLDJCQUE0QixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3hELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBdUM7UUFDL0UsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztRQUV6QixXQUFXO1FBQ1gsTUFBTSxVQUFVLEdBQUcsSUFBSSx1QkFBVSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDcEQsTUFBTTtTQUNQLENBQUMsQ0FBQztRQUVILGdCQUFnQjtRQUNoQixNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUM1RCxNQUFNO1NBQ1AsQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLE1BQU0sV0FBVyxHQUFHLElBQUkseUJBQVcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3ZELE1BQU07WUFDTixHQUFHLEVBQUUsVUFBVSxDQUFDLEdBQUc7U0FDcEIsQ0FBQyxDQUFDO1FBRUgsWUFBWTtRQUNaLE1BQU0sZUFBZSxHQUFHLElBQUksa0NBQWUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDbkUsTUFBTTtZQUNOLGNBQWMsRUFBRSxZQUFZLENBQUMsY0FBYztZQUMzQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsa0JBQWtCO1lBQ25ELFlBQVksRUFBRSxXQUFXLENBQUMsT0FBTztZQUNqQyxHQUFHLEVBQUUsVUFBVSxDQUFDLEdBQUc7U0FDcEIsQ0FBQyxDQUFDO1FBRUgsY0FBYztRQUNkLE1BQU0sVUFBVSxHQUFHLElBQUksd0JBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3BELE1BQU07WUFDTixlQUFlLEVBQUUsZUFBZSxDQUFDLGVBQWU7U0FDakQsQ0FBQyxDQUFDO1FBRUgsc0JBQXNCO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLElBQUksa0JBQVksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQzlDLEtBQUssRUFBRSxVQUFVO1lBQ2pCLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztTQUNoQyxDQUFDLENBQUM7UUFFSCxpQ0FBaUM7UUFDakMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXRFLHNFQUFzRTtRQUN0RSxNQUFNLGFBQWEsR0FBRyxJQUFJLGtCQUFZLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUM1RCxLQUFLLEVBQUUsWUFBWTtZQUNuQixXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsZ0JBQWdCO1FBQ2hCLE1BQU0sZUFBZSxHQUFHLElBQUksa0NBQWUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDbkUsTUFBTTtZQUNOLGFBQWEsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUc7WUFDakMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxNQUFNLENBQUMsT0FBTztTQUN4QyxDQUFDLENBQUM7UUFFSCxZQUFZO1FBQ1osSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3JCLFdBQVcsRUFBRSxrQ0FBa0M7U0FDaEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxXQUFXO1lBQ3pCLFdBQVcsRUFBRSxrQkFBa0I7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDaEMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ2xCLFdBQVcsRUFBRSxZQUFZO1NBQzFCLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEMsS0FBSyxFQUFFLFdBQVcsZUFBZSxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsRUFBRTtZQUN2RSxXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztRQUVILGVBQWU7UUFDZixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDM0QsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMxQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLDRCQUE0QixDQUFDLENBQUM7SUFDL0QsQ0FBQztDQUNGO0FBdEZELGtFQXNGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVudmlyb25tZW50Q29uZmlnIH0gZnJvbSAnLi9jb25maWcvZW52aXJvbm1lbnQnO1xuaW1wb3J0IHsgTmV0d29ya2luZyB9IGZyb20gJy4vY29uc3RydWN0cy9uZXR3b3JraW5nJztcbmltcG9ydCB7IER5bmFtb0RCVGFibGVzIH0gZnJvbSAnLi9jb25zdHJ1Y3RzL2R5bmFtb2RiLXRhYmxlcyc7XG5pbXBvcnQgeyBFbGFzdGlDYWNoZSB9IGZyb20gJy4vY29uc3RydWN0cy9lbGFzdGljYWNoZSc7XG5pbXBvcnQgeyBMYW1iZGFGdW5jdGlvbnMgfSBmcm9tICcuL2NvbnN0cnVjdHMvbGFtYmRhLWZ1bmN0aW9ucyc7XG5pbXBvcnQgeyBBcGlHYXRld2F5IH0gZnJvbSAnLi9jb25zdHJ1Y3RzL2FwaS1nYXRld2F5JztcbmltcG9ydCB7IEZyb250ZW5kSG9zdGluZyB9IGZyb20gJy4vY29uc3RydWN0cy9mcm9udGVuZC1ob3N0aW5nJztcbmltcG9ydCB7IFdhZkNvbnN0cnVjdCB9IGZyb20gJy4vY29uc3RydWN0cy93YWYnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFlvdVR1YmVFZm9vdGJhbGxQbGF5ZXJTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBjb25maWc6IEVudmlyb25tZW50Q29uZmlnO1xufVxuXG5leHBvcnQgY2xhc3MgWW91VHViZUVmb290YmFsbFBsYXllclN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFlvdVR1YmVFZm9vdGJhbGxQbGF5ZXJTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IGNvbmZpZyB9ID0gcHJvcHM7XG5cbiAgICAvLyDjg43jg4Pjg4jjg6/jg7zjgq3jg7PjgrBcbiAgICBjb25zdCBuZXR3b3JraW5nID0gbmV3IE5ldHdvcmtpbmcodGhpcywgJ05ldHdvcmtpbmcnLCB7XG4gICAgICBjb25maWcsXG4gICAgfSk7XG5cbiAgICAvLyBEeW5hbW9EQiDjg4bjg7zjg5bjg6tcbiAgICBjb25zdCBkeW5hbW9UYWJsZXMgPSBuZXcgRHluYW1vREJUYWJsZXModGhpcywgJ0R5bmFtb1RhYmxlcycsIHtcbiAgICAgIGNvbmZpZyxcbiAgICB9KTtcblxuICAgIC8vIEVsYXN0aUNhY2hlIFJlZGlzIOOCr+ODqeOCueOCv+ODvFxuICAgIGNvbnN0IGVsYXN0aUNhY2hlID0gbmV3IEVsYXN0aUNhY2hlKHRoaXMsICdFbGFzdGlDYWNoZScsIHtcbiAgICAgIGNvbmZpZyxcbiAgICAgIHZwYzogbmV0d29ya2luZy52cGMsXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEg6Zai5pWwXG4gICAgY29uc3QgbGFtYmRhRnVuY3Rpb25zID0gbmV3IExhbWJkYUZ1bmN0aW9ucyh0aGlzLCAnTGFtYmRhRnVuY3Rpb25zJywge1xuICAgICAgY29uZmlnLFxuICAgICAgZmF2b3JpdGVzVGFibGU6IGR5bmFtb1RhYmxlcy5mYXZvcml0ZXNUYWJsZSxcbiAgICAgIHNlYXJjaEhpc3RvcnlUYWJsZTogZHluYW1vVGFibGVzLnNlYXJjaEhpc3RvcnlUYWJsZSxcbiAgICAgIHJlZGlzQ2x1c3RlcjogZWxhc3RpQ2FjaGUuY2x1c3RlcixcbiAgICAgIHZwYzogbmV0d29ya2luZy52cGMsXG4gICAgfSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheVxuICAgIGNvbnN0IGFwaUdhdGV3YXkgPSBuZXcgQXBpR2F0ZXdheSh0aGlzLCAnQXBpR2F0ZXdheScsIHtcbiAgICAgIGNvbmZpZyxcbiAgICAgIGJhY2tlbmRGdW5jdGlvbjogbGFtYmRhRnVuY3Rpb25zLmJhY2tlbmRGdW5jdGlvbixcbiAgICB9KTtcblxuICAgIC8vIFdBRiBmb3IgQVBJIEdhdGV3YXlcbiAgICBjb25zdCBhcGlXYWYgPSBuZXcgV2FmQ29uc3RydWN0KHRoaXMsICdBcGlXYWYnLCB7XG4gICAgICBzY29wZTogJ1JFR0lPTkFMJyxcbiAgICAgIGVudmlyb25tZW50OiBjb25maWcuZW52aXJvbm1lbnRcbiAgICB9KTtcblxuICAgIC8vIEFzc29jaWF0ZSBXQUYgd2l0aCBBUEkgR2F0ZXdheVxuICAgIGFwaVdhZi5hc3NvY2lhdGVXaXRoUmVzb3VyY2UoYXBpR2F0ZXdheS5hcGkuZGVwbG95bWVudFN0YWdlLnN0YWdlQXJuKTtcblxuICAgIC8vIFdBRiBmb3IgQ2xvdWRGcm9udCAobXVzdCBiZSBjcmVhdGVkIGJlZm9yZSBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbilcbiAgICBjb25zdCBjbG91ZGZyb250V2FmID0gbmV3IFdhZkNvbnN0cnVjdCh0aGlzLCAnQ2xvdWRGcm9udFdhZicsIHtcbiAgICAgIHNjb3BlOiAnQ0xPVURGUk9OVCcsXG4gICAgICBlbnZpcm9ubWVudDogY29uZmlnLmVudmlyb25tZW50XG4gICAgfSk7XG5cbiAgICAvLyDjg5Xjg63jg7Pjg4jjgqjjg7Pjg4njg5vjgrnjg4bjgqPjg7PjgrBcbiAgICBjb25zdCBmcm9udGVuZEhvc3RpbmcgPSBuZXcgRnJvbnRlbmRIb3N0aW5nKHRoaXMsICdGcm9udGVuZEhvc3RpbmcnLCB7XG4gICAgICBjb25maWcsXG4gICAgICBhcGlHYXRld2F5VXJsOiBhcGlHYXRld2F5LmFwaS51cmwsXG4gICAgICB3ZWJBY2xBcm46IGNsb3VkZnJvbnRXYWYud2ViQWNsLmF0dHJBcm4sXG4gICAgfSk7XG5cbiAgICAvLyDjgrnjgr/jg4Pjgq/lhajkvZPjga7lh7rliptcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU3RhY2tOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuc3RhY2tOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdOYW1lIG9mIHRoZSBDbG91ZEZvcm1hdGlvbiBzdGFjaycsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRW52aXJvbm1lbnQnLCB7XG4gICAgICB2YWx1ZTogY29uZmlnLmVudmlyb25tZW50LFxuICAgICAgZGVzY3JpcHRpb246ICdFbnZpcm9ubWVudCBuYW1lJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZWdpb24nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5yZWdpb24sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FXUyByZWdpb24nLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwcGxpY2F0aW9uVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7ZnJvbnRlbmRIb3N0aW5nLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1VSTCBvZiB0aGUgZGVwbG95ZWQgYXBwbGljYXRpb24nLFxuICAgIH0pO1xuXG4gICAgLy8g44K/44Kw44KS44K544K/44OD44Kv5YWo5L2T44Gr6YGp55SoXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQcm9qZWN0JywgJ1lvdVR1YmVFZm9vdGJhbGxQbGF5ZXInKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0Vudmlyb25tZW50JywgY29uZmlnLmVudmlyb25tZW50KTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ01hbmFnZWRCeScsICdDREsnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ093bmVyJywgJ1lvdVR1YmVFZm9vdGJhbGxQbGF5ZXJUZWFtJyk7XG4gIH1cbn0iXX0=