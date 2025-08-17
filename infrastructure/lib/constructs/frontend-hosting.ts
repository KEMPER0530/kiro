import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface FrontendHostingProps {
  config: EnvironmentConfig;
  apiGatewayUrl: string;
  webAclArn?: string;
}

export class FrontendHosting extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly oai: cloudfront.OriginAccessIdentity;

  constructor(scope: Construct, id: string, props: FrontendHostingProps) {
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
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // APIは基本的にキャッシュしない
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

  private createCloudWatchAlarms(config: EnvironmentConfig) {
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
      threshold: 5000, // 5秒
      evaluationPeriods: 2,
      alarmDescription: 'CloudFront origin latency is high',
    });
  }
}