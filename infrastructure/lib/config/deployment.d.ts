export interface DeploymentConfig {
    strategy: 'blue-green' | 'rolling' | 'canary';
    rollback: {
        enabled: boolean;
        autoRollbackOnFailure: boolean;
        rollbackTimeoutMinutes: number;
    };
    approval: {
        required: boolean;
        approvers: string[];
        timeoutMinutes: number;
    };
    notifications: {
        enabled: boolean;
        slackWebhook?: string;
        emailTopicArn?: string;
        events: ('started' | 'succeeded' | 'failed' | 'approval-needed')[];
    };
    testing: {
        runUnitTests: boolean;
        runIntegrationTests: boolean;
        runE2ETests: boolean;
        testTimeoutMinutes: number;
    };
    security: {
        runSecurityScan: boolean;
        runVulnerabilityScan: boolean;
        failOnHighSeverity: boolean;
    };
}
export declare function getDeploymentConfig(environment: string): DeploymentConfig;
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
export declare const promotionPipeline: EnvironmentPromotion[];
