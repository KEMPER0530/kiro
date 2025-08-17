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
exports.FrontendHosting = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
class FrontendHosting extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { config, apiGatewayUrl, webAclArn } = props;
        // S3バケット（静的ウェブサイトホスティング用）
        this.bucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `youtube-efootball-frontend-${config.environment}-${cdk.Aws.ACCOUNT_ID}`,
            removalPolicy: config.environment === 'prod'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: config.environment !== 'prod',
            // パブリックアクセスをブロック（CloudFront経由でのみアクセス可能）
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            // バージョニング（本番環境のみ）
            versioned: config.environment === 'prod',
            // 暗号化
            encryption: s3.BucketEncryption.S3_MANAGED,
            // ライフサイクル設定
            lifecycleRules: [
                {
                    id: 'DeleteOldVersions',
                    enabled: true,
                    noncurrentVersionExpiration: cdk.Duration.days(30),
                },
            ],
            // タグ
            tags: {
                Name: `youtube-efootball-frontend-${config.environment}`,
                Purpose: 'Static website hosting for frontend',
                Environment: config.environment,
            },
        });
        // Origin Access Identity
        this.oai = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
            comment: `OAI for YouTube eFootball Player ${config.environment}`,
        });
        // S3バケットポリシー（CloudFrontからのアクセスのみ許可）
        this.bucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [this.bucket.arnForObjects('*')],
            principals: [new iam.CanonicalUserPrincipal(this.oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
        }));
        // CloudFront Distribution
        this.distribution = new cloudfront.Distribution(this, 'Distribution', {
            comment: `YouTube eFootball Player ${config.environment}`,
            webAclId: webAclArn,
            // デフォルトオリジン（S3）
            defaultBehavior: {
                origin: new origins.S3Origin(this.bucket, {
                    originAccessIdentity: this.oai,
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                compress: true,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
                responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
            },
            // 追加のビヘイビア（API Gateway）
            additionalBehaviors: {
                '/api/*': {
                    origin: new origins.HttpOrigin(apiGatewayUrl.replace('https://', '').replace('http://', ''), {
                        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
                    }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                    compress: true,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
                },
            },
            // エラーページ設定
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
            ],
            // デフォルトルートオブジェクト
            defaultRootObject: 'index.html',
            // 価格クラス
            priceClass: config.cloudfront.priceClass === 'PriceClass_All'
                ? cloudfront.PriceClass.PRICE_CLASS_ALL
                : config.cloudfront.priceClass === 'PriceClass_200'
                    ? cloudfront.PriceClass.PRICE_CLASS_200
                    : cloudfront.PriceClass.PRICE_CLASS_100,
            // 地理的制限（必要に応じて）
            geoRestriction: cloudfront.GeoRestriction.allowlist('JP', 'US', 'GB'),
            // HTTP/2有効化
            httpVersion: cloudfront.HttpVersion.HTTP2,
            // IPv6有効化
            enableIpv6: true,
            // ログ設定
            enableLogging: config.monitoring.enableDetailedMonitoring,
            logBucket: config.monitoring.enableDetailedMonitoring ? new s3.Bucket(this, 'LogsBucket', {
                bucketName: `youtube-efootball-logs-${config.environment}-${cdk.Aws.ACCOUNT_ID}`,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                autoDeleteObjects: true,
            }) : undefined,
            logFilePrefix: 'cloudfront-logs/',
            // タグ
            tags: {
                Name: `youtube-efootball-distribution-${config.environment}`,
                Purpose: 'CDN for frontend and API',
                Environment: config.environment,
            },
        });
        // フロントエンドのデプロイ
        new s3deploy.BucketDeployment(this, 'DeployFrontend', {
            sources: [s3deploy.Source.asset('../frontend/dist')],
            destinationBucket: this.bucket,
            distribution: this.distribution,
            distributionPaths: ['/*'],
            // キャッシュ制御
            cacheControl: [
                s3deploy.CacheControl.setPublic(),
                s3deploy.CacheControl.maxAge(cdk.Duration.days(1)),
            ],
            // メタデータ
            metadata: {
                'Cache-Control': 'public, max-age=86400',
            },
        });
        // CloudWatch アラーム
        this.createCloudWatchAlarms(config);
        // 出力
        new cdk.CfnOutput(this, 'FrontendBucketName', {
            value: this.bucket.bucketName,
            description: 'Name of the frontend S3 bucket',
            exportName: `${config.environment}-FrontendBucketName`,
        });
        new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
            value: this.distribution.distributionId,
            description: 'ID of the CloudFront distribution',
            exportName: `${config.environment}-CloudFrontDistributionId`,
        });
        new cdk.CfnOutput(this, 'CloudFrontDomainName', {
            value: this.distribution.distributionDomainName,
            description: 'Domain name of the CloudFront distribution',
            exportName: `${config.environment}-CloudFrontDomainName`,
        });
        new cdk.CfnOutput(this, 'WebsiteUrl', {
            value: `https://${this.distribution.distributionDomainName}`,
            description: 'URL of the website',
            exportName: `${config.environment}-WebsiteUrl`,
        });
    }
    createCloudWatchAlarms(config) {
        if (!config.monitoring.enableDetailedMonitoring) {
            return;
        }
        // 4XXエラー率アラーム
        this.distribution.metric('4xxErrorRate').createAlarm(this, 'CloudFront4XXErrorAlarm', {
            threshold: 5,
            evaluationPeriods: 2,
            alarmDescription: 'CloudFront 4XX error rate is high',
        });
        // 5XXエラー率アラーム
        this.distribution.metric('5xxErrorRate').createAlarm(this, 'CloudFront5XXErrorAlarm', {
            threshold: 1,
            evaluationPeriods: 2,
            alarmDescription: 'CloudFront 5XX error rate is high',
        });
        // オリジンレイテンシアラーム
        this.distribution.metric('OriginLatency').createAlarm(this, 'CloudFrontOriginLatencyAlarm', {
            threshold: 5000,
            evaluationPeriods: 2,
            alarmDescription: 'CloudFront origin latency is high',
        });
    }
}
exports.FrontendHosting = FrontendHosting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRlbmQtaG9zdGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZyb250ZW5kLWhvc3RpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdURBQXlDO0FBQ3pDLHdFQUEwRDtBQUMxRCx1RUFBeUQ7QUFDekQsNEVBQThEO0FBQzlELHlEQUEyQztBQUMzQywyQ0FBdUM7QUFTdkMsTUFBYSxlQUFnQixTQUFRLHNCQUFTO0lBSzVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFbkQsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNsRCxVQUFVLEVBQUUsOEJBQThCLE1BQU0sQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUU7WUFDcEYsYUFBYSxFQUFFLE1BQU0sQ0FBQyxXQUFXLEtBQUssTUFBTTtnQkFDMUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtnQkFDMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUM3QixpQkFBaUIsRUFBRSxNQUFNLENBQUMsV0FBVyxLQUFLLE1BQU07WUFFaEQsd0NBQXdDO1lBQ3hDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBRWpELGtCQUFrQjtZQUNsQixTQUFTLEVBQUUsTUFBTSxDQUFDLFdBQVcsS0FBSyxNQUFNO1lBRXhDLE1BQU07WUFDTixVQUFVLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVU7WUFFMUMsWUFB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O1NBQ3RELENBQUMsQ0FBQztRQUVILGNBQWM7UUFDZCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ3BGLFNBQVMsRUFBRSxDQUFDO1lBQ1osaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixnQkFBZ0IsRUFBRSxtQ0FBbUM7U0FDdEQsQ0FBQyxDQUFDO1FBRUgsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUU7WUFDMUYsU0FBUyxFQUFFLElBQUk7WUFDZixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGdCQUFnQixFQUFFLG1DQUFtQztTQUN0RCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF4TkQsMENBd05DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVudmlyb25tZW50Q29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL2Vudmlyb25tZW50JztcblxuZXhwb3J0IGludGVyZmFjZSBGcm9udGVuZEhvc3RpbmdQcm9wcyB7XG4gIGNvbmZpZzogRW52aXJvbm1lbnRDb25maWc7XG4gIGFwaUdhdGV3YXlVcmw6IHN0cmluZztcbiAgd2ViQWNsQXJuPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgRnJvbnRlbmRIb3N0aW5nIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGJ1Y2tldDogczMuQnVja2V0O1xuICBwdWJsaWMgcmVhZG9ubHkgZGlzdHJpYnV0aW9uOiBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IG9haTogY2xvdWRmcm9udC5PcmlnaW5BY2Nlc3NJZGVudGl0eTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRnJvbnRlbmRIb3N0aW5nUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgeyBjb25maWcsIGFwaUdhdGV3YXlVcmwsIHdlYkFjbEFybiB9ID0gcHJvcHM7XG5cbiAgICAvLyBTM+ODkOOCseODg+ODiO+8iOmdmeeahOOCpuOCp+ODluOCteOCpOODiOODm+OCueODhuOCo+ODs+OCsOeUqO+8iVxuICAgIHRoaXMuYnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRnJvbnRlbmRCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgeW91dHViZS1lZm9vdGJhbGwtZnJvbnRlbmQtJHtjb25maWcuZW52aXJvbm1lbnR9LSR7Y2RrLkF3cy5BQ0NPVU5UX0lEfWAsXG4gICAgICByZW1vdmFsUG9saWN5OiBjb25maWcuZW52aXJvbm1lbnQgPT09ICdwcm9kJyBcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXG4gICAgICAgIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiBjb25maWcuZW52aXJvbm1lbnQgIT09ICdwcm9kJyxcbiAgICAgIFxuICAgICAgLy8g44OR44OW44Oq44OD44Kv44Ki44Kv44K744K544KS44OW44Ot44OD44Kv77yIQ2xvdWRGcm9udOe1jOeUseOBp+OBruOBv+OCouOCr+OCu+OCueWPr+iDve+8iVxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIFxuICAgICAgLy8g44OQ44O844K444On44OL44Oz44Kw77yI5pys55Wq55Kw5aKD44Gu44G/77yJXG4gICAgICB2ZXJzaW9uZWQ6IGNvbmZpZy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxuICAgICAgXG4gICAgICAvLyDmmpflj7fljJZcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgIFxuICAgICAgLy8g44Op44Kk44OV44K144Kk44Kv44Or6Kit5a6aXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdEZWxldGVPbGRWZXJzaW9ucycsXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICBub25jdXJyZW50VmVyc2lvbkV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBcbiAgICAgIC8vIOOCv+OCsFxuICAgICAgdGFnczoge1xuICAgICAgICBOYW1lOiBgeW91dHViZS1lZm9vdGJhbGwtZnJvbnRlbmQtJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgICAgUHVycG9zZTogJ1N0YXRpYyB3ZWJzaXRlIGhvc3RpbmcgZm9yIGZyb250ZW5kJyxcbiAgICAgICAgRW52aXJvbm1lbnQ6IGNvbmZpZy5lbnZpcm9ubWVudCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBPcmlnaW4gQWNjZXNzIElkZW50aXR5XG4gICAgdGhpcy5vYWkgPSBuZXcgY2xvdWRmcm9udC5PcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLCAnT3JpZ2luQWNjZXNzSWRlbnRpdHknLCB7XG4gICAgICBjb21tZW50OiBgT0FJIGZvciBZb3VUdWJlIGVGb290YmFsbCBQbGF5ZXIgJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIC8vIFMz44OQ44Kx44OD44OI44Od44Oq44K344O877yIQ2xvdWRGcm9udOOBi+OCieOBruOCouOCr+OCu+OCueOBruOBv+ioseWPr++8iVxuICAgIHRoaXMuYnVja2V0LmFkZFRvUmVzb3VyY2VQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnXSxcbiAgICAgIHJlc291cmNlczogW3RoaXMuYnVja2V0LmFybkZvck9iamVjdHMoJyonKV0sXG4gICAgICBwcmluY2lwYWxzOiBbbmV3IGlhbS5DYW5vbmljYWxVc2VyUHJpbmNpcGFsKHRoaXMub2FpLmNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eVMzQ2Fub25pY2FsVXNlcklkKV0sXG4gICAgfSkpO1xuXG4gICAgLy8gQ2xvdWRGcm9udCBEaXN0cmlidXRpb25cbiAgICB0aGlzLmRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnRGlzdHJpYnV0aW9uJywge1xuICAgICAgY29tbWVudDogYFlvdVR1YmUgZUZvb3RiYWxsIFBsYXllciAke2NvbmZpZy5lbnZpcm9ubWVudH1gLFxuICAgICAgd2ViQWNsSWQ6IHdlYkFjbEFybixcbiAgICAgIFxuICAgICAgLy8g44OH44OV44Kp44Or44OI44Kq44Oq44K444Oz77yIUzPvvIlcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMuYnVja2V0LCB7XG4gICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHk6IHRoaXMub2FpLFxuICAgICAgICB9KSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0dFVF9IRUFEX09QVElPTlMsXG4gICAgICAgIGNhY2hlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICBjb21wcmVzczogdHJ1ZSxcbiAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXG4gICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5DT1JTX1MzX09SSUdJTixcbiAgICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5OiBjbG91ZGZyb250LlJlc3BvbnNlSGVhZGVyc1BvbGljeS5TRUNVUklUWV9IRUFERVJTLFxuICAgICAgfSxcbiAgICAgIFxuICAgICAgLy8g6L+95Yqg44Gu44OT44OY44Kk44OT44Ki77yIQVBJIEdhdGV3YXnvvIlcbiAgICAgIGFkZGl0aW9uYWxCZWhhdmlvcnM6IHtcbiAgICAgICAgJy9hcGkvKic6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLkh0dHBPcmlnaW4oYXBpR2F0ZXdheVVybC5yZXBsYWNlKCdodHRwczovLycsICcnKS5yZXBsYWNlKCdodHRwOi8vJywgJycpLCB7XG4gICAgICAgICAgICBwcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5PcmlnaW5Qcm90b2NvbFBvbGljeS5IVFRQU19PTkxZLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0FMTCxcbiAgICAgICAgICBjYWNoZWRNZXRob2RzOiBjbG91ZGZyb250LkNhY2hlZE1ldGhvZHMuQ0FDSEVfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgICBjb21wcmVzczogdHJ1ZSxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELCAvLyBBUEnjga/ln7rmnKznmoTjgavjgq3jg6Pjg4Pjgrfjg6XjgZfjgarjgYRcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBcbiAgICAgIC8vIOOCqOODqeODvOODmuODvOOCuOioreWumlxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIFxuICAgICAgLy8g44OH44OV44Kp44Or44OI44Or44O844OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgXG4gICAgICAvLyDkvqHmoLzjgq/jg6njgrlcbiAgICAgIHByaWNlQ2xhc3M6IGNvbmZpZy5jbG91ZGZyb250LnByaWNlQ2xhc3MgPT09ICdQcmljZUNsYXNzX0FsbCcgXG4gICAgICAgID8gY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTX0FMTFxuICAgICAgICA6IGNvbmZpZy5jbG91ZGZyb250LnByaWNlQ2xhc3MgPT09ICdQcmljZUNsYXNzXzIwMCdcbiAgICAgICAgPyBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMjAwXG4gICAgICAgIDogY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTXzEwMCxcbiAgICAgIFxuICAgICAgLy8g5Zyw55CG55qE5Yi26ZmQ77yI5b+F6KaB44Gr5b+c44GY44Gm77yJXG4gICAgICBnZW9SZXN0cmljdGlvbjogY2xvdWRmcm9udC5HZW9SZXN0cmljdGlvbi5hbGxvd2xpc3QoJ0pQJywgJ1VTJywgJ0dCJyksXG4gICAgICBcbiAgICAgIC8vIEhUVFAvMuacieWKueWMllxuICAgICAgaHR0cFZlcnNpb246IGNsb3VkZnJvbnQuSHR0cFZlcnNpb24uSFRUUDIsXG4gICAgICBcbiAgICAgIC8vIElQdjbmnInlirnljJZcbiAgICAgIGVuYWJsZUlwdjY6IHRydWUsXG4gICAgICBcbiAgICAgIC8vIOODreOCsOioreWumlxuICAgICAgZW5hYmxlTG9nZ2luZzogY29uZmlnLm1vbml0b3JpbmcuZW5hYmxlRGV0YWlsZWRNb25pdG9yaW5nLFxuICAgICAgbG9nQnVja2V0OiBjb25maWcubW9uaXRvcmluZy5lbmFibGVEZXRhaWxlZE1vbml0b3JpbmcgPyBuZXcgczMuQnVja2V0KHRoaXMsICdMb2dzQnVja2V0Jywge1xuICAgICAgICBidWNrZXROYW1lOiBgeW91dHViZS1lZm9vdGJhbGwtbG9ncy0ke2NvbmZpZy5lbnZpcm9ubWVudH0tJHtjZGsuQXdzLkFDQ09VTlRfSUR9YCxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICB9KSA6IHVuZGVmaW5lZCxcbiAgICAgIGxvZ0ZpbGVQcmVmaXg6ICdjbG91ZGZyb250LWxvZ3MvJyxcbiAgICAgIFxuICAgICAgLy8g44K/44KwXG4gICAgICB0YWdzOiB7XG4gICAgICAgIE5hbWU6IGB5b3V0dWJlLWVmb290YmFsbC1kaXN0cmlidXRpb24tJHtjb25maWcuZW52aXJvbm1lbnR9YCxcbiAgICAgICAgUHVycG9zZTogJ0NETiBmb3IgZnJvbnRlbmQgYW5kIEFQSScsXG4gICAgICAgIEVudmlyb25tZW50OiBjb25maWcuZW52aXJvbm1lbnQsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8g44OV44Ot44Oz44OI44Ko44Oz44OJ44Gu44OH44OX44Ot44KkXG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveUZyb250ZW5kJywge1xuICAgICAgc291cmNlczogW3MzZGVwbG95LlNvdXJjZS5hc3NldCgnLi4vZnJvbnRlbmQvZGlzdCcpXSxcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiB0aGlzLmJ1Y2tldCxcbiAgICAgIGRpc3RyaWJ1dGlvbjogdGhpcy5kaXN0cmlidXRpb24sXG4gICAgICBkaXN0cmlidXRpb25QYXRoczogWycvKiddLFxuICAgICAgXG4gICAgICAvLyDjgq3jg6Pjg4Pjgrfjg6XliLblvqFcbiAgICAgIGNhY2hlQ29udHJvbDogW1xuICAgICAgICBzM2RlcGxveS5DYWNoZUNvbnRyb2wuc2V0UHVibGljKCksXG4gICAgICAgIHMzZGVwbG95LkNhY2hlQ29udHJvbC5tYXhBZ2UoY2RrLkR1cmF0aW9uLmRheXMoMSkpLFxuICAgICAgXSxcbiAgICAgIFxuICAgICAgLy8g44Oh44K/44OH44O844K/XG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICAnQ2FjaGUtQ29udHJvbCc6ICdwdWJsaWMsIG1heC1hZ2U9ODY0MDAnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIENsb3VkV2F0Y2gg44Ki44Op44O844OgXG4gICAgdGhpcy5jcmVhdGVDbG91ZFdhdGNoQWxhcm1zKGNvbmZpZyk7XG5cbiAgICAvLyDlh7rliptcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRnJvbnRlbmRCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuYnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIGZyb250ZW5kIFMzIGJ1Y2tldCcsXG4gICAgICBleHBvcnROYW1lOiBgJHtjb25maWcuZW52aXJvbm1lbnR9LUZyb250ZW5kQnVja2V0TmFtZWAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERpc3RyaWJ1dGlvbklkJywge1xuICAgICAgdmFsdWU6IHRoaXMuZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxuICAgICAgZGVzY3JpcHRpb246ICdJRCBvZiB0aGUgQ2xvdWRGcm9udCBkaXN0cmlidXRpb24nLFxuICAgICAgZXhwb3J0TmFtZTogYCR7Y29uZmlnLmVudmlyb25tZW50fS1DbG91ZEZyb250RGlzdHJpYnV0aW9uSWRgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkRnJvbnREb21haW5OYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0RvbWFpbiBuYW1lIG9mIHRoZSBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbicsXG4gICAgICBleHBvcnROYW1lOiBgJHtjb25maWcuZW52aXJvbm1lbnR9LUNsb3VkRnJvbnREb21haW5OYW1lYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJzaXRlVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7dGhpcy5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdVUkwgb2YgdGhlIHdlYnNpdGUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7Y29uZmlnLmVudmlyb25tZW50fS1XZWJzaXRlVXJsYCxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQ2xvdWRXYXRjaEFsYXJtcyhjb25maWc6IEVudmlyb25tZW50Q29uZmlnKSB7XG4gICAgaWYgKCFjb25maWcubW9uaXRvcmluZy5lbmFibGVEZXRhaWxlZE1vbml0b3JpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyA0WFjjgqjjg6njg7znjofjgqLjg6njg7zjg6BcbiAgICB0aGlzLmRpc3RyaWJ1dGlvbi5tZXRyaWMoJzR4eEVycm9yUmF0ZScpLmNyZWF0ZUFsYXJtKHRoaXMsICdDbG91ZEZyb250NFhYRXJyb3JBbGFybScsIHtcbiAgICAgIHRocmVzaG9sZDogNSxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgNFhYIGVycm9yIHJhdGUgaXMgaGlnaCcsXG4gICAgfSk7XG5cbiAgICAvLyA1WFjjgqjjg6njg7znjofjgqLjg6njg7zjg6BcbiAgICB0aGlzLmRpc3RyaWJ1dGlvbi5tZXRyaWMoJzV4eEVycm9yUmF0ZScpLmNyZWF0ZUFsYXJtKHRoaXMsICdDbG91ZEZyb250NVhYRXJyb3JBbGFybScsIHtcbiAgICAgIHRocmVzaG9sZDogMSxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgNVhYIGVycm9yIHJhdGUgaXMgaGlnaCcsXG4gICAgfSk7XG5cbiAgICAvLyDjgqrjg6rjgrjjg7Pjg6zjgqTjg4bjg7PjgrfjgqLjg6njg7zjg6BcbiAgICB0aGlzLmRpc3RyaWJ1dGlvbi5tZXRyaWMoJ09yaWdpbkxhdGVuY3knKS5jcmVhdGVBbGFybSh0aGlzLCAnQ2xvdWRGcm9udE9yaWdpbkxhdGVuY3lBbGFybScsIHtcbiAgICAgIHRocmVzaG9sZDogNTAwMCwgLy8gNeenklxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBvcmlnaW4gbGF0ZW5jeSBpcyBoaWdoJyxcbiAgICB9KTtcbiAgfVxufSJdfQ==