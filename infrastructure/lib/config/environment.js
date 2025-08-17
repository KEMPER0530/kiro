"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvironmentConfig = void 0;
const baseConfig = {
    region: 'ap-northeast-1',
    dynamodb: {
        favoritesTableName: 'efootball-favorites',
        searchHistoryTableName: 'efootball-search-history',
        billingMode: 'PAY_PER_REQUEST',
        pointInTimeRecovery: true,
    },
    lambda: {
        memorySize: 1024,
        timeout: 30,
        environment: {
            NODE_ENV: 'production',
            LOG_LEVEL: 'info',
        },
    },
    apiGateway: {
        throttling: {
            rateLimit: 1000,
            burstLimit: 2000,
        },
        cors: {
            allowOrigins: ['*'],
            allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
        },
    },
    cloudfront: {
        priceClass: 'PriceClass_100',
        cacheBehaviors: {
            defaultTtl: 86400,
            maxTtl: 31536000,
            minTtl: 0,
        },
    },
    elasticache: {
        nodeType: 'cache.t3.micro',
        numCacheNodes: 1,
        engineVersion: '7.0',
    },
    security: {
        enableWaf: false,
        enableCloudTrail: false,
        enableGuardDuty: false,
    },
    monitoring: {
        enableXRay: true,
        logRetentionDays: 14,
        enableDetailedMonitoring: false,
    },
};
const environments = {
    dev: {
        ...baseConfig,
        environment: 'dev',
        dynamodb: {
            ...baseConfig.dynamodb,
            favoritesTableName: 'efootball-favorites-dev',
            searchHistoryTableName: 'efootball-search-history-dev',
            pointInTimeRecovery: false,
        },
        lambda: {
            ...baseConfig.lambda,
            memorySize: 512,
            environment: {
                ...baseConfig.lambda.environment,
                NODE_ENV: 'development',
                LOG_LEVEL: 'debug',
            },
        },
        apiGateway: {
            ...baseConfig.apiGateway,
            throttling: {
                rateLimit: 100,
                burstLimit: 200,
            },
        },
        monitoring: {
            ...baseConfig.monitoring,
            logRetentionDays: 7,
        },
    },
    prod: {
        ...baseConfig,
        environment: 'prod',
        dynamodb: {
            ...baseConfig.dynamodb,
            favoritesTableName: 'efootball-favorites-prod',
            searchHistoryTableName: 'efootball-search-history-prod',
        },
        lambda: {
            ...baseConfig.lambda,
            memorySize: 2048,
            reservedConcurrency: 100,
        },
        apiGateway: {
            ...baseConfig.apiGateway,
            throttling: {
                rateLimit: 5000,
                burstLimit: 10000,
            },
            cors: {
                ...baseConfig.apiGateway.cors,
                allowOrigins: ['https://yourdomain.com'], // 本番環境では具体的なドメインを指定
            },
        },
        cloudfront: {
            ...baseConfig.cloudfront,
            priceClass: 'PriceClass_All',
        },
        elasticache: {
            ...baseConfig.elasticache,
            nodeType: 'cache.r6g.large',
            numCacheNodes: 2,
        },
        security: {
            enableWaf: true,
            enableCloudTrail: true,
            enableGuardDuty: true,
        },
        monitoring: {
            ...baseConfig.monitoring,
            logRetentionDays: 30,
            enableDetailedMonitoring: true,
        },
    },
};
function getEnvironmentConfig(environment) {
    const config = environments[environment];
    if (!config) {
        throw new Error(`Unknown environment: ${environment}. Available environments: ${Object.keys(environments).join(', ')}`);
    }
    return config;
}
exports.getEnvironmentConfig = getEnvironmentConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlbnZpcm9ubWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFpRUEsTUFBTSxVQUFVLEdBQTJDO0lBQ3pELE1BQU0sRUFBRSxnQkFBZ0I7SUFFeEIsUUFBUSxFQUFFO1FBQ1Isa0JBQWtCLEVBQUUscUJBQXFCO1FBQ3pDLHNCQUFzQixFQUFFLDBCQUEwQjtRQUNsRCxXQUFXLEVBQUUsaUJBQWlCO1FBQzlCLG1CQUFtQixFQUFFLElBQUk7S0FDMUI7SUFFRCxNQUFNLEVBQUU7UUFDTixVQUFVLEVBQUUsSUFBSTtRQUNoQixPQUFPLEVBQUUsRUFBRTtRQUNYLFdBQVcsRUFBRTtZQUNYLFFBQVEsRUFBRSxZQUFZO1lBQ3RCLFNBQVMsRUFBRSxNQUFNO1NBQ2xCO0tBQ0Y7SUFFRCxVQUFVLEVBQUU7UUFDVixVQUFVLEVBQUU7WUFDVixTQUFTLEVBQUUsSUFBSTtZQUNmLFVBQVUsRUFBRSxJQUFJO1NBQ2pCO1FBQ0QsSUFBSSxFQUFFO1lBQ0osWUFBWSxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ25CLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7WUFDekQsWUFBWSxFQUFFLENBQUMsY0FBYyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLHNCQUFzQixDQUFDO1NBQ25HO0tBQ0Y7SUFFRCxVQUFVLEVBQUU7UUFDVixVQUFVLEVBQUUsZ0JBQWdCO1FBQzVCLGNBQWMsRUFBRTtZQUNkLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLE1BQU0sRUFBRSxRQUFRO1lBQ2hCLE1BQU0sRUFBRSxDQUFDO1NBQ1Y7S0FDRjtJQUVELFdBQVcsRUFBRTtRQUNYLFFBQVEsRUFBRSxnQkFBZ0I7UUFDMUIsYUFBYSxFQUFFLENBQUM7UUFDaEIsYUFBYSxFQUFFLEtBQUs7S0FDckI7SUFFRCxRQUFRLEVBQUU7UUFDUixT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ZSBFbnZpcm9ubWVudENvbmZpZyB7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIHJlZ2lvbjogc3RyaW5nO1xuICBcbiAgLy8gRHluYW1vRELoqK3lrppcbiAgZHluYW1vZGI6IHtcbiAgICBmYXZvcml0ZXNUYWJsZU5hbWU6IHN0cmluZztcbiAgICBzZWFyY2hIaXN0b3J5VGFibGVOYW1lOiBzdHJpbmc7XG4gICAgYmlsbGluZ01vZGU6ICdQQVlfUEVSX1JFUVVFU1QnIHwgJ1BST1ZJU0lPTkVEJztcbiAgICBwb2ludEluVGltZVJlY292ZXJ5OiBib29sZWFuO1xuICB9O1xuICBcbiAgLy8gTGFtYmRh6Kit5a6aXG4gIGxhbWJkYToge1xuICAgIG1lbW9yeVNpemU6IG51bWJlcjtcbiAgICB0aW1lb3V0OiBudW1iZXI7XG4gICAgcmVzZXJ2ZWRDb25jdXJyZW5jeT86IG51bWJlcjtcbiAgICBlbnZpcm9ubWVudDogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgfTtcbiAgXG4gIC8vIEFQSSBHYXRld2F56Kit5a6aXG4gIGFwaUdhdGV3YXk6IHtcbiAgICB0aHJvdHRsaW5nOiB7XG4gICAgICByYXRlTGltaXQ6IG51bWJlcjtcbiAgICAgIGJ1cnN0TGltaXQ6IG51bWJlcjtcbiAgICB9O1xuICAgIGNvcnM6IHtcbiAgICAgIGFsbG93T3JpZ2luczogc3RyaW5nW107XG4gICAgICBhbGxvd01ldGhvZHM6IHN0cmluZ1tdO1xuICAgICAgYWxsb3dIZWFkZXJzOiBzdHJpbmdbXTtcbiAgICB9O1xuICB9O1xuICBcbiAgLy8gQ2xvdWRGcm9udOioreWumlxuICBjbG91ZGZyb250OiB7XG4gICAgcHJpY2VDbGFzczogc3RyaW5nO1xuICAgIGNhY2hlQmVoYXZpb3JzOiB7XG4gICAgICBkZWZhdWx0VHRsOiBudW1iZXI7XG4gICAgICBtYXhUdGw6IG51bWJlcjtcbiAgICAgIG1pblR0bDogbnVtYmVyO1xuICAgIH07XG4gIH07XG4gIFxuICAvLyBFbGFzdGlDYWNoZeioreWumlxuICBlbGFzdGljYWNoZToge1xuICAgIG5vZGVUeXBlOiBzdHJpbmc7XG4gICAgbnVtQ2FjaGVOb2RlczogbnVtYmVyO1xuICAgIGVuZ2luZVZlcnNpb246IHN0cmluZztcbiAgfTtcbiAgXG4gIC8vIOOCu+OCreODpeODquODhuOCo+ioreWumlxuICBzZWN1cml0eToge1xuICAgIGVuYWJsZVdhZjogYm9vbGVhbjtcbiAgICBlbmFibGVDbG91ZFRyYWlsOiBib29sZWFuO1xuICAgIGVuYWJsZUd1YXJkRHV0eTogYm9vbGVhbjtcbiAgfTtcbiAgXG4gIC8vIOODouODi+OCv+ODquODs+OCsOioreWumlxuICBtb25pdG9yaW5nOiB7XG4gICAgZW5hYmxlWFJheTogYm9vbGVhbjtcbiAgICBsb2dSZXRlbnRpb25EYXlzOiBudW1iZXI7XG4gICAgZW5hYmxlRGV0YWlsZWRNb25pdG9yaW5nOiBib29sZWFuO1xuICB9O1xufVxuXG5jb25zdCBiYXNlQ29uZmlnOiBPbWl0PEVudmlyb25tZW50Q29uZmlnLCAnZW52aXJvbm1lbnQnPiA9IHtcbiAgcmVnaW9uOiAnYXAtbm9ydGhlYXN0LTEnLFxuICBcbiAgZHluYW1vZGI6IHtcbiAgICBmYXZvcml0ZXNUYWJsZU5hbWU6ICdlZm9vdGJhbGwtZmF2b3JpdGVzJyxcbiAgICBzZWFyY2hIaXN0b3J5VGFibGVOYW1lOiAnZWZvb3RiYWxsLXNlYXJjaC1oaXN0b3J5JyxcbiAgICBiaWxsaW5nTW9kZTogJ1BBWV9QRVJfUkVRVUVTVCcsXG4gICAgcG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSxcbiAgfSxcbiAgXG4gIGxhbWJkYToge1xuICAgIG1lbW9yeVNpemU6IDEwMjQsXG4gICAgdGltZW91dDogMzAsXG4gICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gICAgICBMT0dfTEVWRUw6ICdpbmZvJyxcbiAgICB9LFxuICB9LFxuICBcbiAgYXBpR2F0ZXdheToge1xuICAgIHRocm90dGxpbmc6IHtcbiAgICAgIHJhdGVMaW1pdDogMTAwMCxcbiAgICAgIGJ1cnN0TGltaXQ6IDIwMDAsXG4gICAgfSxcbiAgICBjb3JzOiB7XG4gICAgICBhbGxvd09yaWdpbnM6IFsnKiddLFxuICAgICAgYWxsb3dNZXRob2RzOiBbJ0dFVCcsICdQT1NUJywgJ1BVVCcsICdERUxFVEUnLCAnT1BUSU9OUyddLFxuICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdYLUFtei1EYXRlJywgJ0F1dGhvcml6YXRpb24nLCAnWC1BcGktS2V5JywgJ1gtQW16LVNlY3VyaXR5LVRva2VuJ10sXG4gICAgfSxcbiAgfSxcbiAgXG4gIGNsb3VkZnJvbnQ6IHtcbiAgICBwcmljZUNsYXNzOiAnUHJpY2VDbGFzc18xMDAnLFxuICAgIGNhY2hlQmVoYXZpb3JzOiB7XG4gICAgICBkZWZhdWx0VHRsOiA4NjQwMCwgLy8gMeaXpVxuICAgICAgbWF4VHRsOiAzMTUzNjAwMCwgLy8gMeW5tFxuICAgICAgbWluVHRsOiAwLFxuICAgIH0sXG4gIH0sXG4gIFxuICBlbGFzdGljYWNoZToge1xuICAgIG5vZGVUeXBlOiAnY2FjaGUudDMubWljcm8nLFxuICAgIG51bUNhY2hlTm9kZXM6IDEsXG4gICAgZW5naW5lVmVyc2lvbjogJzcuMCcsXG4gIH0sXG4gIFxuICBzZWN1cml0eToge1xuICAgIGVuYWJsZVdhZjogZmFsc2UsXG4gICAgZW5hYmxlQ2xvdWRUcmFpbDogZmFsc2UsXG4gICAgZW5hYmxlR3VhcmREdXR5OiBmYWxzZSxcbiAgfSxcbiAgXG4gIG1vbml0b3Jpbmc6IHtcbiAgICBlbmFibGVYUmF5OiB0cnVlLFxuICAgIGxvZ1JldGVudGlvbkRheXM6IDE0LFxuICAgIGVuYWJsZURldGFpbGVkTW9uaXRvcmluZzogZmFsc2UsXG4gIH0sXG59O1xuXG5jb25zdCBlbnZpcm9ubWVudHM6IFJlY29yZDxzdHJpbmcsIEVudmlyb25tZW50Q29uZmlnPiA9IHtcbiAgZGV2OiB7XG4gICAgLi4uYmFzZUNvbmZpZyxcbiAgICBlbnZpcm9ubWVudDogJ2RldicsXG4gICAgXG4gICAgZHluYW1vZGI6IHtcbiAgICAgIC4uLmJhc2VDb25maWcuZHluYW1vZGIsXG4gICAgICBmYXZvcml0ZXNUYWJsZU5hbWU6ICdlZm9vdGJhbGwtZmF2b3JpdGVzLWRldicsXG4gICAgICBzZWFyY2hIaXN0b3J5VGFibGVOYW1lOiAnZWZvb3RiYWxsLXNlYXJjaC1oaXN0b3J5LWRldicsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiBmYWxzZSxcbiAgICB9LFxuICAgIFxuICAgIGxhbWJkYToge1xuICAgICAgLi4uYmFzZUNvbmZpZy5sYW1iZGEsXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAuLi5iYXNlQ29uZmlnLmxhbWJkYS5lbnZpcm9ubWVudCxcbiAgICAgICAgTk9ERV9FTlY6ICdkZXZlbG9wbWVudCcsXG4gICAgICAgIExPR19MRVZFTDogJ2RlYnVnJyxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBcbiAgICBhcGlHYXRld2F5OiB7XG4gICAgICAuLi5iYXNlQ29uZmlnLmFwaUdhdGV3YXksXG4gICAgICB0aHJvdHRsaW5nOiB7XG4gICAgICAgIHJhdGVMaW1pdDogMTAwLFxuICAgICAgICBidXJzdExpbWl0OiAyMDAsXG4gICAgICB9LFxuICAgIH0sXG4gICAgXG4gICAgbW9uaXRvcmluZzoge1xuICAgICAgLi4uYmFzZUNvbmZpZy5tb25pdG9yaW5nLFxuICAgICAgbG9nUmV0ZW50aW9uRGF5czogNyxcbiAgICB9LFxuICB9LFxuICBcbiAgcHJvZDoge1xuICAgIC4uLmJhc2VDb25maWcsXG4gICAgZW52aXJvbm1lbnQ6ICdwcm9kJyxcbiAgICBcbiAgICBkeW5hbW9kYjoge1xuICAgICAgLi4uYmFzZUNvbmZpZy5keW5hbW9kYixcbiAgICAgIGZhdm9yaXRlc1RhYmxlTmFtZTogJ2Vmb290YmFsbC1mYXZvcml0ZXMtcHJvZCcsXG4gICAgICBzZWFyY2hIaXN0b3J5VGFibGVOYW1lOiAnZWZvb3RiYWxsLXNlYXJjaC1oaXN0b3J5LXByb2QnLFxuICAgIH0sXG4gICAgXG4gICAgbGFtYmRhOiB7XG4gICAgICAuLi5iYXNlQ29uZmlnLmxhbWJkYSxcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsXG4gICAgICByZXNlcnZlZENvbmN1cnJlbmN5OiAxMDAsXG4gICAgfSxcbiAgICBcbiAgICBhcGlHYXRld2F5OiB7XG4gICAgICAuLi5iYXNlQ29uZmlnLmFwaUdhdGV3YXksXG4gICAgICB0aHJvdHRsaW5nOiB7XG4gICAgICAgIHJhdGVMaW1pdDogNTAwMCxcbiAgICAgICAgYnVyc3RMaW1pdDogMTAwMDAsXG4gICAgICB9LFxuICAgICAgY29yczoge1xuICAgICAgICAuLi5iYXNlQ29uZmlnLmFwaUdhdGV3YXkuY29ycyxcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbJ2h0dHBzOi8veW91cmRvbWFpbi5jb20nXSwgLy8g5pys55Wq55Kw5aKD44Gn44Gv5YW35L2T55qE44Gq44OJ44Oh44Kk44Oz44KS5oyH5a6aXG4gICAgICB9LFxuICAgIH0sXG4gICAgXG4gICAgY2xvdWRmcm9udDoge1xuICAgICAgLi4uYmFzZUNvbmZpZy5jbG91ZGZyb250LFxuICAgICAgcHJpY2VDbGFzczogJ1ByaWNlQ2xhc3NfQWxsJyxcbiAgICB9LFxuICAgIFxuICAgIGVsYXN0aWNhY2hlOiB7XG4gICAgICAuLi5iYXNlQ29uZmlnLmVsYXN0aWNhY2hlLFxuICAgICAgbm9kZVR5cGU6ICdjYWNoZS5yNmcubGFyZ2UnLFxuICAgICAgbnVtQ2FjaGVOb2RlczogMixcbiAgICB9LFxuICAgIFxuICAgIHNlY3VyaXR5OiB7XG4gICAgICBlbmFibGVXYWY6IHRydWUsXG4gICAgICBlbmFibGVDbG91ZFRyYWlsOiB0cnVlLFxuICAgICAgZW5hYmxlR3VhcmREdXR5OiB0cnVlLFxuICAgIH0sXG4gICAgXG4gICAgbW9uaXRvcmluZzoge1xuICAgICAgLi4uYmFzZUNvbmZpZy5tb25pdG9yaW5nLFxuICAgICAgbG9nUmV0ZW50aW9uRGF5czogMzAsXG4gICAgICBlbmFibGVEZXRhaWxlZE1vbml0b3Jpbmc6IHRydWUsXG4gICAgfSxcbiAgfSxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZpcm9ubWVudENvbmZpZyhlbnZpcm9ubWVudDogc3RyaW5nKTogRW52aXJvbm1lbnRDb25maWcge1xuICBjb25zdCBjb25maWcgPSBlbnZpcm9ubWVudHNbZW52aXJvbm1lbnRdO1xuICBpZiAoIWNvbmZpZykge1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBlbnZpcm9ubWVudDogJHtlbnZpcm9ubWVudH0uIEF2YWlsYWJsZSBlbnZpcm9ubWVudHM6ICR7T2JqZWN0LmtleXMoZW52aXJvbm1lbnRzKS5qb2luKCcsICcpfWApO1xuICB9XG4gIHJldHVybiBjb25maWc7XG59Il19