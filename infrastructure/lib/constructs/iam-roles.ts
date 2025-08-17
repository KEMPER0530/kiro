import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface IamRolesProps {
  config: EnvironmentConfig;
  favoritesTable: dynamodb.Table;
  searchHistoryTable: dynamodb.Table;
  frontendBucket: s3.Bucket;
}

export class IamRoles extends Construct {
  public readonly lambdaExecutionRole: iam.Role;
  public readonly codePipelineRole: iam.Role;
  public readonly codeBuildRole: iam.Role;
  public readonly cloudFormationRole: iam.Role;

  constructor(scope: Construct, id: string, props: IamRolesProps) {
    super(scope, id);

    const { config, favoritesTable, searchHistoryTable, frontendBucket } = props;

    // Lambda実行ロール
    this.lambdaExecutionRole = this.createLambdaExecutionRole(config, favoritesTable, searchHistoryTable);

    // CodePipelineサービスロール
    this.codePipelineRole = this.createCodePipelineRole(config, frontendBucket);

    // CodeBuildサービスロール
    this.codeBuildRole = this.createCodeBuildRole(config, frontendBucket);

    // CloudFormationサービスロール
    this.cloudFormationRole = this.createCloudFormationRole(config);

    // 出力
    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      description: 'ARN of the Lambda execution role',
      exportName: `${config.environment}-LambdaExecutionRoleArn`,
    });

    new cdk.CfnOutput(this, 'CodePipelineRoleArn', {
      value: this.codePipelineRole.roleArn,
      description: 'ARN of the CodePipeline service role',
      exportName: `${config.environment}-CodePipelineRoleArn`,
    });
  }

  private createLambdaExecutionRole(
    config: EnvironmentConfig,
    favoritesTable: dynamodb.Table,
    searchHistoryTable: dynamodb.Table
  ): iam.Role {
    const role = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `youtube-efootball-lambda-role-${config.environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for YouTube eFootball Player Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // DynamoDB権限
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'DynamoDBAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        'dynamodb:BatchGetItem',
        'dynamodb:BatchWriteItem',
      ],
      resources: [
        favoritesTable.tableArn,
        searchHistoryTable.tableArn,
        `${favoritesTable.tableArn}/index/*`,
        `${searchHistoryTable.tableArn}/index/*`,
      ],
    }));

    // CloudWatch Logs権限
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'CloudWatchLogsAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogGroups',
        'logs:DescribeLogStreams',
      ],
      resources: [
        `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/youtube-efootball-*`,
      ],
    }));

    // X-Ray権限（有効な場合）
    if (config.monitoring.enableXRay) {
      role.addToPolicy(new iam.PolicyStatement({
        sid: 'XRayAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
          'xray:GetSamplingRules',
          'xray:GetSamplingTargets',
        ],
        resources: ['*'],
      }));
    }

    // Secrets Manager権限（本番環境のみ）
    if (config.environment === 'prod') {
      role.addToPolicy(new iam.PolicyStatement({
        sid: 'SecretsManagerAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',
        ],
        resources: [
          `arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:youtube-efootball-*`,
        ],
      }));
    }

    // ElastiCache権限
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'ElastiCacheAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'elasticache:DescribeCacheClusters',
        'elasticache:DescribeReplicationGroups',
      ],
      resources: [
        `arn:aws:elasticache:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:cluster:youtube-efootball-redis-${config.environment}`,
      ],
    }));

    return role;
  }

  private createCodePipelineRole(config: EnvironmentConfig, frontendBucket: s3.Bucket): iam.Role {
    const role = new iam.Role(this, 'CodePipelineRole', {
      roleName: `youtube-efootball-codepipeline-role-${config.environment}`,
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
      description: 'Service role for CodePipeline',
    });

    // S3権限（アーティファクト用）
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'S3ArtifactAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:GetObjectVersion',
        's3:PutObject',
        's3:GetBucketVersioning',
      ],
      resources: [
        `arn:aws:s3:::youtube-efootball-pipeline-artifacts-${config.environment}-*`,
        `arn:aws:s3:::youtube-efootball-pipeline-artifacts-${config.environment}-*/*`,
      ],
    }));

    // フロントエンドバケット権限
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'FrontendBucketAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:PutObjectAcl',
        's3:GetObject',
        's3:DeleteObject',
        's3:ListBucket',
      ],
      resources: [
        frontendBucket.bucketArn,
        `${frontendBucket.bucketArn}/*`,
      ],
    }));

    // CodeBuild権限
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'CodeBuildAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'codebuild:BatchGetBuilds',
        'codebuild:StartBuild',
      ],
      resources: [
        `arn:aws:codebuild:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:project/youtube-efootball-*`,
      ],
    }));

    // CloudFormation権限
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'CloudFormationAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudformation:CreateStack',
        'cloudformation:DeleteStack',
        'cloudformation:DescribeStacks',
        'cloudformation:UpdateStack',
        'cloudformation:CreateChangeSet',
        'cloudformation:DeleteChangeSet',
        'cloudformation:DescribeChangeSet',
        'cloudformation:ExecuteChangeSet',
        'cloudformation:SetStackPolicy',
        'cloudformation:ValidateTemplate',
      ],
      resources: [
        `arn:aws:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/YouTubeEfootballPlayer-*/*`,
      ],
    }));

    // IAMパススルー権限
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'IAMPassRole',
      effect: iam.Effect.ALLOW,
      actions: ['iam:PassRole'],
      resources: [
        `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:role/youtube-efootball-cloudformation-role-${config.environment}`,
      ],
    }));

    return role;
  }

  private createCodeBuildRole(config: EnvironmentConfig, frontendBucket: s3.Bucket): iam.Role {
    const role = new iam.Role(this, 'CodeBuildRole', {
      roleName: `youtube-efootball-codebuild-role-${config.environment}`,
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      description: 'Service role for CodeBuild projects',
    });

    // CloudWatch Logs権限
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'CloudWatchLogsAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [
        `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/codebuild/youtube-efootball-*`,
      ],
    }));

    // S3権限（アーティファクト用）
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'S3ArtifactAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:GetObjectVersion',
        's3:PutObject',
      ],
      resources: [
        `arn:aws:s3:::youtube-efootball-pipeline-artifacts-${config.environment}-*`,
        `arn:aws:s3:::youtube-efootball-pipeline-artifacts-${config.environment}-*/*`,
      ],
    }));

    // ECR権限（Dockerイメージ用）
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'ECRAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'ecr:GetAuthorizationToken',
      ],
      resources: ['*'],
    }));

    // Secrets Manager権限（API Key用）
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'SecretsManagerAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
      ],
      resources: [
        `arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:youtube-efootball-*`,
      ],
    }));

    // CodeBuild Reports権限
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'CodeBuildReportsAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'codebuild:CreateReportGroup',
        'codebuild:CreateReport',
        'codebuild:UpdateReport',
        'codebuild:BatchPutTestCases',
        'codebuild:BatchPutCodeCoverages',
      ],
      resources: [
        `arn:aws:codebuild:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:report-group/youtube-efootball-*`,
      ],
    }));

    return role;
  }

  private createCloudFormationRole(config: EnvironmentConfig): iam.Role {
    const role = new iam.Role(this, 'CloudFormationRole', {
      roleName: `youtube-efootball-cloudformation-role-${config.environment}`,
      assumedBy: new iam.ServicePrincipal('cloudformation.amazonaws.com'),
      description: 'Service role for CloudFormation deployments',
    });

    // 管理ポリシーをアタッチ（本番環境では制限を検討）
    const managedPolicies = [
      'IAMFullAccess',
      'AmazonS3FullAccess',
      'AmazonDynamoDBFullAccess',
      'AWSLambda_FullAccess',
      'AmazonAPIGatewayAdministrator',
      'CloudFrontFullAccess',
      'ElastiCacheFullAccess',
      'AmazonVPCFullAccess',
      'CloudWatchFullAccess',
    ];

    if (config.environment === 'prod') {
      // 本番環境では最小権限の原則を適用
      role.addToPolicy(new iam.PolicyStatement({
        sid: 'RestrictedCloudFormationAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'iam:CreateRole',
          'iam:DeleteRole',
          'iam:GetRole',
          'iam:PassRole',
          'iam:AttachRolePolicy',
          'iam:DetachRolePolicy',
          'iam:PutRolePolicy',
          'iam:DeleteRolePolicy',
          'iam:GetRolePolicy',
          'iam:ListRolePolicies',
          'iam:ListAttachedRolePolicies',
        ],
        resources: [
          `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:role/youtube-efootball-*`,
        ],
      }));
    } else {
      // 開発環境では管理ポリシーを使用
      managedPolicies.forEach(policyName => {
        role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(policyName));
      });
    }

    return role;
  }
}