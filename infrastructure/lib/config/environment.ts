export interface EnvironmentConfig {
  environment: string;
  region: string;
  
  // DynamoDB設定
  dynamodb: {
    favoritesTableName: string;
    searchHistoryTableName: string;
    billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';
    pointInTimeRecovery: boolean;
  };
  
  // Lambda設定
  lambda: {
    memorySize: number;
    timeout: number;
    reservedConcurrency?: number;
    environment: Record<string, string>;
  };
  
  // API Gateway設定
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
  
  // CloudFront設定
  cloudfront: {
    priceClass: string;
    cacheBehaviors: {
      defaultTtl: number;
      maxTtl: number;
      minTtl: number;
    };
  };
  
  // ElastiCache設定
  elasticache: {
    nodeType: string;
    numCacheNodes: number;
    engineVersion: string;
  };
  
  // セキュリティ設定
  security: {
    enableWaf: boolean;
    enableCloudTrail: boolean;
    enableGuardDuty: boolean;
  };
  
  // モニタリング設定
  monitoring: {
    enableXRay: boolean;
    logRetentionDays: number;
    enableDetailedMonitoring: boolean;
  };
}

const baseConfig: Omit<EnvironmentConfig, 'environment'> = {
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
      defaultTtl: 86400, // 1日
      maxTtl: 31536000, // 1年
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

const environments: Record<string, EnvironmentConfig> = {
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

export function getEnvironmentConfig(environment: string): EnvironmentConfig {
  const config = environments[environment];
  if (!config) {
    throw new Error(`Unknown environment: ${environment}. Available environments: ${Object.keys(environments).join(', ')}`);
  }
  return config;
}