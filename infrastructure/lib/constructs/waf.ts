import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface WafProps {
  scope: 'REGIONAL' | 'CLOUDFRONT';
  resourceArn?: string;
  environment: string;
}

export class WafConstruct extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: WafProps) {
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
              limit: 2000, // 2000 requests per 5 minutes
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
                    limit: 500, // 500 requests per 5 minutes for API endpoints
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
  public associateWithResource(resourceArn: string): wafv2.CfnWebACLAssociation {
    return new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
      resourceArn: resourceArn,
      webAclArn: this.webAcl.attrArn
    });
  }
}