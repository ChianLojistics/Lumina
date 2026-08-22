import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantService } from '../tenant.service';
import { Tenant, TenantStatus } from '../entities/tenant.entity';
import { TenantUser, TenantUserRole } from '../entities/tenant-user.entity';
import { CreateTenantDto } from '../dto/create-tenant.dto';

export interface OnboardingStep {
  step: string;
  completed: boolean;
  completedAt?: Date;
  error?: string;
}

export interface OnboardingProgress {
  tenantId: string;
  steps: OnboardingStep[];
  currentStep: string;
  progress: number;
  isComplete: boolean;
  startedAt: Date;
  completedAt?: Date;
}

@Injectable()
export class TenantOnboardingService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantUser)
    private tenantUserRepository: Repository<TenantUser>,
    private tenantService: TenantService,
  ) {}

  async startOnboarding(
    createTenantDto: CreateTenantDto,
    userId: string,
  ): Promise<{ tenant: Tenant; progress: OnboardingProgress }> {
    // Create tenant
    const tenant = await this.tenantService.create(createTenantDto, userId);

    // Add user as owner
    await this.tenantService.addUser(
      tenant.id,
      {
        user_id: userId,
        role: TenantUserRole.OWNER,
        invited_by: userId,
      },
      userId,
    );

    // Initialize onboarding progress
    const progress = await this.initializeOnboardingProgress(tenant.id);

    return { tenant, progress };
  }

  async completeStep(
    tenantId: string,
    step: string,
    userId: string,
  ): Promise<OnboardingProgress> {
    const tenant = await this.tenantService.findOne(tenantId);

    const progress = await this.getOnboardingProgress(tenantId);
    const stepIndex = progress.steps.findIndex((s) => s.step === step);

    if (stepIndex === -1) {
      throw new BadRequestException(`Invalid onboarding step: ${step}`);
    }

    if (progress.steps[stepIndex].completed) {
      return progress; // Already completed
    }

    // Mark step as completed
    progress.steps[stepIndex].completed = true;
    progress.steps[stepIndex].completedAt = new Date();

    // Update progress percentage
    const completedSteps = progress.steps.filter((s) => s.completed).length;
    progress.progress = (completedSteps / progress.steps.length) * 100;

    // Update current step
    const nextIncompleteStep = progress.steps.find((s) => !s.completed);
    progress.currentStep = nextIncompleteStep ? nextIncompleteStep.step : 'completed';

    // Check if all steps are complete
    if (progress.progress === 100) {
      progress.isComplete = true;
      progress.completedAt = new Date();

      // Update tenant status to active
      tenant.status = TenantStatus.ACTIVE;
      await this.tenantRepository.save(tenant);
    }

    await this.saveOnboardingProgress(tenantId, progress);

    return progress;
  }

  async getOnboardingProgress(tenantId: string): Promise<OnboardingProgress> {
    const tenant = await this.tenantService.findOne(tenantId);

    // Check if we have cached progress
    const cached = await this.getCachedProgress(tenantId);
    if (cached) {
      return cached;
    }

    // Initialize new progress
    return this.initializeOnboardingProgress(tenantId);
  }

  async skipStep(tenantId: string, step: string, userId: string): Promise<OnboardingProgress> {
    const progress = await this.getOnboardingProgress(tenantId);
    const stepIndex = progress.steps.findIndex((s) => s.step === step);

    if (stepIndex === -1) {
      throw new BadRequestException(`Invalid onboarding step: ${step}`);
    }

    // Mark as skipped (completed with note)
    progress.steps[stepIndex].completed = true;
    progress.steps[stepIndex].completedAt = new Date();
    progress.steps[stepIndex].error = 'Skipped by user';

    // Recalculate progress
    const completedSteps = progress.steps.filter((s) => s.completed).length;
    progress.progress = (completedSteps / progress.steps.length) * 100;

    const nextIncompleteStep = progress.steps.find((s) => !s.completed);
    progress.currentStep = nextIncompleteStep ? nextIncompleteStep.step : 'completed';

    if (progress.progress === 100) {
      progress.isComplete = true;
      progress.completedAt = new Date();
    }

    await this.saveOnboardingProgress(tenantId, progress);

    return progress;
  }

  async resetOnboarding(tenantId: string, userId: string): Promise<OnboardingProgress> {
    await this.deleteCachedProgress(tenantId);
    return this.initializeOnboardingProgress(tenantId);
  }

  private async initializeOnboardingProgress(tenantId: string): Promise<OnboardingProgress> {
    const steps: OnboardingStep[] = [
      { step: 'profile_setup', completed: false },
      { step: 'branding_config', completed: false },
      { step: 'api_key_creation', completed: false },
      { step: 'webhook_setup', completed: false },
      { step: 'first_payment', completed: false },
      { step: 'team_invitation', completed: false },
    ];

    const progress: OnboardingProgress = {
      tenantId,
      steps,
      currentStep: 'profile_setup',
      progress: 0,
      isComplete: false,
      startedAt: new Date(),
    };

    await this.saveOnboardingProgress(tenantId, progress);
    return progress;
  }

  private async saveOnboardingProgress(
    tenantId: string,
    progress: OnboardingProgress,
  ): Promise<void> {
    // In production, this would be saved to Redis or a database table
    // For now, we'll use a simple in-memory approach
    const key = `onboarding:${tenantId}`;
    // await this.cacheManager.set(key, progress, 86400); // 24 hours
  }

  private async getCachedProgress(tenantId: string): Promise<OnboardingProgress | null> {
    const key = `onboarding:${tenantId}`;
    // return await this.cacheManager.get(key);
    return null;
  }

  private async deleteCachedProgress(tenantId: string): Promise<void> {
    const key = `onboarding:${tenantId}`;
    // await this.cacheManager.del(key);
  }
}
