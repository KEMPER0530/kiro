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
exports.WafConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const wafv2 = __importStar(require("aws-cdk-lib/aws-wafv2"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const constructs_1 = require("constructs");
class WafConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create CloudWatch Log Group for WAF logs
        this.logGroup = new logs.LogGroup(this, 'WafLogGroup', {
            logGroupName: `/aws/wafv2/${props.environment}-youtube-efootball-player`,
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        // Create WAF Web ACL
        this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
            scope: props.scope,
            defaultAction: { allow: {} },
            name: `${props.environment}-youtube-efootball-player-waf`,
            description: 'WAF for YouTube eFootball Player application',
            rules: [
                // Rate limiting rule
                {
                    name: 'RateLimitRule',
                    priority: 1,
                    statement: {
                        rateBasedStatement: {
                            limit: 2000,
                            aggregateKeyType: 'IP'
                        }
                    },
                    action: { block: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'RateLimitRule'
                    }
                },
                // AWS Managed Rules - Core Rule Set
                {
                    name: 'AWSManagedRulesCommonRuleSet',
                    priority: 2,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesCommonRuleSet',
                            excludedRules: [
                                // Exclude rules that might interfere with legitimate requests
                                { name: 'SizeRestrictions_BODY' },
                                { name: 'GenericRFI_BODY' }
                            ]
                        }
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWSManagedRulesCommonRuleSetMetric'
                    }
                },
                // AWS Managed Rules - Known Bad Inputs
                {
                    name: 'AWSManagedRulesKnownBadInputsRuleSet',
                    priority: 3,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesKnownBadInputsRuleSet'
                        }
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWSManagedRulesKnownBadInputsRuleSetMetric'
                    }
                },
                // AWS Managed Rules - SQL Injection
                {
                    name: 'AWSManagedRulesSQLiRuleSet',
                    priority: 4,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesSQLiRuleSet'
                        }
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWSManagedRulesSQLiRuleSetMetric'
                    }
                },
                // Custom rule for API endpoints protection
                {
                    name: 'ProtectAPIEndpoints',
                    priority: 5,
                    statement: {
                        andStatement: {
                            statements: [
                                {
                                    byteMatchStatement: {
                                        searchString: '/api/',
                                        fieldToMatch: { uriPath: {} },
                                        textTransformations: [
                                            {
                                                priority: 0,
                                                type: 'LOWERCASE'
                                            }
                                        ],
                                        positionalConstraint: 'STARTS_WITH'
                                    }
                                },
                                {
                                    rateBasedStatement: {
                                        limit: 500,
                                        aggregateKeyType: 'IP'
                                    }
                                }
                            ]
                        }
                    },
                    action: { block: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'ProtectAPIEndpoints'
                    }
                },
                // Block requests with suspicious user agents
                {
                    name: 'BlockSuspiciousUserAgents',
                    priority: 6,
                    statement: {
                        orStatement: {
                            statements: [
                                {
                                    byteMatchStatement: {
                                        searchString: 'bot',
                                        fieldToMatch: {
                                            singleHeader: { name: 'user-agent' }
                                        },
                                        textTransformations: [
                                            {
                                                priority: 0,
                                                type: 'LOWERCASE'
                                            }
                                        ],
                                        positionalConstraint: 'CONTAINS'
                                    }
                                },
                                {
                                    byteMatchStatement: {
                                        searchString: 'crawler',
                                        fieldToMatch: {
                                            singleHeader: { name: 'user-agent' }
                                        },
                                        textTransformations: [
                                            {
                                                priority: 0,
                                                type: 'LOWERCASE'
                                            }
                                        ],
                                        positionalConstraint: 'CONTAINS'
                                    }
                                },
                                {
                                    byteMatchStatement: {
                                        searchString: 'scanner',
                                        fieldToMatch: {
                                            singleHeader: { name: 'user-agent' }
                                        },
                                        textTransformations: [
                                            {
                                                priority: 0,
                                                type: 'LOWERCASE'
                                            }
                                        ],
                                        positionalConstraint: 'CONTAINS'
                                    }
                                }
                            ]
                        }
                    },
                    action: { block: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'BlockSuspiciousUserAgents'
                    }
                },
                // Geographic restriction (optional - can be customized)
                {
                    name: 'GeoRestriction',
                    priority: 7,
                    statement: {
                        geoMatchStatement: {
                            // Allow only specific countries (example: Japan, US, EU)
                            countryCodes: ['JP', 'US', 'GB', 'DE', 'FR', 'CA', 'AU']
                        }
                    },
                    action: { allow: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'GeoRestriction'
                    }
                }
            ],
            visibilityConfig: {
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
                metricName: `${props.environment}-youtube-efootball-player-waf`
            }
        });
        // Enable logging
        new wafv2.CfnLoggingConfiguration(this, 'WafLoggingConfig', {
            resourceArn: this.webAcl.attrArn,
            logDestinationConfigs: [this.logGroup.logGroupArn],
            redactedFields: [
                {
                    singleHeader: { name: 'authorization' }
                },
                {
                    singleHeader: { name: 'cookie' }
                }
            ]
        });
        // Output the Web ACL ARN
        new cdk.CfnOutput(this, 'WebAclArn', {
            value: this.webAcl.attrArn,
            description: 'WAF Web ACL ARN'
        });
        new cdk.CfnOutput(this, 'WafLogGroupName', {
            value: this.logGroup.logGroupName,
            description: 'WAF Log Group Name'
        });
    }
    // Method to associate WAF with a resource
    associateWithResource(resourceArn) {
        return new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
            resourceArn: resourceArn,
            webAclArn: this.webAcl.attrArn
        });
    }
}
exports.WafConstruct = WafConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2FmLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2FmLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLDZEQUErQztBQUMvQywyREFBNkM7QUFDN0MsMkNBQXVDO0FBUXZDLE1BQWEsWUFBYSxTQUFRLHNCQUFTO0lBSXpDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZTtRQUN2RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLDJDQUEyQztRQUMzQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JELFlBQVksRUFBRSxjQUFjLEtBQUssQ0FBQyxXQUFXLDJCQUEyQjtZQUN4RSxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTO1lBQ3ZDLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDekMsQ0FBQyxDQUFDO1FBRUgscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDaEQsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1lBQ2xCLGFBQWEsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDNUIsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsK0JBQStCO1lBQ3pELFdBQVcsRUFBRSw4Q0FBOEM7WUFFM0QsS0FBSyxFQUFFO2dCQUNMLHFCQUFxQjtnQkFDckI7b0JBQ0UsSUFBSSxFQUFFLGVBQWU7b0JBQ3JCLFFBQVEsRUFBRSxDQUFDO29CQUNYLFNBQVMsRUFBRTt3QkFDVCxrQkFBa0IsRUFBRTs0QkFDbEIsS0FBSyxFQUFFLElBQUk7NEJBQ1gsZ0JBQWdCLEVBQUUsSUFBSTt5QkFDdkI7cUJBQ0Y7b0JBQ0QsTUFBTSxF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Q0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN6QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZO1lBQ2pDLFdBQVcsRUFBRSxvQkFBb0I7U0FDbEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELDBDQUEwQztJQUNuQyxxQkFBcUIsQ0FBQyxXQUFtQjtRQUM5QyxPQUFPLElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMvRCxXQUFXLEVBQUUsV0FBVztZQUN4QixTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPO1NBQy9CLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWxRRCxvQ0FrUUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgd2FmdjIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXdhZnYyJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2FmUHJvcHMge1xuICBzY29wZTogJ1JFR0lPTkFMJyB8ICdDTE9VREZST05UJztcbiAgcmVzb3VyY2VBcm4/OiBzdHJpbmc7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBXYWZDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgd2ViQWNsOiB3YWZ2Mi5DZm5XZWJBQ0w7XG4gIHB1YmxpYyByZWFkb25seSBsb2dHcm91cDogbG9ncy5Mb2dHcm91cDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogV2FmUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgLy8gQ3JlYXRlIENsb3VkV2F0Y2ggTG9nIEdyb3VwIGZvciBXQUYgbG9nc1xuICAgIHRoaXMubG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnV2FmTG9nR3JvdXAnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL3dhZnYyLyR7cHJvcHMuZW52aXJvbm1lbnR9LXlvdXR1YmUtZWZvb3RiYWxsLXBsYXllcmAsXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEgsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgV0FGIFdlYiBBQ0xcbiAgICB0aGlzLndlYkFjbCA9IG5ldyB3YWZ2Mi5DZm5XZWJBQ0wodGhpcywgJ1dlYkFjbCcsIHtcbiAgICAgIHNjb3BlOiBwcm9wcy5zY29wZSxcbiAgICAgIGRlZmF1bHRBY3Rpb246IHsgYWxsb3c6IHt9IH0sXG4gICAgICBuYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0teW91dHViZS1lZm9vdGJhbGwtcGxheWVyLXdhZmAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1dBRiBmb3IgWW91VHViZSBlRm9vdGJhbGwgUGxheWVyIGFwcGxpY2F0aW9uJyxcbiAgICAgIFxuICAgICAgcnVsZXM6IFtcbiAgICAgICAgLy8gUmF0ZSBsaW1pdGluZyBydWxlXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnUmF0ZUxpbWl0UnVsZScsXG4gICAgICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICAgICAgc3RhdGVtZW50OiB7XG4gICAgICAgICAgICByYXRlQmFzZWRTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgbGltaXQ6IDIwMDAsIC8vIDIwMDAgcmVxdWVzdHMgcGVyIDUgbWludXRlc1xuICAgICAgICAgICAgICBhZ2dyZWdhdGVLZXlUeXBlOiAnSVAnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBhY3Rpb246IHsgYmxvY2s6IHt9IH0sXG4gICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdSYXRlTGltaXRSdWxlJ1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBBV1MgTWFuYWdlZCBSdWxlcyAtIENvcmUgUnVsZSBTZXRcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0JyxcbiAgICAgICAgICBwcmlvcml0eTogMixcbiAgICAgICAgICBvdmVycmlkZUFjdGlvbjogeyBub25lOiB7fSB9LFxuICAgICAgICAgIHN0YXRlbWVudDoge1xuICAgICAgICAgICAgbWFuYWdlZFJ1bGVHcm91cFN0YXRlbWVudDoge1xuICAgICAgICAgICAgICB2ZW5kb3JOYW1lOiAnQVdTJyxcbiAgICAgICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc0NvbW1vblJ1bGVTZXQnLFxuICAgICAgICAgICAgICBleGNsdWRlZFJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgLy8gRXhjbHVkZSBydWxlcyB0aGF0IG1pZ2h0IGludGVyZmVyZSB3aXRoIGxlZ2l0aW1hdGUgcmVxdWVzdHNcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdTaXplUmVzdHJpY3Rpb25zX0JPRFknIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnR2VuZXJpY1JGSV9CT0RZJyB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQVdTTWFuYWdlZFJ1bGVzQ29tbW9uUnVsZVNldE1ldHJpYydcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gQVdTIE1hbmFnZWQgUnVsZXMgLSBLbm93biBCYWQgSW5wdXRzXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzS25vd25CYWRJbnB1dHNSdWxlU2V0JyxcbiAgICAgICAgICBwcmlvcml0eTogMyxcbiAgICAgICAgICBvdmVycmlkZUFjdGlvbjogeyBub25lOiB7fSB9LFxuICAgICAgICAgIHN0YXRlbWVudDoge1xuICAgICAgICAgICAgbWFuYWdlZFJ1bGVHcm91cFN0YXRlbWVudDoge1xuICAgICAgICAgICAgICB2ZW5kb3JOYW1lOiAnQVdTJyxcbiAgICAgICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzUnVsZVNldCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQVdTTWFuYWdlZFJ1bGVzS25vd25CYWRJbnB1dHNSdWxlU2V0TWV0cmljJ1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBBV1MgTWFuYWdlZCBSdWxlcyAtIFNRTCBJbmplY3Rpb25cbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNTUUxpUnVsZVNldCcsXG4gICAgICAgICAgcHJpb3JpdHk6IDQsXG4gICAgICAgICAgb3ZlcnJpZGVBY3Rpb246IHsgbm9uZToge30gfSxcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgIG1hbmFnZWRSdWxlR3JvdXBTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgdmVuZG9yTmFtZTogJ0FXUycsXG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNTUUxpUnVsZVNldCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQVdTTWFuYWdlZFJ1bGVzU1FMaVJ1bGVTZXRNZXRyaWMnXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIEN1c3RvbSBydWxlIGZvciBBUEkgZW5kcG9pbnRzIHByb3RlY3Rpb25cbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6ICdQcm90ZWN0QVBJRW5kcG9pbnRzJyxcbiAgICAgICAgICBwcmlvcml0eTogNSxcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgIGFuZFN0YXRlbWVudDoge1xuICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYnl0ZU1hdGNoU3RhdGVtZW50OiB7XG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaFN0cmluZzogJy9hcGkvJyxcbiAgICAgICAgICAgICAgICAgICAgZmllbGRUb01hdGNoOiB7IHVyaVBhdGg6IHt9IH0sXG4gICAgICAgICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm1hdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdMT1dFUkNBU0UnXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbmFsQ29uc3RyYWludDogJ1NUQVJUU19XSVRIJ1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgcmF0ZUJhc2VkU3RhdGVtZW50OiB7XG4gICAgICAgICAgICAgICAgICAgIGxpbWl0OiA1MDAsIC8vIDUwMCByZXF1ZXN0cyBwZXIgNSBtaW51dGVzIGZvciBBUEkgZW5kcG9pbnRzXG4gICAgICAgICAgICAgICAgICAgIGFnZ3JlZ2F0ZUtleVR5cGU6ICdJUCdcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGFjdGlvbjogeyBibG9jazoge30gfSxcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1Byb3RlY3RBUElFbmRwb2ludHMnXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIEJsb2NrIHJlcXVlc3RzIHdpdGggc3VzcGljaW91cyB1c2VyIGFnZW50c1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ0Jsb2NrU3VzcGljaW91c1VzZXJBZ2VudHMnLFxuICAgICAgICAgIHByaW9yaXR5OiA2LFxuICAgICAgICAgIHN0YXRlbWVudDoge1xuICAgICAgICAgICAgb3JTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGJ5dGVNYXRjaFN0YXRlbWVudDoge1xuICAgICAgICAgICAgICAgICAgICBzZWFyY2hTdHJpbmc6ICdib3QnLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZFRvTWF0Y2g6IHtcbiAgICAgICAgICAgICAgICAgICAgICBzaW5nbGVIZWFkZXI6IHsgbmFtZTogJ3VzZXItYWdlbnQnIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdGV4dFRyYW5zZm9ybWF0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ0xPV0VSQ0FTRSdcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uYWxDb25zdHJhaW50OiAnQ09OVEFJTlMnXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBieXRlTWF0Y2hTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoU3RyaW5nOiAnY3Jhd2xlcicsXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkVG9NYXRjaDoge1xuICAgICAgICAgICAgICAgICAgICAgIHNpbmdsZUhlYWRlcjogeyBuYW1lOiAndXNlci1hZ2VudCcgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB0ZXh0VHJhbnNmb3JtYXRpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnTE9XRVJDQVNFJ1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25hbENvbnN0cmFpbnQ6ICdDT05UQUlOUydcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGJ5dGVNYXRjaFN0YXRlbWVudDoge1xuICAgICAgICAgICAgICAgICAgICBzZWFyY2hTdHJpbmc6ICdzY2FubmVyJyxcbiAgICAgICAgICAgICAgICAgICAgZmllbGRUb01hdGNoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgc2luZ2xlSGVhZGVyOiB7IG5hbWU6ICd1c2VyLWFnZW50JyB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm1hdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdMT1dFUkNBU0UnXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbmFsQ29uc3RyYWludDogJ0NPTlRBSU5TJ1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgYWN0aW9uOiB7IGJsb2NrOiB7fSB9LFxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQmxvY2tTdXNwaWNpb3VzVXNlckFnZW50cydcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gR2VvZ3JhcGhpYyByZXN0cmljdGlvbiAob3B0aW9uYWwgLSBjYW4gYmUgY3VzdG9taXplZClcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6ICdHZW9SZXN0cmljdGlvbicsXG4gICAgICAgICAgcHJpb3JpdHk6IDcsXG4gICAgICAgICAgc3RhdGVtZW50OiB7XG4gICAgICAgICAgICBnZW9NYXRjaFN0YXRlbWVudDoge1xuICAgICAgICAgICAgICAvLyBBbGxvdyBvbmx5IHNwZWNpZmljIGNvdW50cmllcyAoZXhhbXBsZTogSmFwYW4sIFVTLCBFVSlcbiAgICAgICAgICAgICAgY291bnRyeUNvZGVzOiBbJ0pQJywgJ1VTJywgJ0dCJywgJ0RFJywgJ0ZSJywgJ0NBJywgJ0FVJ11cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGFjdGlvbjogeyBhbGxvdzoge30gfSxcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0dlb1Jlc3RyaWN0aW9uJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXSxcblxuICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxuICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgIG1ldHJpY05hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS15b3V0dWJlLWVmb290YmFsbC1wbGF5ZXItd2FmYFxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gRW5hYmxlIGxvZ2dpbmdcbiAgICBuZXcgd2FmdjIuQ2ZuTG9nZ2luZ0NvbmZpZ3VyYXRpb24odGhpcywgJ1dhZkxvZ2dpbmdDb25maWcnLCB7XG4gICAgICByZXNvdXJjZUFybjogdGhpcy53ZWJBY2wuYXR0ckFybixcbiAgICAgIGxvZ0Rlc3RpbmF0aW9uQ29uZmlnczogW3RoaXMubG9nR3JvdXAubG9nR3JvdXBBcm5dLFxuICAgICAgcmVkYWN0ZWRGaWVsZHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHNpbmdsZUhlYWRlcjogeyBuYW1lOiAnYXV0aG9yaXphdGlvbicgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc2luZ2xlSGVhZGVyOiB7IG5hbWU6ICdjb29raWUnIH1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IHRoZSBXZWIgQUNMIEFSTlxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJBY2xBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy53ZWJBY2wuYXR0ckFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnV0FGIFdlYiBBQ0wgQVJOJ1xuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dhZkxvZ0dyb3VwTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnV0FGIExvZyBHcm91cCBOYW1lJ1xuICAgIH0pO1xuICB9XG5cbiAgLy8gTWV0aG9kIHRvIGFzc29jaWF0ZSBXQUYgd2l0aCBhIHJlc291cmNlXG4gIHB1YmxpYyBhc3NvY2lhdGVXaXRoUmVzb3VyY2UocmVzb3VyY2VBcm46IHN0cmluZyk6IHdhZnYyLkNmbldlYkFDTEFzc29jaWF0aW9uIHtcbiAgICByZXR1cm4gbmV3IHdhZnYyLkNmbldlYkFDTEFzc29jaWF0aW9uKHRoaXMsICdXZWJBY2xBc3NvY2lhdGlvbicsIHtcbiAgICAgIHJlc291cmNlQXJuOiByZXNvdXJjZUFybixcbiAgICAgIHdlYkFjbEFybjogdGhpcy53ZWJBY2wuYXR0ckFyblxuICAgIH0pO1xuICB9XG59Il19