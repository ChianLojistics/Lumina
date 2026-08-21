import AWS from 'aws-sdk';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency: number;
  timestamp: Date;
  details: {
    database: boolean;
    backend: boolean;
    redis: boolean;
  };
}

export class HealthChecker {
  private route53: AWS.Route53;

  constructor() {
    this.route53 = new AWS.Route53({
      region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  async checkRegionHealth(region: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const details = {
      database: false,
      backend: false,
      redis: false,
    };

    try {
      // Check database health
      details.database = await this.checkDatabaseHealth(region);
      
      // Check backend health
      details.backend = await this.checkBackendHealth(region);
      
      // Check Redis health
      details.redis = await this.checkRedisHealth(region);
      
      const latency = Date.now() - startTime;
      const status = this.determineStatus(details);
      
      return {
        status,
        latency,
        timestamp: new Date(),
        details,
      };
    } catch (error) {
      console.error(`Error checking health for region ${region}:`, error);
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        timestamp: new Date(),
        details,
      };
    }
  }

  private async checkDatabaseHealth(region: string): Promise<boolean> {
    try {
      // Execute health check via kubectl
      const { exec } = require('child_process');
      const namespace = region === 'us-east-1' ? 'lumina-primary' : 'lumina-dr';
      const podName = region === 'us-east-1' ? 'postgres-master-0' : 'postgres-replica-0';
      
      return new Promise((resolve) => {
        exec(
          `kubectl exec -n ${namespace} ${podName} -- pg_isready -U lumina`,
          (error: any, stdout: string, stderr: string) => {
            if (error) {
              resolve(false);
            } else {
              resolve(stdout.includes('accepting connections'));
            }
          }
        );
      });
    } catch (error) {
      return false;
    }
  }

  private async checkBackendHealth(region: string): Promise<boolean> {
    try {
      const response = await fetch(`http://backend.${region === 'us-east-1' ? 'lumina-primary' : 'lumina-dr'}.svc.cluster.local:4000/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async checkRedisHealth(region: string): Promise<boolean> {
    try {
      const { exec } = require('child_process');
      const namespace = region === 'us-east-1' ? 'lumina-primary' : 'lumina-dr';
      
      return new Promise((resolve) => {
        exec(
          `kubectl exec -n ${namespace} redis-0 -- redis-cli -a ${process.env.REDIS_PASSWORD} ping`,
          (error: any, stdout: string, stderr: string) => {
            if (error) {
              resolve(false);
            } else {
              resolve(stdout.trim() === 'PONG');
            }
          }
        );
      });
    } catch (error) {
      return false;
    }
  }

  private determineStatus(details: { database: boolean; backend: boolean; redis: boolean }): 'healthy' | 'unhealthy' | 'degraded' {
    const healthyCount = Object.values(details).filter(v => v).length;
    
    if (healthyCount === 3) return 'healthy';
    if (healthyCount === 0) return 'unhealthy';
    return 'degraded';
  }

  async getRoute53HealthCheck(healthCheckId: string): Promise<boolean> {
    try {
      const result = await this.route53.getHealthCheck({ HealthCheckId: healthCheckId }).promise();
      return result.HealthCheck?.HealthCheckConfig?.FullyQualifiedDomainName !== undefined;
    } catch (error) {
      console.error('Error getting Route53 health check:', error);
      return false;
    }
  }
}
