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
const youtube_efootball_player_stack_1 = require("../lib/youtube-efootball-player-stack");
const environment_1 = require("../lib/config/environment");
const app = new cdk.App();
// 環境設定を取得
const environment = app.node.tryGetContext('environment') || 'dev';
const config = (0, environment_1.getEnvironmentConfig)(environment);
// スタックを作成
new youtube_efootball_player_stack_1.YouTubeEfootballPlayerStack(app, `YouTubeEfootballPlayer-${config.environment}`, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXFDO0FBQ3JDLGlEQUFtQztBQUNuQywwRkFBb0Y7QUFDcEYsMkRBQWlFO0FBRWpFLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLFVBQVU7QUFDVixNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUM7QUFDbkUsTUFBTSxNQUFNLEdBQUcsSUFBQSxrQ0FBb0IsRUFBQyxXQUFXLENBQUMsQ0FBQztBQUVqRCxVQUFVO0FBQ1YsSUFBSSw0REFBMkIsQ0FBQyxHQUFHLEVBQUUsMEJBQTBCLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRTtJQUNuRixHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksTUFBTSxDQUFDLE1BQU07S0FDeEQ7SUFDRCxNQUFNO0lBQ04sSUFBSSxFQUFFO1FBQ0osT0FBTyxFQUFFLHdCQUF3QjtRQUNqQyxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7UUFDL0IsU0FBUyxFQUFFLEtBQUs7S0FDakI7Q0FDRixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgWW91VHViZUVmb290YmFsbFBsYXllclN0YWNrIH0gZnJvbSAnLi4vbGliL3lvdXR1YmUtZWZvb3RiYWxsLXBsYXllci1zdGFjayc7XG5pbXBvcnQgeyBnZXRFbnZpcm9ubWVudENvbmZpZyB9IGZyb20gJy4uL2xpYi9jb25maWcvZW52aXJvbm1lbnQnO1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG4vLyDnkrDlooPoqK3lrprjgpLlj5blvpdcbmNvbnN0IGVudmlyb25tZW50ID0gYXBwLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKSB8fCAnZGV2JztcbmNvbnN0IGNvbmZpZyA9IGdldEVudmlyb25tZW50Q29uZmlnKGVudmlyb25tZW50KTtcblxuLy8g44K544K/44OD44Kv44KS5L2c5oiQXG5uZXcgWW91VHViZUVmb290YmFsbFBsYXllclN0YWNrKGFwcCwgYFlvdVR1YmVFZm9vdGJhbGxQbGF5ZXItJHtjb25maWcuZW52aXJvbm1lbnR9YCwge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8IGNvbmZpZy5yZWdpb24sXG4gIH0sXG4gIGNvbmZpZyxcbiAgdGFnczoge1xuICAgIFByb2plY3Q6ICdZb3VUdWJlRWZvb3RiYWxsUGxheWVyJyxcbiAgICBFbnZpcm9ubWVudDogY29uZmlnLmVudmlyb25tZW50LFxuICAgIE1hbmFnZWRCeTogJ0NESycsXG4gIH0sXG59KTsiXX0=