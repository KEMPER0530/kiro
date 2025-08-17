#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// 環境変数から設定を取得
const githubOwner = app.node.tryGetContext('githubOwner') || process.env.GITHUB_OWNER || 'your-github-username';
const githubRepo = app.node.tryGetContext('githubRepo') || process.env.GITHUB_REPO || 'youtube-efootball-player';
const githubBranch = app.node.tryGetContext('githubBranch') || process.env.GITHUB_BRANCH || 'main';

// パイプラインスタックの作成
new PipelineStack(app, 'YouTubeEfootballPipeline', {
  githubOwner,
  githubRepo,
  githubBranch,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
  },
  description: 'CI/CD Pipeline for YouTube eFootball Player application',
  tags: {
    Project: 'YouTubeEfootballPlayer',
    Environment: 'pipeline',
    ManagedBy: 'CDK',
  },
});

app.synth();