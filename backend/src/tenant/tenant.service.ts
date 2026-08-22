import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from './entities/tenant.entity';
import { TenantUser, TenantUserRole } from './entities/tenant-user.entity';
import { TenantUsage, UsageResourceType } from './entities/tenant-usage.entity';
import { TenantAudit, AuditAction, AuditResource } from './entities/tenant-audit.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AddTenantUserDto } from './dto/add-tenant-user.dto';
import { UpdateQuotaDto } from './dto/update-quota.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { BrandingConfig, QuotaConfig, FeatureConfig } from './entities/tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantUser)
    private tenantUserRepository: Repository<TenantUser>,
    @InjectRepository(TenantUsage)
    private tenantUsageRepository: Repository<TenantUsage>,
    @InjectRepository(TenantAudit)
    private tenantAuditRepository: Repository<TenantAudit>,
  ) {}

  async create(createTenantDto: CreateTenantDto, actorId: string): Promise<Tenant> {
    const existing = await this.tenantRepository.findOne({
      where: [
        { slug: createTenantDto.slug },
        ...(createTenantDto.domain ? [{ domain: createTenantDto.domain }] : []),
      ],
    });

    if (existing) {
      throw new ConflictException('Tenant with this slug or domain already exists');
    }

    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      branding_config: createTenantDto.branding_config || this.getDefaultBranding(),
      quota_config: createTenantDto.quota_config || this.getDefaultQuota(),
      feature_config: createTenantDto.feature_config || this.getDefaultFeatures(),
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // Initialize usage tracking
    await this.initializeUsageTracking(savedTenant.id);

    // Audit log
    await this.createAuditLog({
      tenant_id: savedTenant.id,
      actor_id: actorId,
      action: AuditAction.TENANT_CREATED,
      resource: AuditResource.TENANT,
      resource_id: savedTenant.id,
      new_values: savedTenant,
      description: `Tenant ${savedTenant.name} created`,
    });

    return savedTenant;
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { slug } });
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { domain } });
  }

  async update(id: string, updateTenantDto: UpdateTenantDto, actorId: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    const oldValues = { ...tenant };

    Object.assign(tenant, updateTenantDto);
    const updatedTenant = await this.tenantRepository.save(tenant);

    // Audit log
    await this.createAuditLog({
      tenant_id: id,
      actor_id: actorId,
      action: AuditAction.TENANT_UPDATED,
      resource: AuditResource.TENANT,
      resource_id: id,
      old_values: oldValues,
      new_values: updatedTenant,
      description: `Tenant ${tenant.name} updated`,
    });

    return updatedTenant;
  }

  async remove(id: string, actorId: string): Promise<void> {
    const tenant = await this.findOne(id);
    
    await this.tenantRepository.remove(tenant);

    // Audit log
    await this.createAuditLog({
      tenant_id: id,
      actor_id: actorId,
      action: AuditAction.TENANT_DELETED,
      resource: AuditResource.TENANT,
      resource_id: id,
      old_values: tenant,
      description: `Tenant ${tenant.name} deleted`,
    });
  }

  async addUser(tenantId: string, addUserDto: AddTenantUserDto, actorId: string): Promise<TenantUser> {
    const tenant = await this.findOne(tenantId);

    const existing = await this.tenantUserRepository.findOne({
      where: { tenant_id: tenantId, user_id: addUserDto.user_id },
    });

    if (existing) {
      throw new ConflictException('User already belongs to this tenant');
    }

    const tenantUser = this.tenantUserRepository.create({
      tenant_id: tenantId,
      user_id: addUserDto.user_id,
      role: addUserDto.role,
      invited_by: addUserDto.invited_by || actorId,
      invited_at: new Date(),
      joined_at: new Date(),
    });

    const saved = await this.tenantUserRepository.save(tenantUser);

    // Audit log
    await this.createAuditLog({
      tenant_id: tenantId,
      actor_id: actorId,
      action: AuditAction.USER_ADDED,
      resource: AuditResource.USER,
      resource_id: addUserDto.user_id,
      new_values: saved,
      description: `User ${addUserDto.user_id} added to tenant`,
    });

    return saved;
  }

  async removeUser(tenantId: string, userId: string, actorId: string): Promise<void> {
    const tenantUser = await this.tenantUserRepository.findOne({
      where: { tenant_id: tenantId, user_id: userId },
    });

    if (!tenantUser) {
      throw new NotFoundException('User not found in this tenant');
    }

    await this.tenantUserRepository.remove(tenantUser);

    // Audit log
    await this.createAuditLog({
      tenant_id: tenantId,
      actor_id: actorId,
      action: AuditAction.USER_REMOVED,
      resource: AuditResource.USER,
      resource_id: userId,
      old_values: tenantUser,
      description: `User ${userId} removed from tenant`,
    });
  }

  async getQuotaUsage(tenantId: string): Promise<TenantUsage[]> {
    return this.tenantUsageRepository.find({
      where: { tenant_id: tenantId },
    });
  }

  async updateQuota(tenantId: string, updateQuotaDto: UpdateQuotaDto, actorId: string): Promise<Tenant> {
    const tenant = await this.findOne(tenantId);
    const oldQuota = { ...tenant.quota_config };

    const newQuota = {
      ...tenant.quota_config,
      ...updateQuotaDto,
    };

    tenant.quota_config = newQuota as QuotaConfig;
    const updated = await this.tenantRepository.save(tenant);

    // Audit log
    await this.createAuditLog({
      tenant_id: tenantId,
      actor_id: actorId,
      action: AuditAction.QUOTA_UPDATED,
      resource: AuditResource.QUOTA,
      resource_id: tenantId,
      old_values: oldQuota,
      new_values: newQuota,
      description: `Quota configuration updated`,
    });

    return updated;
  }

  async getBranding(tenantId: string): Promise<BrandingConfig> {
    const tenant = await this.findOne(tenantId);
    return tenant.branding_config;
  }

  async updateBranding(tenantId: string, updateBrandingDto: UpdateBrandingDto, actorId: string): Promise<Tenant> {
    const tenant = await this.findOne(tenantId);
    const oldBranding = { ...tenant.branding_config };

    const newBranding = {
      ...tenant.branding_config,
      ...updateBrandingDto,
    };

    tenant.branding_config = newBranding as BrandingConfig;
    const updated = await this.tenantRepository.save(tenant);

    // Audit log
    await this.createAuditLog({
      tenant_id: tenantId,
      actor_id: actorId,
      action: AuditAction.BRANDING_UPDATED,
      resource: AuditResource.BRANDING,
      resource_id: tenantId,
      old_values: oldBranding,
      new_values: newBranding,
      description: `Branding configuration updated`,
    });

    return updated;
  }

  async getAuditLogs(tenantId: string, limit: number = 100): Promise<TenantAudit[]> {
    return this.tenantAuditRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async checkQuota(tenantId: string, resource: UsageResourceType): Promise<boolean> {
    const tenant = await this.findOne(tenantId);
    const usage = await this.tenantUsageRepository.findOne({
      where: { tenant_id: tenantId, resource_type: resource },
    });

    if (!usage) {
      return true;
    }

    const quota = tenant.quota_config;
    const now = new Date();

    // Check hourly quota
    if (resource === UsageResourceType.API_CALLS && quota.apiCalls) {
      if (this.shouldReset(usage.hourly_reset_at, 'hour')) {
        usage.hourly_count = 0;
        usage.hourly_reset_at = now;
      }
      if (usage.hourly_count >= quota.apiCalls.hourly) {
        return false;
      }
    }

    // Check daily quota
    if (resource === UsageResourceType.API_CALLS && quota.apiCalls) {
      if (this.shouldReset(usage.daily_reset_at, 'day')) {
        usage.daily_count = 0;
        usage.daily_reset_at = now;
      }
      if (usage.daily_count >= quota.apiCalls.daily) {
        return false;
      }
    }

    // Check transaction quotas
    if (resource === UsageResourceType.TRANSACTIONS && quota.transactions) {
      if (this.shouldReset(usage.daily_reset_at, 'day')) {
        usage.daily_count = 0;
        usage.daily_reset_at = now;
      }
      if (usage.daily_count >= quota.transactions.daily) {
        return false;
      }
    }

    return true;
  }

  async recordUsage(tenantId: string, resource: UsageResourceType, amount: number = 1): Promise<void> {
    let usage = await this.tenantUsageRepository.findOne({
      where: { tenant_id: tenantId, resource_type: resource },
    });

    if (!usage) {
      usage = this.tenantUsageRepository.create({
        tenant_id: tenantId,
        resource_type: resource,
        daily_count: 0,
        hourly_count: 0,
        monthly_count: 0,
        total_count: 0,
        current_value: 0,
        daily_reset_at: new Date(),
        hourly_reset_at: new Date(),
        monthly_reset_at: new Date(),
      });
    }

    const now = new Date();
    
    if (this.shouldReset(usage.hourly_reset_at, 'hour')) {
      usage.hourly_count = 0;
      usage.hourly_reset_at = now;
    }
    
    if (this.shouldReset(usage.daily_reset_at, 'day')) {
      usage.daily_count = 0;
      usage.daily_reset_at = now;
    }
    
    if (this.shouldReset(usage.monthly_reset_at, 'month')) {
      usage.monthly_count = 0;
      usage.monthly_reset_at = now;
    }

    usage.hourly_count += amount;
    usage.daily_count += amount;
    usage.monthly_count += amount;
    usage.total_count += amount;
    
    if (resource === UsageResourceType.STORAGE) {
      usage.current_value += amount;
    }

    await this.tenantUsageRepository.save(usage);
  }

  private async initializeUsageTracking(tenantId: string): Promise<void> {
    const resources = [
      UsageResourceType.API_CALLS,
      UsageResourceType.TRANSACTIONS,
      UsageResourceType.STORAGE,
      UsageResourceType.WEBHOOKS,
      UsageResourceType.CUSTOM_DOMAINS,
    ];

    for (const resource of resources) {
      const usage = this.tenantUsageRepository.create({
        tenant_id: tenantId,
        resource_type: resource,
        daily_count: 0,
        hourly_count: 0,
        monthly_count: 0,
        total_count: 0,
        current_value: 0,
        daily_reset_at: new Date(),
        hourly_reset_at: new Date(),
        monthly_reset_at: new Date(),
      });
      await this.tenantUsageRepository.save(usage);
    }
  }

  private async createAuditLog(data: Partial<TenantAudit>): Promise<void> {
    const audit = this.tenantAuditRepository.create(data);
    await this.tenantAuditRepository.save(audit);
  }

  private shouldReset(lastReset: Date, period: 'hour' | 'day' | 'month'): boolean {
    if (!lastReset) return true;
    
    const now = new Date();
    const diff = now.getTime() - lastReset.getTime();
    
    switch (period) {
      case 'hour':
        return diff > 60 * 60 * 1000;
      case 'day':
        return diff > 24 * 60 * 60 * 1000;
      case 'month':
        return diff > 30 * 24 * 60 * 60 * 1000;
      default:
        return false;
    }
  }

  private getDefaultBranding(): BrandingConfig {
    return {
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
    };
  }

  private getDefaultQuota(): QuotaConfig {
    return {
      apiCalls: {
        daily: 10000,
        hourly: 1000,
      },
      transactions: {
        daily: 100,
        monthly: 3000,
      },
      storage: {
        maxBytes: 1073741824, // 1GB
      },
      webhooks: {
        maxEndpoints: 10,
      },
      customDomains: {
        maxDomains: 1,
      },
    };
  }

  private getDefaultFeatures(): FeatureConfig {
    return {
      payments: true,
      subscriptions: true,
      escrow: true,
      paymentSplits: true,
      onRamp: false,
      offRamp: false,
      advancedAnalytics: false,
      customWebhooks: true,
      prioritySupport: false,
    };
  }
}
