"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promotionPipeline = exports.getDeploymentConfig = void 0;
function getDeploymentConfig(environment) {
    const baseConfig = {
        strategy: 'rolling',
        rollback: {
            enabled: true,
            autoRollbackOnFailure: true,
            rollbackTimeoutMinutes: 10,
        },
        approval: {
            required: false,
            approvers: [],
            timeoutMinutes: 60,
        },
        notifications: {
            enabled: false,
            events: ['started', 'succeeded', 'failed'],
        },
        testing: {
            runUnitTests: true,
            runIntegrationTests: true,
            runE2ETests: false,
            testTimeoutMinutes: 30,
        },
        security: {
            runSecurityScan: false,
            runVulnerabilityScan: false,
            failOnHighSeverity: false,
        },
    };
    switch (environment) {
        case 'dev':
            return {
                ...baseConfig,
                strategy: 'rolling',
                testing: {
                    ...baseConfig.testing,
                    runE2ETests: true,
                    testTimeoutMinutes: 45,
                },
                notifications: {
                    ...baseConfig.notifications,
                    enabled: true,
                    events: ['failed'],
                },
            };
        case 'staging':
            return {
                ...baseConfig,
                strategy: 'blue-green',
                approval: {
                    required: true,
                    approvers: ['dev-team@company.com'],
                    timeoutMinutes: 120,
                },
                testing: {
                    ...baseConfig.testing,
                    runE2ETests: true,
                    testTimeoutMinutes: 60,
                },
                security: {
                    runSecurityScan: true,
                    runVulnerabilityScan: true,
                    failOnHighSeverity: false,
                },
                notifications: {
                    enabled: true,
                    events: ['started', 'succeeded', 'failed', 'approval-needed'],
                },
            };
        case 'prod':
            return {
                ...baseConfig,
                strategy: 'canary',
                rollback: {
                    enabled: true,
                    autoRollbackOnFailure: true,
                    rollbackTimeoutMinutes: 5,
                },
                approval: {
                    required: true,
                    approvers: ['ops-team@company.com', 'lead-dev@company.com'],
                    timeoutMinutes: 240,
                },
                testing: {
                    ...baseConfig.testing,
                    runE2ETests: true,
                    testTimeoutMinutes: 90,
                },
                security: {
                    runSecurityScan: true,
                    runVulnerabilityScan: true,
                    failOnHighSeverity: true,
                },
                notifications: {
                    enabled: true,
                    events: ['started', 'succeeded', 'failed', 'approval-needed'],
                },
            };
        default:
            return baseConfig;
    }
}
exports.getDeploymentConfig = getDeploymentConfig;
exports.promotionPipeline = [
    {
        from: 'dev',
        to: 'staging',
        requirements: {
            allTestsPassed: true,
            securityScanPassed: false,
            approvalRequired: false,
            minimumSuccessfulDeployments: 1,
        },
    },
    {
        from: 'staging',
        to: 'prod',
        requirements: {
            allTestsPassed: true,
            securityScanPassed: true,
            approvalRequired: true,
            minimumSuccessfulDeployments: 3,
        },
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95bWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlcGxveW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBNENBLFNBQWdCLG1CQUFtQixDQUFDLFdBQW1CO0lBQ3JELE1BQU0sVUFBVSxHQUFxQjtRQUNuQyxRQUFRLEVBQUUsU0FBUztRQUNuQixRQUFRLEVBQUU7WUFDUixPQUFPLEVBQUUsSUFBSTtZQUNiLHFCQUFxQixFQUFFLElBQUk7WUFDM0Isc0JBQXNCLEVBQUUsRUFBRTtTQUMzQjtRQUNELFFBQVEsRUFBRTtZQUNSLFFBQVEsRUFBRSxLQUFLO1lBQ2YsU0FBUyxFQUFFLEVBQUU7WUFDYixjQUFjLEVBQUUsRUFBRTtTQUNuQjtRQUNELGFBQWEsRUFBRTtZQUNiLE9BQU8sRUFBRSxLQUFLO1lBQ2QsTUFBTSxFQUFFLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUM7U0FDM0M7UUFDRCxPQUFPLEVBQUU7WUFDUCxZQUFZLEVBQUUsSUFBSTtZQUNsQixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLFdBQVcsRUFBRSxLQUFLO1lBQ2xCLGtCQUFrQixFQUFFLEVBQUU7U0FDdkI7UUFDRCxRQUFRLEVBQUU7WUFDUixlQUFlLEVBQUUsS0FBSztZQUN0QixvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLGtCQUFrQixFQUFFLEtBQUs7U0FDMUI7S0FDRixDQUFDO0lBRUYsUUFBUSxXQUFXLEVBQUU7UUFDbkIsS0FBSyxLQUFLO1lBQ1IsT0FBTztnQkFDTCxHQUFHLFVBQVU7Z0JBQ2IsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLE9BQU8sRUFBRTtvQkFDUCxHQUFHLFVBQVUsQ0FBQyxPQUFPO29CQUNyQixXQUFXLEVBQUUsSUFBSTtvQkFDakIsa0JBQWtCLEVBQUUsRUFBRTtpQkFDdkI7Z0JBQ0QsYUFBYSxFQUFFO29CQUNiLEdBQUcsVUFBVSxDQUFDLGFBQWE7b0JBQzNCLE9BQU8sRUFBRSxJQUFJO29CQUNiLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztpQkFDbkI7YUFDRixDQUFDO1FBRUosS0FBSyxTQUFTO1lBQ1osT0FBTztnQkFDTCxHQUFHLFVBQVU7Z0JBQ2IsUUFBUSxFQUFFLFlBQVk7Z0JBQ3RCLFFBQVEsRUFBRTtvQkFDUixRQUFRLEVBQUUsSUFBSTtvQkFDZCxTQUFTLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQztvQkFDbkMsY0FBYyxFQUFFLEdBQUc7aUJBQ3BCO2dCQUNELE9BQU8sRUFBRTtvQkFDUCxHQUFHLFVBQVUsQ0FBQyxPQUFPO29CQUNyQixXQUFXLEVBQUUsSUFBSTtvQkFDakIsa0JBQWtCLEVBQUUsRUFBRTtpQkFDdkI7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLGVBQWUsRUFBRSxJQUFJO29CQUNyQixvQkFBb0IsRUFBRSxJQUFJO29CQUMxQixrQkFBa0IsRUFBRSxLQUFLO2lCQUMxQjtnQkFDRCxhQUFhLEVBQUU7b0JBQ2IsT0FBTyxFQUFFLElBQUk7b0JBQ2IsTUFBTSxFQUFFLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsaUJBQWlCLENBQUM7aUJBQzlEO2FBQ0YsQ0FBQztRQUVKLEtBQUssTUFBTTtZQUNULE9BQU87Z0JBQ0wsR0FBRyxVQUFVO2dCQUNiLFFBQVEsRUFBRSxRQUFRO2dCQUNsQixRQUFRLEVBQUU7b0JBQ1IsT0FBTyxFQUFFLElBQUk7b0JBQ2IscUJBQXFCLEVBQUUsSUFBSTtvQkFDM0Isc0JBQXNCLEVBQUUsQ0FBQztpQkFDMUI7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLFFBQVEsRUFBRSxJQUFJO29CQUNkLFNBQVMsRUFBRSxDQUFDLHNCQUFzQixFQUFFLHNCQUFzQixDQUFDO29CQUMzRCxjQUFjLEVBQUUsR0FBRztpQkFDcEI7Z0JBQ0QsT0FBTyxFQUFFO29CQUNQLEdBQUcsVUFBVSxDQUFDLE9BQU87b0JBQ3JCLFdBQVcsRUFBRSxJQUFJO29CQUNqQixrQkFBa0IsRUFBRSxFQUFFO2lCQUN2QjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsZUFBZSxFQUFFLElBQUk7b0JBQ3JCLG9CQUFvQixFQUFFLElBQUk7b0JBQzFCLGtCQUFrQixFQUFFLElBQUk7aUJBQ3pCO2dCQUNELGFBQWEsRUFBRTtvQkFDYixPQUFPLEVBQUUsSUFBSTtvQkFDYixNQUFNLEVBQUUsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQztpQkFDOUQ7YUFDRixDQUFDO1FBRUo7WUFDRSxPQUFPLFVBQVUsQ0FBQztLQUNyQjtBQUNILENBQUM7QUF6R0Qsa0RBeUdDO0FBYVksUUFBQSxpQkFBaUIsR0FBMkI7SUFDdkQ7UUFDRSxJQUFJLEVBQUUsS0FBSztRQUNYLEVBQUUsRUFBRSxTQUFTO1FBQ2IsWUFBWSxFQUFFO1lBQ1osY0FBYyxFQUFFLElBQUk7WUFDcEIsa0JBQWtCLEVBQUUsS0FBSztZQUN6QixnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLDRCQUE0QixFQUFFLENBQUM7U0FDaEM7S0FDRjtJQUNEO1FBQ0UsSUFBSSxFQUFFLFNBQVM7UUFDZixFQUFFLEVBQUUsTUFBTTtRQUNWLFlBQVksRUFBRTtZQUNaLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLGtCQUFrQixFQUFFLElBQUk7WUFDeEIsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0Qiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDO0tBQ0Y7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRW52aXJvbm1lbnRDb25maWcgfSBmcm9tICcuL2Vudmlyb25tZW50JztcblxuZXhwb3J0IGludGVyZmFjZSBEZXBsb3ltZW50Q29uZmlnIHtcbiAgLy8g44OH44OX44Ot44Kk44Oh44Oz44OI5oim55WlXG4gIHN0cmF0ZWd5OiAnYmx1ZS1ncmVlbicgfCAncm9sbGluZycgfCAnY2FuYXJ5JztcbiAgXG4gIC8vIOODreODvOODq+ODkOODg+OCr+ioreWumlxuICByb2xsYmFjazoge1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47XG4gICAgYXV0b1JvbGxiYWNrT25GYWlsdXJlOiBib29sZWFuO1xuICAgIHJvbGxiYWNrVGltZW91dE1pbnV0ZXM6IG51bWJlcjtcbiAgfTtcbiAgXG4gIC8vIOaJv+iqjeioreWumlxuICBhcHByb3ZhbDoge1xuICAgIHJlcXVpcmVkOiBib29sZWFuO1xuICAgIGFwcHJvdmVyczogc3RyaW5nW107XG4gICAgdGltZW91dE1pbnV0ZXM6IG51bWJlcjtcbiAgfTtcbiAgXG4gIC8vIOmAmuefpeioreWumlxuICBub3RpZmljYXRpb25zOiB7XG4gICAgZW5hYmxlZDogYm9vbGVhbjtcbiAgICBzbGFja1dlYmhvb2s/OiBzdHJpbmc7XG4gICAgZW1haWxUb3BpY0Fybj86IHN0cmluZztcbiAgICBldmVudHM6ICgnc3RhcnRlZCcgfCAnc3VjY2VlZGVkJyB8ICdmYWlsZWQnIHwgJ2FwcHJvdmFsLW5lZWRlZCcpW107XG4gIH07XG4gIFxuICAvLyDjg4bjgrnjg4joqK3lrppcbiAgdGVzdGluZzoge1xuICAgIHJ1blVuaXRUZXN0czogYm9vbGVhbjtcbiAgICBydW5JbnRlZ3JhdGlvblRlc3RzOiBib29sZWFuO1xuICAgIHJ1bkUyRVRlc3RzOiBib29sZWFuO1xuICAgIHRlc3RUaW1lb3V0TWludXRlczogbnVtYmVyO1xuICB9O1xuICBcbiAgLy8g44K744Kt44Ol44Oq44OG44Kj44K544Kt44Oj44OzXG4gIHNlY3VyaXR5OiB7XG4gICAgcnVuU2VjdXJpdHlTY2FuOiBib29sZWFuO1xuICAgIHJ1blZ1bG5lcmFiaWxpdHlTY2FuOiBib29sZWFuO1xuICAgIGZhaWxPbkhpZ2hTZXZlcml0eTogYm9vbGVhbjtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlcGxveW1lbnRDb25maWcoZW52aXJvbm1lbnQ6IHN0cmluZyk6IERlcGxveW1lbnRDb25maWcge1xuICBjb25zdCBiYXNlQ29uZmlnOiBEZXBsb3ltZW50Q29uZmlnID0ge1xuICAgIHN0cmF0ZWd5OiAncm9sbGluZycsXG4gICAgcm9sbGJhY2s6IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICBhdXRvUm9sbGJhY2tPbkZhaWx1cmU6IHRydWUsXG4gICAgICByb2xsYmFja1RpbWVvdXRNaW51dGVzOiAxMCxcbiAgICB9LFxuICAgIGFwcHJvdmFsOiB7XG4gICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICBhcHByb3ZlcnM6IFtdLFxuICAgICAgdGltZW91dE1pbnV0ZXM6IDYwLFxuICAgIH0sXG4gICAgbm90aWZpY2F0aW9uczoge1xuICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICBldmVudHM6IFsnc3RhcnRlZCcsICdzdWNjZWVkZWQnLCAnZmFpbGVkJ10sXG4gICAgfSxcbiAgICB0ZXN0aW5nOiB7XG4gICAgICBydW5Vbml0VGVzdHM6IHRydWUsXG4gICAgICBydW5JbnRlZ3JhdGlvblRlc3RzOiB0cnVlLFxuICAgICAgcnVuRTJFVGVzdHM6IGZhbHNlLFxuICAgICAgdGVzdFRpbWVvdXRNaW51dGVzOiAzMCxcbiAgICB9LFxuICAgIHNlY3VyaXR5OiB7XG4gICAgICBydW5TZWN1cml0eVNjYW46IGZhbHNlLFxuICAgICAgcnVuVnVsbmVyYWJpbGl0eVNjYW46IGZhbHNlLFxuICAgICAgZmFpbE9uSGlnaFNldmVyaXR5OiBmYWxzZSxcbiAgICB9LFxuICB9O1xuXG4gIHN3aXRjaCAoZW52aXJvbm1lbnQpIHtcbiAgICBjYXNlICdkZXYnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4uYmFzZUNvbmZpZyxcbiAgICAgICAgc3RyYXRlZ3k6ICdyb2xsaW5nJyxcbiAgICAgICAgdGVzdGluZzoge1xuICAgICAgICAgIC4uLmJhc2VDb25maWcudGVzdGluZyxcbiAgICAgICAgICBydW5FMkVUZXN0czogdHJ1ZSxcbiAgICAgICAgICB0ZXN0VGltZW91dE1pbnV0ZXM6IDQ1LFxuICAgICAgICB9LFxuICAgICAgICBub3RpZmljYXRpb25zOiB7XG4gICAgICAgICAgLi4uYmFzZUNvbmZpZy5ub3RpZmljYXRpb25zLFxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgZXZlbnRzOiBbJ2ZhaWxlZCddLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgIGNhc2UgJ3N0YWdpbmcnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4uYmFzZUNvbmZpZyxcbiAgICAgICAgc3RyYXRlZ3k6ICdibHVlLWdyZWVuJyxcbiAgICAgICAgYXBwcm92YWw6IHtcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICBhcHByb3ZlcnM6IFsnZGV2LXRlYW1AY29tcGFueS5jb20nXSxcbiAgICAgICAgICB0aW1lb3V0TWludXRlczogMTIwLFxuICAgICAgICB9LFxuICAgICAgICB0ZXN0aW5nOiB7XG4gICAgICAgICAgLi4uYmFzZUNvbmZpZy50ZXN0aW5nLFxuICAgICAgICAgIHJ1bkUyRVRlc3RzOiB0cnVlLFxuICAgICAgICAgIHRlc3RUaW1lb3V0TWludXRlczogNjAsXG4gICAgICAgIH0sXG4gICAgICAgIHNlY3VyaXR5OiB7XG4gICAgICAgICAgcnVuU2VjdXJpdHlTY2FuOiB0cnVlLFxuICAgICAgICAgIHJ1blZ1bG5lcmFiaWxpdHlTY2FuOiB0cnVlLFxuICAgICAgICAgIGZhaWxPbkhpZ2hTZXZlcml0eTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIG5vdGlmaWNhdGlvbnM6IHtcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgIGV2ZW50czogWydzdGFydGVkJywgJ3N1Y2NlZWRlZCcsICdmYWlsZWQnLCAnYXBwcm92YWwtbmVlZGVkJ10sXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgY2FzZSAncHJvZCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5iYXNlQ29uZmlnLFxuICAgICAgICBzdHJhdGVneTogJ2NhbmFyeScsXG4gICAgICAgIHJvbGxiYWNrOiB7XG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICBhdXRvUm9sbGJhY2tPbkZhaWx1cmU6IHRydWUsXG4gICAgICAgICAgcm9sbGJhY2tUaW1lb3V0TWludXRlczogNSxcbiAgICAgICAgfSxcbiAgICAgICAgYXBwcm92YWw6IHtcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICBhcHByb3ZlcnM6IFsnb3BzLXRlYW1AY29tcGFueS5jb20nLCAnbGVhZC1kZXZAY29tcGFueS5jb20nXSxcbiAgICAgICAgICB0aW1lb3V0TWludXRlczogMjQwLFxuICAgICAgICB9LFxuICAgICAgICB0ZXN0aW5nOiB7XG4gICAgICAgICAgLi4uYmFzZUNvbmZpZy50ZXN0aW5nLFxuICAgICAgICAgIHJ1bkUyRVRlc3RzOiB0cnVlLFxuICAgICAgICAgIHRlc3RUaW1lb3V0TWludXRlczogOTAsXG4gICAgICAgIH0sXG4gICAgICAgIHNlY3VyaXR5OiB7XG4gICAgICAgICAgcnVuU2VjdXJpdHlTY2FuOiB0cnVlLFxuICAgICAgICAgIHJ1blZ1bG5lcmFiaWxpdHlTY2FuOiB0cnVlLFxuICAgICAgICAgIGZhaWxPbkhpZ2hTZXZlcml0eTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgbm90aWZpY2F0aW9uczoge1xuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgZXZlbnRzOiBbJ3N0YXJ0ZWQnLCAnc3VjY2VlZGVkJywgJ2ZhaWxlZCcsICdhcHByb3ZhbC1uZWVkZWQnXSxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGJhc2VDb25maWc7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBFbnZpcm9ubWVudFByb21vdGlvbiB7XG4gIGZyb206IHN0cmluZztcbiAgdG86IHN0cmluZztcbiAgcmVxdWlyZW1lbnRzOiB7XG4gICAgYWxsVGVzdHNQYXNzZWQ6IGJvb2xlYW47XG4gICAgc2VjdXJpdHlTY2FuUGFzc2VkOiBib29sZWFuO1xuICAgIGFwcHJvdmFsUmVxdWlyZWQ6IGJvb2xlYW47XG4gICAgbWluaW11bVN1Y2Nlc3NmdWxEZXBsb3ltZW50czogbnVtYmVyO1xuICB9O1xufVxuXG5leHBvcnQgY29uc3QgcHJvbW90aW9uUGlwZWxpbmU6IEVudmlyb25tZW50UHJvbW90aW9uW10gPSBbXG4gIHtcbiAgICBmcm9tOiAnZGV2JyxcbiAgICB0bzogJ3N0YWdpbmcnLFxuICAgIHJlcXVpcmVtZW50czoge1xuICAgICAgYWxsVGVzdHNQYXNzZWQ6IHRydWUsXG4gICAgICBzZWN1cml0eVNjYW5QYXNzZWQ6IGZhbHNlLFxuICAgICAgYXBwcm92YWxSZXF1aXJlZDogZmFsc2UsXG4gICAgICBtaW5pbXVtU3VjY2Vzc2Z1bERlcGxveW1lbnRzOiAxLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBmcm9tOiAnc3RhZ2luZycsXG4gICAgdG86ICdwcm9kJyxcbiAgICByZXF1aXJlbWVudHM6IHtcbiAgICAgIGFsbFRlc3RzUGFzc2VkOiB0cnVlLFxuICAgICAgc2VjdXJpdHlTY2FuUGFzc2VkOiB0cnVlLFxuICAgICAgYXBwcm92YWxSZXF1aXJlZDogdHJ1ZSxcbiAgICAgIG1pbmltdW1TdWNjZXNzZnVsRGVwbG95bWVudHM6IDMsXG4gICAgfSxcbiAgfSxcbl07Il19