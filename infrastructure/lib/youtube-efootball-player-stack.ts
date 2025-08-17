import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './config/environment';
import { Networking } from './constructs/networking';
import { DynamoDBTables } from './constructs/dynamodb-tables';
import { ElastiCache } from './constructs/elasticache';
import { LambdaFunctions } from './constructs/lambda-functions';
import { ApiGateway } from './constructs/api-gateway';
import { FrontendHosting } from './constructs/frontend-hosting';
import { WafConstruct } from './constructs/waf';

export interface YouTubeEfootballPlayerStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class YouTubeEfootballPlayerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: YouTubeEfootballPlayerStackProps) {
    super(scope, id, props);

    const { config } = props;

    // ネットワーキング
    const networking = new Networking(this, 'Networking', {
      config,
    });

    // DynamoDB テーブル
    const dynamoTables = new DynamoDBTables(this, 'DynamoTables', {
      config,
    });

    // ElastiCache Redis クラスター
    const elastiCache = new ElastiCache(this, 'ElastiCache', {
      config,
      vpc: networking.vpc,
    });

    // Lambda 関数
    const lambdaFunctions = new LambdaFunctions(this, 'LambdaFunctions', {
      config,
      favoritesTable: dynamoTables.favoritesTable,
      searchHistoryTable: dynamoTables.searchHistoryTable,
      redisCluster: elastiCache.cluster,
      vpc: networking.vpc,
    });

    // API Gateway
    const apiGateway = new ApiGateway(this, 'ApiGateway', {
      config,
      backendFunction: lambdaFunctions.backendFunction,
    });

    // WAF for API Gateway
    const apiWaf = new WafConstruct(this, 'ApiWaf', {
      scope: 'REGIONAL',
      environment: config.environment
    });

    // Associate WAF with API Gateway
    apiWaf.associateWithResource(apiGateway.api.deploymentStage.stageArn);

    // WAF for CloudFront (must be created before CloudFront distribution)
    const cloudfrontWaf = new WafConstruct(this, 'CloudFrontWaf', {
      scope: 'CLOUDFRONT',
      environment: config.environment
    });

    // フロントエンドホスティング
    const frontendHosting = new FrontendHosting(this, 'FrontendHosting', {
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