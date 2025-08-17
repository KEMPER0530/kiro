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
exports.IamRoles = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
class IamRoles extends constructs_1.Construct {
    constructor(scope, id, props) {
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
    createLambdaExecutionRole(config, favoritesTable, searchHistoryTable) {
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
    createCodePipelineRole(config, frontendBucket) {
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
    createCodeBuildRole(config, frontendBucket) {
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
    createCloudFormationRole(config) {
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
        }
        else {
            // 開発環境では管理ポリシーを使用
            managedPolicies.forEach(policyName => {
                role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(policyName));
            });
        }
        return role;
    }
}
exports.IamRoles = IamRoles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWFtLXJvbGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaWFtLXJvbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUczQywyQ0FBdUM7QUFVdkMsTUFBYSxRQUFTLFNBQVEsc0JBQVM7SUFNckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUU3RSxjQUFjO1FBQ2QsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFFdEcsc0JBQXNCO1FBQ3RCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRTVFLG1CQUFtQjtRQUNuQixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFdEUsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFaEUsS0FBSztRQUNMLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDaEQsS0FBSyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPO1lBQ3ZDLFdBQVcsRUFBRSxrQ0FBa0M7WUFDL0MsVUFBVSxFQUFFLEdBQUcsTUFBTSxDQUFDLFdBQVcseUJBQXlCO1NBQzNELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFD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QkFDckMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztnQkFDeEIsT0FBTyxFQUFFO29CQUNQLGdCQUFnQjtvQkFDaEIsZ0JBQWdCO29CQUNoQixhQUFhO29CQUNiLGNBQWM7b0JBQ2Qsc0JBQXNCO29CQUN0QixzQkFBc0I7b0JBQ3RCLG1CQUFtQjtvQkFDbkIsc0JBQXNCO29CQUN0QixtQkFBbUI7b0JBQ25CLHNCQUFzQjtvQkFDdEIsOEJBQThCO2lCQUMvQjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsZ0JBQWdCLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSwyQkFBMkI7aUJBQzlEO2FBQ0YsQ0FBQyxDQUFDLENBQUM7U0FDTDthQUFNO1lBQ0wsa0JBQWtCO1lBQ2xCLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDaEYsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBaldELDRCQWlXQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRW52aXJvbm1lbnRDb25maWcgfSBmcm9tICcuLi9jb25maWcvZW52aXJvbm1lbnQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIElhbVJvbGVzUHJvcHMge1xuICBjb25maWc6IEVudmlyb25tZW50Q29uZmlnO1xuICBmYXZvcml0ZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHNlYXJjaEhpc3RvcnlUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGZyb250ZW5kQnVja2V0OiBzMy5CdWNrZXQ7XG59XG5cbmV4cG9ydCBjbGFzcyBJYW1Sb2xlcyBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBsYW1iZGFFeGVjdXRpb25Sb2xlOiBpYW0uUm9sZTtcbiAgcHVibGljIHJlYWRvbmx5IGNvZGVQaXBlbGluZVJvbGU6IGlhbS5Sb2xlO1xuICBwdWJsaWMgcmVhZG9ubHkgY29kZUJ1aWxkUm9sZTogaWFtLlJvbGU7XG4gIHB1YmxpYyByZWFkb25seSBjbG91ZEZvcm1hdGlvblJvbGU6IGlhbS5Sb2xlO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBJYW1Sb2xlc1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHsgY29uZmlnLCBmYXZvcml0ZXNUYWJsZSwgc2VhcmNoSGlzdG9yeVRhYmxlLCBmcm9udGVuZEJ1Y2tldCB9ID0gcHJvcHM7XG5cbiAgICAvLyBMYW1iZGHlrp/ooYzjg63jg7zjg6tcbiAgICB0aGlzLmxhbWJkYUV4ZWN1dGlvblJvbGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUV4ZWN1dGlvblJvbGUoY29uZmlnLCBmYXZvcml0ZXNUYWJsZSwgc2VhcmNoSGlzdG9yeVRhYmxlKTtcblxuICAgIC8vIENvZGVQaXBlbGluZeOCteODvOODk+OCueODreODvOODq1xuICAgIHRoaXMuY29kZVBpcGVsaW5lUm9sZSA9IHRoaXMuY3JlYXRlQ29kZVBpcGVsaW5lUm9sZShjb25maWcsIGZyb250ZW5kQnVja2V0KTtcblxuICAgIC8vIENvZGVCdWlsZOOCteODvOODk+OCueODreODvOODq1xuICAgIHRoaXMuY29kZUJ1aWxkUm9sZSA9IHRoaXMuY3JlYXRlQ29kZUJ1aWxkUm9sZShjb25maWcsIGZyb250ZW5kQnVja2V0KTtcblxuICAgIC8vIENsb3VkRm9ybWF0aW9u44K144O844OT44K544Ot44O844OrXG4gICAgdGhpcy5jbG91ZEZvcm1hdGlvblJvbGUgPSB0aGlzLmNyZWF0ZUNsb3VkRm9ybWF0aW9uUm9sZShjb25maWcpO1xuXG4gICAgLy8g5Ye65YqbXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xhbWJkYUV4ZWN1dGlvblJvbGVBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5sYW1iZGFFeGVjdXRpb25Sb2xlLnJvbGVBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FSTiBvZiB0aGUgTGFtYmRhIGV4ZWN1dGlvbiByb2xlJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2NvbmZpZy5lbnZpcm9ubWVudH0tTGFtYmRhRXhlY3V0aW9uUm9sZUFybmAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29kZVBpcGVsaW5lUm9sZUFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNvZGVQaXBlbGluZVJvbGUucm9sZUFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBDb2RlUGlwZWxpbmUgc2VydmljZSByb2xlJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2NvbmZpZy5lbnZpcm9ubWVudH0tQ29kZVBpcGVsaW5lUm9sZUFybmAsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUxhbWJkYUV4ZWN1dGlvblJvbGUoXG4gICAgY29uZmlnOiBFbnZpcm9ubWVudENvbmZpZyxcbiAgICBmYXZvcml0ZXNUYWJsZTogZHluYW1vZGIuVGFibGUsXG4gICAgc2VhcmNoSGlzdG9yeVRhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICApOiBpYW0uUm9sZSB7XG4gICAgY29uc3Qgcm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnTGFtYmRhRXhlY3V0aW9uUm9sZScsIHtcbiAgICAgIHJvbGVOYW1lOiBgeW91dHViZS1lZm9vdGJhbGwtbGFtYmRhLXJvbGUtJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgZGVzY3JpcHRpb246ICdFeGVjdXRpb24gcm9sZSBmb3IgWW91VHViZSBlRm9vdGJhbGwgUGxheWVyIExhbWJkYSBmdW5jdGlvbnMnLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYVZQQ0FjY2Vzc0V4ZWN1dGlvblJvbGUnKSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBEeW5hbW9EQuaoqemZkFxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiAnRHluYW1vREJBY2Nlc3MnLFxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpRdWVyeScsXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJyxcbiAgICAgICAgJ2R5bmFtb2RiOkJhdGNoR2V0SXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpCYXRjaFdyaXRlSXRlbScsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIGZhdm9yaXRlc1RhYmxlLnRhYmxlQXJuLFxuICAgICAgICBzZWFyY2hIaXN0b3J5VGFibGUudGFibGVBcm4sXG4gICAgICAgIGAke2Zhdm9yaXRlc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7c2VhcmNoSGlzdG9yeVRhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgLy8gQ2xvdWRXYXRjaCBMb2dz5qip6ZmQXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6ICdDbG91ZFdhdGNoTG9nc0FjY2VzcycsXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcbiAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcbiAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dHcm91cHMnLFxuICAgICAgICAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgYXJuOmF3czpsb2dzOiR7Y2RrLkF3cy5SRUdJT059OiR7Y2RrLkF3cy5BQ0NPVU5UX0lEfTpsb2ctZ3JvdXA6L2F3cy9sYW1iZGEveW91dHViZS1lZm9vdGJhbGwtKmAsXG4gICAgICBdLFxuICAgIH0pKTtcblxuICAgIC8vIFgtUmF55qip6ZmQ77yI5pyJ5Yq544Gq5aC05ZCI77yJXG4gICAgaWYgKGNvbmZpZy5tb25pdG9yaW5nLmVuYWJsZVhSYXkpIHtcbiAgICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBzaWQ6ICdYUmF5QWNjZXNzJyxcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ3hyYXk6UHV0VHJhY2VTZWdtZW50cycsXG4gICAgICAgICAgJ3hyYXk6UHV0VGVsZW1ldHJ5UmVjb3JkcycsXG4gICAgICAgICAgJ3hyYXk6R2V0U2FtcGxpbmdSdWxlcycsXG4gICAgICAgICAgJ3hyYXk6R2V0U2FtcGxpbmdUYXJnZXRzJyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICAvLyBTZWNyZXRzIE1hbmFnZXLmqKnpmZDvvIjmnKznlarnkrDlooPjga7jgb/vvIlcbiAgICBpZiAoY29uZmlnLmVudmlyb25tZW50ID09PSAncHJvZCcpIHtcbiAgICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBzaWQ6ICdTZWNyZXRzTWFuYWdlckFjY2VzcycsXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScsXG4gICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkRlc2NyaWJlU2VjcmV0JyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgYGFybjphd3M6c2VjcmV0c21hbmFnZXI6JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OnNlY3JldDp5b3V0dWJlLWVmb290YmFsbC0qYCxcbiAgICAgICAgXSxcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICAvLyBFbGFzdGlDYWNoZeaoqemZkFxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiAnRWxhc3RpQ2FjaGVBY2Nlc3MnLFxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnZWxhc3RpY2FjaGU6RGVzY3JpYmVDYWNoZUNsdXN0ZXJzJyxcbiAgICAgICAgJ2VsYXN0aWNhY2hlOkRlc2NyaWJlUmVwbGljYXRpb25Hcm91cHMnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgYXJuOmF3czplbGFzdGljYWNoZToke2Nkay5Bd3MuUkVHSU9OfToke2Nkay5Bd3MuQUNDT1VOVF9JRH06Y2x1c3Rlcjp5b3V0dWJlLWVmb290YmFsbC1yZWRpcy0ke2NvbmZpZy5lbnZpcm9ubWVudH1gLFxuICAgICAgXSxcbiAgICB9KSk7XG5cbiAgICByZXR1cm4gcm9sZTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQ29kZVBpcGVsaW5lUm9sZShjb25maWc6IEVudmlyb25tZW50Q29uZmlnLCBmcm9udGVuZEJ1Y2tldDogczMuQnVja2V0KTogaWFtLlJvbGUge1xuICAgIGNvbnN0IHJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0NvZGVQaXBlbGluZVJvbGUnLCB7XG4gICAgICByb2xlTmFtZTogYHlvdXR1YmUtZWZvb3RiYWxsLWNvZGVwaXBlbGluZS1yb2xlLSR7Y29uZmlnLmVudmlyb25tZW50fWAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnY29kZXBpcGVsaW5lLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VydmljZSByb2xlIGZvciBDb2RlUGlwZWxpbmUnLFxuICAgIH0pO1xuXG4gICAgLy8gUzPmqKnpmZDvvIjjgqLjg7zjg4bjgqPjg5XjgqHjgq/jg4jnlKjvvIlcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ1MzQXJ0aWZhY3RBY2Nlc3MnLFxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnczM6R2V0T2JqZWN0JyxcbiAgICAgICAgJ3MzOkdldE9iamVjdFZlcnNpb24nLFxuICAgICAgICAnczM6UHV0T2JqZWN0JyxcbiAgICAgICAgJ3MzOkdldEJ1Y2tldFZlcnNpb25pbmcnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgYXJuOmF3czpzMzo6OnlvdXR1YmUtZWZvb3RiYWxsLXBpcGVsaW5lLWFydGlmYWN0cy0ke2NvbmZpZy5lbnZpcm9ubWVudH0tKmAsXG4gICAgICAgIGBhcm46YXdzOnMzOjo6eW91dHViZS1lZm9vdGJhbGwtcGlwZWxpbmUtYXJ0aWZhY3RzLSR7Y29uZmlnLmVudmlyb25tZW50fS0qLypgLFxuICAgICAgXSxcbiAgICB9KSk7XG5cbiAgICAvLyDjg5Xjg63jg7Pjg4jjgqjjg7Pjg4njg5DjgrHjg4Pjg4jmqKnpmZBcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ0Zyb250ZW5kQnVja2V0QWNjZXNzJyxcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3MzOlB1dE9iamVjdCcsXG4gICAgICAgICdzMzpQdXRPYmplY3RBY2wnLFxuICAgICAgICAnczM6R2V0T2JqZWN0JyxcbiAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdCcsXG4gICAgICAgICdzMzpMaXN0QnVja2V0JyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgZnJvbnRlbmRCdWNrZXQuYnVja2V0QXJuLFxuICAgICAgICBgJHtmcm9udGVuZEJ1Y2tldC5idWNrZXRBcm59LypgLFxuICAgICAgXSxcbiAgICB9KSk7XG5cbiAgICAvLyBDb2RlQnVpbGTmqKnpmZBcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ0NvZGVCdWlsZEFjY2VzcycsXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdjb2RlYnVpbGQ6QmF0Y2hHZXRCdWlsZHMnLFxuICAgICAgICAnY29kZWJ1aWxkOlN0YXJ0QnVpbGQnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgYXJuOmF3czpjb2RlYnVpbGQ6JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OnByb2plY3QveW91dHViZS1lZm9vdGJhbGwtKmAsXG4gICAgICBdLFxuICAgIH0pKTtcblxuICAgIC8vIENsb3VkRm9ybWF0aW9u5qip6ZmQXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6ICdDbG91ZEZvcm1hdGlvbkFjY2VzcycsXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdjbG91ZGZvcm1hdGlvbjpDcmVhdGVTdGFjaycsXG4gICAgICAgICdjbG91ZGZvcm1hdGlvbjpEZWxldGVTdGFjaycsXG4gICAgICAgICdjbG91ZGZvcm1hdGlvbjpEZXNjcmliZVN0YWNrcycsXG4gICAgICAgICdjbG91ZGZvcm1hdGlvbjpVcGRhdGVTdGFjaycsXG4gICAgICAgICdjbG91ZGZvcm1hdGlvbjpDcmVhdGVDaGFuZ2VTZXQnLFxuICAgICAgICAnY2xvdWRmb3JtYXRpb246RGVsZXRlQ2hhbmdlU2V0JyxcbiAgICAgICAgJ2Nsb3VkZm9ybWF0aW9uOkRlc2NyaWJlQ2hhbmdlU2V0JyxcbiAgICAgICAgJ2Nsb3VkZm9ybWF0aW9uOkV4ZWN1dGVDaGFuZ2VTZXQnLFxuICAgICAgICAnY2xvdWRmb3JtYXRpb246U2V0U3RhY2tQb2xpY3knLFxuICAgICAgICAnY2xvdWRmb3JtYXRpb246VmFsaWRhdGVUZW1wbGF0ZScsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIGBhcm46YXdzOmNsb3VkZm9ybWF0aW9uOiR7Y2RrLkF3cy5SRUdJT059OiR7Y2RrLkF3cy5BQ0NPVU5UX0lEfTpzdGFjay9Zb3VUdWJlRWZvb3RiYWxsUGxheWVyLSovKmAsXG4gICAgICBdLFxuICAgIH0pKTtcblxuICAgIC8vIElBTeODkeOCueOCueODq+ODvOaoqemZkFxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiAnSUFNUGFzc1JvbGUnLFxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogWydpYW06UGFzc1JvbGUnXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgYXJuOmF3czppYW06OiR7Y2RrLkF3cy5BQ0NPVU5UX0lEfTpyb2xlL3lvdXR1YmUtZWZvb3RiYWxsLWNsb3VkZm9ybWF0aW9uLXJvbGUtJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgcmV0dXJuIHJvbGU7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUNvZGVCdWlsZFJvbGUoY29uZmlnOiBFbnZpcm9ubWVudENvbmZpZywgZnJvbnRlbmRCdWNrZXQ6IHMzLkJ1Y2tldCk6IGlhbS5Sb2xlIHtcbiAgICBjb25zdCByb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdDb2RlQnVpbGRSb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGB5b3V0dWJlLWVmb290YmFsbC1jb2RlYnVpbGQtcm9sZS0ke2NvbmZpZy5lbnZpcm9ubWVudH1gLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2NvZGVidWlsZC5hbWF6b25hd3MuY29tJyksXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlcnZpY2Ugcm9sZSBmb3IgQ29kZUJ1aWxkIHByb2plY3RzJyxcbiAgICB9KTtcblxuICAgIC8vIENsb3VkV2F0Y2ggTG9nc+aoqemZkFxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiAnQ2xvdWRXYXRjaExvZ3NBY2Nlc3MnLFxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXG4gICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIGBhcm46YXdzOmxvZ3M6JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OmxvZy1ncm91cDovYXdzL2NvZGVidWlsZC95b3V0dWJlLWVmb290YmFsbC0qYCxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgLy8gUzPmqKnpmZDvvIjjgqLjg7zjg4bjgqPjg5XjgqHjgq/jg4jnlKjvvIlcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ1MzQXJ0aWZhY3RBY2Nlc3MnLFxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnczM6R2V0T2JqZWN0JyxcbiAgICAgICAgJ3MzOkdldE9iamVjdFZlcnNpb24nLFxuICAgICAgICAnczM6UHV0T2JqZWN0JyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYGFybjphd3M6czM6Ojp5b3V0dWJlLWVmb290YmFsbC1waXBlbGluZS1hcnRpZmFjdHMtJHtjb25maWcuZW52aXJvbm1lbnR9LSpgLFxuICAgICAgICBgYXJuOmF3czpzMzo6OnlvdXR1YmUtZWZvb3RiYWxsLXBpcGVsaW5lLWFydGlmYWN0cy0ke2NvbmZpZy5lbnZpcm9ubWVudH0tKi8qYCxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgLy8gRUNS5qip6ZmQ77yIRG9ja2Vy44Kk44Oh44O844K455So77yJXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6ICdFQ1JBY2Nlc3MnLFxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnZWNyOkJhdGNoQ2hlY2tMYXllckF2YWlsYWJpbGl0eScsXG4gICAgICAgICdlY3I6R2V0RG93bmxvYWRVcmxGb3JMYXllcicsXG4gICAgICAgICdlY3I6QmF0Y2hHZXRJbWFnZScsXG4gICAgICAgICdlY3I6R2V0QXV0aG9yaXphdGlvblRva2VuJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKTtcblxuICAgIC8vIFNlY3JldHMgTWFuYWdlcuaoqemZkO+8iEFQSSBLZXnnlKjvvIlcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ1NlY3JldHNNYW5hZ2VyQWNjZXNzJyxcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkdldFNlY3JldFZhbHVlJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYGFybjphd3M6c2VjcmV0c21hbmFnZXI6JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OnNlY3JldDp5b3V0dWJlLWVmb290YmFsbC0qYCxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgLy8gQ29kZUJ1aWxkIFJlcG9ydHPmqKnpmZBcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ0NvZGVCdWlsZFJlcG9ydHNBY2Nlc3MnLFxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnY29kZWJ1aWxkOkNyZWF0ZVJlcG9ydEdyb3VwJyxcbiAgICAgICAgJ2NvZGVidWlsZDpDcmVhdGVSZXBvcnQnLFxuICAgICAgICAnY29kZWJ1aWxkOlVwZGF0ZVJlcG9ydCcsXG4gICAgICAgICdjb2RlYnVpbGQ6QmF0Y2hQdXRUZXN0Q2FzZXMnLFxuICAgICAgICAnY29kZWJ1aWxkOkJhdGNoUHV0Q29kZUNvdmVyYWdlcycsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIGBhcm46YXdzOmNvZGVidWlsZDoke2Nkay5Bd3MuUkVHSU9OfToke2Nkay5Bd3MuQUNDT1VOVF9JRH06cmVwb3J0LWdyb3VwL3lvdXR1YmUtZWZvb3RiYWxsLSpgLFxuICAgICAgXSxcbiAgICB9KSk7XG5cbiAgICByZXR1cm4gcm9sZTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQ2xvdWRGb3JtYXRpb25Sb2xlKGNvbmZpZzogRW52aXJvbm1lbnRDb25maWcpOiBpYW0uUm9sZSB7XG4gICAgY29uc3Qgcm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQ2xvdWRGb3JtYXRpb25Sb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGB5b3V0dWJlLWVmb290YmFsbC1jbG91ZGZvcm1hdGlvbi1yb2xlLSR7Y29uZmlnLmVudmlyb25tZW50fWAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnY2xvdWRmb3JtYXRpb24uYW1hem9uYXdzLmNvbScpLFxuICAgICAgZGVzY3JpcHRpb246ICdTZXJ2aWNlIHJvbGUgZm9yIENsb3VkRm9ybWF0aW9uIGRlcGxveW1lbnRzJyxcbiAgICB9KTtcblxuICAgIC8vIOeuoeeQhuODneODquOCt+ODvOOCkuOCouOCv+ODg+ODge+8iOacrOeVqueSsOWig+OBp+OBr+WItumZkOOCkuaknOioju+8iVxuICAgIGNvbnN0IG1hbmFnZWRQb2xpY2llcyA9IFtcbiAgICAgICdJQU1GdWxsQWNjZXNzJyxcbiAgICAgICdBbWF6b25TM0Z1bGxBY2Nlc3MnLFxuICAgICAgJ0FtYXpvbkR5bmFtb0RCRnVsbEFjY2VzcycsXG4gICAgICAnQVdTTGFtYmRhX0Z1bGxBY2Nlc3MnLFxuICAgICAgJ0FtYXpvbkFQSUdhdGV3YXlBZG1pbmlzdHJhdG9yJyxcbiAgICAgICdDbG91ZEZyb250RnVsbEFjY2VzcycsXG4gICAgICAnRWxhc3RpQ2FjaGVGdWxsQWNjZXNzJyxcbiAgICAgICdBbWF6b25WUENGdWxsQWNjZXNzJyxcbiAgICAgICdDbG91ZFdhdGNoRnVsbEFjY2VzcycsXG4gICAgXTtcblxuICAgIGlmIChjb25maWcuZW52aXJvbm1lbnQgPT09ICdwcm9kJykge1xuICAgICAgLy8g5pys55Wq55Kw5aKD44Gn44Gv5pyA5bCP5qip6ZmQ44Gu5Y6f5YmH44KS6YGp55SoXG4gICAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgc2lkOiAnUmVzdHJpY3RlZENsb3VkRm9ybWF0aW9uQWNjZXNzJyxcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ2lhbTpDcmVhdGVSb2xlJyxcbiAgICAgICAgICAnaWFtOkRlbGV0ZVJvbGUnLFxuICAgICAgICAgICdpYW06R2V0Um9sZScsXG4gICAgICAgICAgJ2lhbTpQYXNzUm9sZScsXG4gICAgICAgICAgJ2lhbTpBdHRhY2hSb2xlUG9saWN5JyxcbiAgICAgICAgICAnaWFtOkRldGFjaFJvbGVQb2xpY3knLFxuICAgICAgICAgICdpYW06UHV0Um9sZVBvbGljeScsXG4gICAgICAgICAgJ2lhbTpEZWxldGVSb2xlUG9saWN5JyxcbiAgICAgICAgICAnaWFtOkdldFJvbGVQb2xpY3knLFxuICAgICAgICAgICdpYW06TGlzdFJvbGVQb2xpY2llcycsXG4gICAgICAgICAgJ2lhbTpMaXN0QXR0YWNoZWRSb2xlUG9saWNpZXMnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgYXJuOmF3czppYW06OiR7Y2RrLkF3cy5BQ0NPVU5UX0lEfTpyb2xlL3lvdXR1YmUtZWZvb3RiYWxsLSpgLFxuICAgICAgICBdLFxuICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyDplovnmbrnkrDlooPjgafjga/nrqHnkIbjg53jg6rjgrfjg7zjgpLkvb/nlKhcbiAgICAgIG1hbmFnZWRQb2xpY2llcy5mb3JFYWNoKHBvbGljeU5hbWUgPT4ge1xuICAgICAgICByb2xlLmFkZE1hbmFnZWRQb2xpY3koaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKHBvbGljeU5hbWUpKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByb2xlO1xuICB9XG59Il19