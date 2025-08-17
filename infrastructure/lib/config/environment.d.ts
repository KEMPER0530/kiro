export interface EnvironmentConfig {
    environment: string;
    region: string;
    dynamodb: {
        favoritesTableName: string;
        searchHistoryTableName: string;
        billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';
        pointInTimeRecovery: boolean;
    };
    lambda: {
        memorySize: number;
        timeout: number;
        reservedConcurrency?: number;
        environment: Record<string, string>;
    };
    apiGateway: {
        throttling: {
            rateLimit: number;
            burstLimit: number;
        };
        cors: {
            allowOrigins: string[];
            allowMethods: string[];
            allowHeaders: string[];
        };
    };
    cloudfront: {
        priceClass: string;
        cacheBehaviors: {
            defaultTtl: number;
            maxTtl: number;
            minTtl: number;
        };
    };
    elasticache: {
        nodeType: string;
        numCacheNodes: number;
        engineVersion: string;
    };
    security: {
        enableWaf: boolean;
        enableCloudTrail: boolean;
        enableGuardDuty: boolean;
    };
    monitoring: {
        enableXRay: boolean;
        logRetentionDays: number;
        enableDetailedMonitoring: boolean;
    };
}
export declare function getEnvironmentConfig(environment: string): EnvironmentConfig;
