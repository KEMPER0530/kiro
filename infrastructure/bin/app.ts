#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { YouTubeEfootballPlayerStack } from '../lib/youtube-efootball-player-stack';
import { getEnvironmentConfig } from '../lib/config/environment';

const app = new cdk.App();

// 環境設定を取得
const environment = app.node.tryGetContext('environment') || 'dev';
const config = getEnvironmentConfig(environment);

// スタックを作成
new YouTubeEfootballPlayerStack(app, `YouTubeEfootballPlayer-${config.environment}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || config.region,
  },
  config,
  tags: {
    Project: 'YouTubeEfootballPlayer',
    Environment: config.environment,
    ManagedBy: 'CDK',
  },
});