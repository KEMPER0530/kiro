#!/usr/bin/env node
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const pipeline_stack_1 = require("../lib/pipeline-stack");
const app = new cdk.App();
// 環境変数から設定を取得
const githubOwner = app.node.tryGetContext('githubOwner') || process.env.GITHUB_OWNER || 'your-github-username';
const githubRepo = app.node.tryGetContext('githubRepo') || process.env.GITHUB_REPO || 'youtube-efootball-player';
const githubBranch = app.node.tryGetContext('githubBranch') || process.env.GITHUB_BRANCH || 'main';
// パイプラインスタックの作成
new pipeline_stack_1.PipelineStack(app, 'YouTubeEfootballPipeline', {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZWxpbmUtYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGlwZWxpbmUtYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXFDO0FBQ3JDLGlEQUFtQztBQUNuQywwREFBc0Q7QUFFdEQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsY0FBYztBQUNkLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxJQUFJLHNCQUFzQixDQUFDO0FBQ2hILE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLDBCQUEwQixDQUFDO0FBQ2pILE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxJQUFJLE1BQU0sQ0FBQztBQUVuRyxnQkFBZ0I7QUFDaEIsSUFBSSw4QkFBYSxDQUFDLEdBQUcsRUFBRSwwQkFBMEIsRUFBRTtJQUNqRCxXQUFXO0lBQ1gsVUFBVTtJQUNWLFlBQVk7SUFDWixHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksZ0JBQWdCO0tBQzNEO0lBQ0QsV0FBVyxFQUFFLHlEQUF5RDtJQUN0RSxJQUFJLEVBQUU7UUFDSixPQUFPLEVBQUUsd0JBQXdCO1FBQ2pDLFdBQVcsRUFBRSxVQUFVO1FBQ3ZCLFNBQVMsRUFBRSxLQUFLO0tBQ2pCO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFBpcGVsaW5lU3RhY2sgfSBmcm9tICcuLi9saWIvcGlwZWxpbmUtc3RhY2snO1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG4vLyDnkrDlooPlpInmlbDjgYvjgonoqK3lrprjgpLlj5blvpdcbmNvbnN0IGdpdGh1Yk93bmVyID0gYXBwLm5vZGUudHJ5R2V0Q29udGV4dCgnZ2l0aHViT3duZXInKSB8fCBwcm9jZXNzLmVudi5HSVRIVUJfT1dORVIgfHwgJ3lvdXItZ2l0aHViLXVzZXJuYW1lJztcbmNvbnN0IGdpdGh1YlJlcG8gPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdnaXRodWJSZXBvJykgfHwgcHJvY2Vzcy5lbnYuR0lUSFVCX1JFUE8gfHwgJ3lvdXR1YmUtZWZvb3RiYWxsLXBsYXllcic7XG5jb25zdCBnaXRodWJCcmFuY2ggPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdnaXRodWJCcmFuY2gnKSB8fCBwcm9jZXNzLmVudi5HSVRIVUJfQlJBTkNIIHx8ICdtYWluJztcblxuLy8g44OR44Kk44OX44Op44Kk44Oz44K544K/44OD44Kv44Gu5L2c5oiQXG5uZXcgUGlwZWxpbmVTdGFjayhhcHAsICdZb3VUdWJlRWZvb3RiYWxsUGlwZWxpbmUnLCB7XG4gIGdpdGh1Yk93bmVyLFxuICBnaXRodWJSZXBvLFxuICBnaXRodWJCcmFuY2gsXG4gIGVudjoge1xuICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gICAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfHwgJ2FwLW5vcnRoZWFzdC0xJyxcbiAgfSxcbiAgZGVzY3JpcHRpb246ICdDSS9DRCBQaXBlbGluZSBmb3IgWW91VHViZSBlRm9vdGJhbGwgUGxheWVyIGFwcGxpY2F0aW9uJyxcbiAgdGFnczoge1xuICAgIFByb2plY3Q6ICdZb3VUdWJlRWZvb3RiYWxsUGxheWVyJyxcbiAgICBFbnZpcm9ubWVudDogJ3BpcGVsaW5lJyxcbiAgICBNYW5hZ2VkQnk6ICdDREsnLFxuICB9LFxufSk7XG5cbmFwcC5zeW50aCgpOyJdfQ==