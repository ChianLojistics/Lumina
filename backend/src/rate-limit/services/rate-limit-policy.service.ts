import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RateLimitPolicyEntity, RateLimitAlgorithm } from '../entities/rate-limit-policy.entity';
import { RateLimitViolationEntity } from '../entities/rate-limit-violation.entity';

export interface CreatePolicyDto {
  name: string;
  algorithm: RateLimitAlgorithm;
  config: {
    requestsPerSecond: number;
    burstCapacity: number;
    windowSize: number;
  };
  scope: {
    users: string[];
    tiers: string[];
    endpoints: string[];
  };
  conditions?: {
    systemLoad?: number;
    timeOfDay?: string[];
  };
  actions: {
    throttle: boolean;
    challenge: boolean;
    block: boolean;
  };
  priority?: number;
}

export interface UpdatePolicyDto {
  name?: string;
  algorithm?: RateLimitAlgorithm;
  config?: {
    requestsPerSecond?: number;
    burstCapacity?: number;
    windowSize?: number;
  };
  scope?: {
    users?: string[];
    tiers?: string[];
    endpoints?: string[];
  };
  conditions?: {
    systemLoad?: number;
    timeOfDay?: string[];
  };
  actions?: {
    throttle?: boolean;
    challenge?: boolean;
    block?: boolean;
  };
  priority?: number;
  isActive?: boolean;
}

@Injectable()
export class RateLimitPolicyService {
  private readonly logger = new Logger(RateLimitPolicyService.name);
  private policyCache = new Map<string, RateLimitPolicyEntity>();
  private cacheTTL = 300000; // 5 minutes

  constructor(
    @InjectRepository(RateLimitPolicyEntity)
    private policyRepository: Repository<RateLimitPolicyEntity>,
    @InjectRepository(RateLimitViolationEntity)
    private violationRepository: Repository<RateLimitViolationEntity>,
  ) {}

  async createPolicy(dto: CreatePolicyDto): Promise<RateLimitPolicyEntity> {
    const policy = this.policyRepository.create({
      name: dto.name,
      algorithm: dto.algorithm,
      config: dto.config,
      scope: dto.scope,
      conditions: dto.conditions,
      actions: dto.actions,
      priority: dto.priority || 0,
      isActive: true,
    });

    const saved = await this.policyRepository.save(policy);
    this.invalidateCache();
    this.logger.log(`Created rate limit policy: ${saved.id}`);
    return saved;
  }

  async getAllPolicies(activeOnly: boolean = false): Promise<RateLimitPolicyEntity[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.policyRepository.find({
      where,
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async getPolicyById(id: string): Promise<RateLimitPolicyEntity> {
    const policy = await this.policyRepository.findOne({ where: { id } as any });
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }
    return policy;
  }

  async updatePolicy(id: string, dto: UpdatePolicyDto): Promise<RateLimitPolicyEntity> {
    const policy = await this.getPolicyById(id);

    if (dto.name !== undefined) policy.name = dto.name;
    if (dto.algorithm !== undefined) policy.algorithm = dto.algorithm;
    if (dto.config !== undefined) policy.config = { ...policy.config, ...dto.config };
    if (dto.scope !== undefined) policy.scope = { ...policy.scope, ...dto.scope };
    if (dto.conditions !== undefined) policy.conditions = { ...policy.conditions, ...dto.conditions };
    if (dto.actions !== undefined) policy.actions = { ...policy.actions, ...dto.actions };
    if (dto.priority !== undefined) policy.priority = dto.priority;
    if (dto.isActive !== undefined) policy.isActive = dto.isActive;

    const updated = await this.policyRepository.save(policy);
    this.invalidateCache();
    this.logger.log(`Updated rate limit policy: ${id}`);
    return updated;
  }

  async deletePolicy(id: string): Promise<void> {
    const policy = await this.getPolicyById(id);
    await this.policyRepository.remove(policy);
    this.invalidateCache();
    this.logger.log(`Deleted rate limit policy: ${id}`);
  }

  async activatePolicy(id: string): Promise<RateLimitPolicyEntity> {
    return this.updatePolicy(id, { isActive: true });
  }

  async deactivatePolicy(id: string): Promise<RateLimitPolicyEntity> {
    return this.updatePolicy(id, { isActive: false });
  }

  async getActivePolicies(): Promise<RateLimitPolicyEntity[]> {
    const cacheKey = 'active_policies';
    const cached = this.policyCache.get(cacheKey);
    if (cached) {
      return [cached];
    }

    const policies = await this.getAllPolicies(true);
    this.policyCache.set(cacheKey, policies[0] || null);
    return policies;
  }

  private invalidateCache(): void {
    this.policyCache.clear();
  }

  async recordViolation(
    userId: string | null,
    ipAddress: string | null,
    endpoint: string,
    policyId: string | null,
    actionTaken: string,
    metadata?: Record<string, any>,
  ): Promise<RateLimitViolationEntity> {
    const violation = this.violationRepository.create({
      userId,
      ipAddress,
      endpoint,
      policyId,
      actionTaken,
      metadata,
    });

    const saved = await this.violationRepository.save(violation);
    this.logger.warn(`Rate limit violation recorded: ${endpoint} - ${actionTaken}`);
    return saved;
  }

  async getViolations(
    userId?: string,
    ipAddress?: string,
    endpoint?: string,
    limit: number = 100,
  ): Promise<RateLimitViolationEntity[]> {
    const where: any = {};
    if (userId) where.userId = userId;
    if (ipAddress) where.ipAddress = ipAddress;
    if (endpoint) where.endpoint = endpoint;

    return this.violationRepository.find({
      where,
      order: { violatedAt: 'DESC' },
      take: limit,
    });
  }

  async getViolationStats(days: number = 30): Promise<{
    totalViolations: number;
    violationsByEndpoint: Record<string, number>;
    violationsByAction: Record<string, number>;
    topViolators: Array<{ userId?: string; ipAddress?: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const violations = await this.violationRepository.find({
      where: { violatedAt: { $gte: startDate } as any },
    });

    const violationsByEndpoint: Record<string, number> = {};
    const violationsByAction: Record<string, number> = {};
    const violatorMap = new Map<string, { userId?: string; ipAddress?: string; count: number }>();

    for (const violation of violations) {
      violationsByEndpoint[violation.endpoint] = (violationsByEndpoint[violation.endpoint] || 0) + 1;
      violationsByAction[violation.actionTaken] = (violationsByAction[violation.actionTaken] || 0) + 1;

      const key = violation.userId || violation.ipAddress || 'unknown';
      const existing = violatorMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        violatorMap.set(key, {
          userId: violation.userId || undefined,
          ipAddress: violation.ipAddress || undefined,
          count: 1,
        });
      }
    }

    const topViolators = Array.from(violatorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalViolations: violations.length,
      violationsByEndpoint,
      violationsByAction,
      topViolators,
    };
  }
}
