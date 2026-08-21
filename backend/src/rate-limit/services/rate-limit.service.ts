import { Injectable, Logger } from '@nestjs/common';
import { RateLimitPolicyEntity } from '../entities/rate-limit-policy.entity';
import { RateLimitPolicyService } from './rate-limit-policy.service';
import { RateLimitAlgorithmService, RateLimitResult } from './rate-limit-algorithm.service';

export interface RateLimitContext {
  userId?: string;
  userTier?: string;
  ipAddress?: string;
  endpoint: string;
  isAdmin?: boolean;
}

export interface RateLimitCheckResult extends RateLimitResult {
  policyId?: string;
  policyName?: string;
  actionTaken?: string;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private systemLoad = 0;

  constructor(
    private readonly policyService: RateLimitPolicyService,
    private readonly algorithmService: RateLimitAlgorithmService,
  ) {}

  async checkRateLimit(context: RateLimitContext): Promise<RateLimitCheckResult> {
    const { userId, userTier, ipAddress, endpoint, isAdmin } = context;

    if (isAdmin) {
      this.logger.debug(`Admin user bypassing rate limit: ${userId}`);
      return {
        allowed: true,
        remaining: Number.MAX_SAFE_INTEGER,
        reset: Date.now() + 86400000,
        limit: Number.MAX_SAFE_INTEGER,
      };
    }

    const policies = await this.policyService.getActivePolicies();
    const matchedPolicy = this.findMatchingPolicy(policies, userId, userTier, endpoint);

    if (!matchedPolicy) {
      this.logger.debug(`No matching policy for endpoint: ${endpoint}`);
      return {
        allowed: true,
        remaining: Number.MAX_SAFE_INTEGER,
        reset: Date.now() + 86400000,
        limit: Number.MAX_SAFE_INTEGER,
      };
    }

    const adjustedConfig = this.adjustConfigForSystemLoad(matchedPolicy.config, matchedPolicy.conditions?.systemLoad);
    const key = this.generateRateLimitKey(userId, ipAddress, endpoint);

    const result = await this.algorithmService.checkLimit(
      key,
      matchedPolicy.algorithm,
      adjustedConfig,
    );

    if (!result.allowed) {
      const actionTaken = this.determineAction(matchedPolicy.actions);
      await this.recordViolation(userId, ipAddress, endpoint, matchedPolicy.id, actionTaken);

      return {
        ...result,
        policyId: matchedPolicy.id,
        policyName: matchedPolicy.name,
        actionTaken,
      };
    }

    return {
      ...result,
      policyId: matchedPolicy.id,
      policyName: matchedPolicy.name,
    };
  }

  private findMatchingPolicy(
    policies: RateLimitPolicyEntity[],
    userId?: string,
    userTier?: string,
    endpoint?: string,
  ): RateLimitPolicyEntity | null {
    for (const policy of policies) {
      if (!policy.isActive) continue;

      const { users, tiers, endpoints } = policy.scope;

      const userMatch = users.includes('all') || (userId && users.includes(userId));
      const tierMatch = tiers.includes('all') || (userTier && tiers.includes(userTier));
      const endpointMatch = endpoints.includes('all') || this.endpointMatchesPattern(endpoint, endpoints);

      if (userMatch && tierMatch && endpointMatch) {
        return policy;
      }
    }

    return null;
  }

  private endpointMatchesPattern(endpoint: string | undefined, patterns: string[]): boolean {
    if (!endpoint) return false;

    for (const pattern of patterns) {
      if (pattern === endpoint) return true;
      
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      );
      if (regex.test(endpoint)) return true;
    }

    return false;
  }

  private adjustConfigForSystemLoad(
    config: any,
    threshold?: number,
  ): any {
    if (!threshold || this.systemLoad < threshold) {
      return config;
    }

    const loadFactor = 1 - ((this.systemLoad - threshold) / (100 - threshold));
    const adjustedRequestsPerSecond = Math.max(
      1,
      Math.floor(config.requestsPerSecond * loadFactor)
    );
    const adjustedBurstCapacity = Math.max(
      1,
      Math.floor(config.burstCapacity * loadFactor)
    );

    this.logger.warn(
      `Adjusting rate limits due to high system load: ${this.systemLoad}% - ` +
      `RPS: ${config.requestsPerSecond} -> ${adjustedRequestsPerSecond}`
    );

    return {
      ...config,
      requestsPerSecond: adjustedRequestsPerSecond,
      burstCapacity: adjustedBurstCapacity,
    };
  }

  private generateRateLimitKey(userId?: string, ipAddress?: string, endpoint?: string): string {
    const identifier = userId || ipAddress || 'anonymous';
    const normalizedEndpoint = endpoint?.replace(/\//g, ':') || 'unknown';
    return `${identifier}:${normalizedEndpoint}`;
  }

  private determineAction(actions: any): string {
    if (actions.block) return 'block';
    if (actions.challenge) return 'challenge';
    if (actions.throttle) return 'throttle';
    return 'throttle';
  }

  private async recordViolation(
    userId: string | undefined,
    ipAddress: string | undefined,
    endpoint: string,
    policyId: string,
    actionTaken: string,
  ): Promise<void> {
    try {
      await this.policyService.recordViolation(
        userId || null,
        ipAddress || null,
        endpoint,
        policyId,
        actionTaken,
      );
    } catch (error) {
      this.logger.error(`Failed to record violation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  updateSystemLoad(load: number): void {
    this.systemLoad = Math.min(100, Math.max(0, load));
    this.logger.debug(`System load updated: ${this.systemLoad}%`);
  }

  getSystemLoad(): number {
    return this.systemLoad;
  }

  async resetRateLimit(userId?: string, ipAddress?: string, endpoint?: string): Promise<void> {
    const key = this.generateRateLimitKey(userId, ipAddress, endpoint);
    await this.algorithmService.resetLimit(key);
    this.logger.log(`Rate limit reset for key: ${key}`);
  }
}
