import { EnvironmentConfig } from './environment';

export interface DeploymentConfig {
  // デプロイメント戦略
  strategy: 'blue-green' | 'rolling' | 'canary';
  
  // ロールバック設定
  rollback: {
    enabled: boolean;
    autoRollbackOnFailure: boolean;
    rollbackTimeoutMinutes: number;
  };
  
  // 承認設定
  approval: {
    required: boolean;
    approvers: string[];
    timeoutMinutes: number;
  };
  
  // 通知設定
  notifications: {
    enabled: boolean;
    slackWebhook?: string;
    emailTopicArn?: string;
    events: ('started' | 'succeeded' | 'failed' | 'approval-needed')[];
  };
  
  // テスト設定
  testing: {
    runUnitTests: boolean;
    runIntegrationTests: boolean;
    runE2ETests: boolean;
    testTimeoutMinutes: number;
  };
  
  // セキュリティスキャン
  security: {
    runSecurityScan: boolean;
    runVulnerabilityScan: boolean;
    failOnHighSeverity: boolean;
  };
}

export function getDeploymentConfig(environment: string): DeploymentConfig {
  const baseConfig: DeploymentConfig = {
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

export interface EnvironmentPromotion {
  from: string;
  to: string;
  requirements: {
    allTestsPassed: boolean;
    securityScanPassed: boolean;
    approvalRequired: boolean;
    minimumSuccessfulDeployments: number;
  };
}

export const promotionPipeline: EnvironmentPromotion[] = [
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