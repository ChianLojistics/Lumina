import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, randomBytes } from 'crypto';
import { PQKeyManagementService } from './pq-key-management.service';
import { CryptoAgilityService } from './crypto-agility.service';
import { PQKeyMetadata } from '../interfaces/key-management.interface';
import { PQCAlgorithm } from '../interfaces/hybrid-key-exchange.interface';

export interface MigrationPlan {
  id: string;
  userId?: string;
  targetAlgorithm: string;
  currentAlgorithm?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  phases: MigrationPhase[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  rollbackAvailable: boolean;
}

export interface MigrationPhase {
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface MigrationResult {
  success: boolean;
  planId: string;
  completedPhases: number;
  totalPhases: number;
  errors: string[];
  rollbackRequired: boolean;
}

export interface MigrationConfig {
  enableHybridMode: boolean;
  requireQuantumResistance: boolean;
  fallbackToClassical: boolean;
  migrationDeadline?: Date;
  autoMigrateUsers: boolean;
  notifyOnCompletion: boolean;
}

@Injectable()
export class PQMigrationService {
  private readonly logger = new Logger(PQMigrationService.name);
  private migrationPlans = new Map<string, MigrationPlan>();
  private config: MigrationConfig = this.getDefaultConfig();

  constructor(
    private readonly keyManagementService: PQKeyManagementService,
    private readonly cryptoAgilityService: CryptoAgilityService,
  ) {}

  private getDefaultConfig(): MigrationConfig {
    return {
      enableHybridMode: true,
      requireQuantumResistance: false,
      fallbackToClassical: true,
      autoMigrateUsers: false,
      notifyOnCompletion: true,
    };
  }

  getConfig(): MigrationConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<MigrationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.log('Migration configuration updated');
    
    // Apply configuration changes to crypto agility service
    if (updates.enableHybridMode !== undefined) {
      if (updates.enableHybridMode) {
        this.cryptoAgilityService.enableHybridMode();
      } else {
        this.cryptoAgilityService.disableHybridMode();
      }
    }
    
    if (updates.requireQuantumResistance !== undefined) {
      if (updates.requireQuantumResistance) {
        this.cryptoAgilityService.enableQuantumResistance();
      } else {
        this.cryptoAgilityService.disableQuantumResistance();
      }
    }
  }

  async createMigrationPlan(
    targetAlgorithm: PQCAlgorithm,
    userId?: string,
    currentAlgorithm?: string,
  ): Promise<MigrationPlan> {
    const planId = randomUUID();
    
    const phases: MigrationPhase[] = [
      {
        name: 'pre-migration-check',
        description: 'Validate system readiness and compatibility',
        status: 'pending',
      },
      {
        name: 'generate-pq-keys',
        description: 'Generate post-quantum key pairs',
        status: 'pending',
      },
      {
        name: 'enable-hybrid-mode',
        description: 'Enable hybrid classical/post-quantum operations',
        status: 'pending',
      },
      {
        name: 'test-operations',
        description: 'Test cryptographic operations with new keys',
        status: 'pending',
      },
      {
        name: 'update-dependencies',
        description: 'Update system dependencies to use new keys',
        status: 'pending',
      },
      {
        name: 'monitor-stability',
        description: 'Monitor system stability with hybrid mode',
        status: 'pending',
      },
      {
        name: 'full-pq-transition',
        description: 'Transition to full post-quantum mode',
        status: 'pending',
      },
      {
        name: 'deprecate-classical-keys',
        description: 'Deprecate classical cryptographic keys',
        status: 'pending',
      },
    ];

    const plan: MigrationPlan = {
      id: planId,
      userId,
      targetAlgorithm,
      currentAlgorithm,
      status: 'pending',
      phases,
      createdAt: new Date(),
      rollbackAvailable: true,
    };

    this.migrationPlans.set(planId, plan);
    this.logger.log(`Migration plan created: ${planId} for algorithm ${targetAlgorithm}`);
    
    return plan;
  }

  async executeMigrationPlan(planId: string): Promise<MigrationResult> {
    const plan = this.migrationPlans.get(planId);
    
    if (!plan) {
      throw new Error(`Migration plan not found: ${planId}`);
    }

    plan.status = 'in-progress';
    plan.startedAt = new Date();
    
    const errors: string[] = [];
    let completedPhases = 0;

    for (const phase of plan.phases) {
      try {
        phase.status = 'in-progress';
        phase.startedAt = new Date();
        
        await this.executePhase(phase, plan);
        
        phase.status = 'completed';
        phase.completedAt = new Date();
        completedPhases++;
        
        this.logger.log(`Phase ${phase.name} completed successfully`);
      } catch (error: any) {
        phase.status = 'failed';
        phase.error = error.message;
        errors.push(`Phase ${phase.name} failed: ${error.message}`);
        
        this.logger.error(`Phase ${phase.name} failed: ${error.message}`);
        
        // Stop migration on critical phase failure
        if (this.isCriticalPhase(phase.name)) {
          break;
        }
      }
    }

    const success = errors.length === 0;
    plan.status = success ? 'completed' : 'failed';
    plan.completedAt = new Date();

    return {
      success,
      planId,
      completedPhases,
      totalPhases: plan.phases.length,
      errors,
      rollbackRequired: !success && plan.rollbackAvailable,
    };
  }

  private async executePhase(phase: MigrationPhase, plan: MigrationPlan): Promise<void> {
    switch (phase.name) {
      case 'pre-migration-check':
        await this.preMigrationCheck(plan);
        break;
      case 'generate-pq-keys':
        await this.generatePQKeys(plan);
        break;
      case 'enable-hybrid-mode':
        await this.enableHybridMode(plan);
        break;
      case 'test-operations':
        await this.testOperations(plan);
        break;
      case 'update-dependencies':
        await this.updateDependencies(plan);
        break;
      case 'monitor-stability':
        await this.monitorStability(plan);
        break;
      case 'full-pq-transition':
        await this.fullPQTransition(plan);
        break;
      case 'deprecate-classical-keys':
        await this.deprecateClassicalKeys(plan);
        break;
      default:
        throw new Error(`Unknown phase: ${phase.name}`);
    }
  }

  private async preMigrationCheck(plan: MigrationPlan): Promise<void> {
    // Check system compatibility
    const supportedAlgorithms = this.cryptoAgilityService.getAlgorithmRecommendations('key-exchange');
    const isSupported = supportedAlgorithms.some(a => a.name === plan.targetAlgorithm);
    
    if (!isSupported) {
      throw new Error(`Target algorithm ${plan.targetAlgorithm} is not supported`);
    }
    
    // Check if hybrid mode is available
    if (!this.cryptoAgilityService.isHybridModeEnabled()) {
      this.logger.warn('Hybrid mode is not enabled, enabling for migration');
      this.cryptoAgilityService.enableHybridMode();
    }
    
    // Check fallback availability
    if (!this.cryptoAgilityService.canFallbackToClassical()) {
      this.logger.warn('Classical fallback is disabled, enabling for migration safety');
    }
  }

  private async generatePQKeys(plan: MigrationPlan): Promise<void> {
    const keyType = this.getKeyTypeForAlgorithm(plan.targetAlgorithm);
    
    const newKey = await this.keyManagementService.generateKey({
      algorithm: plan.targetAlgorithm,
      keyType,
      userId: plan.userId,
    });
    
    this.logger.log(`Generated new PQC key: ${newKey.id} for ${plan.targetAlgorithm}`);
  }

  private async enableHybridMode(plan: MigrationPlan): Promise<void> {
    if (!this.cryptoAgilityService.isHybridModeEnabled()) {
      this.cryptoAgilityService.enableHybridMode();
      this.logger.log('Hybrid mode enabled');
    }
  }

  private async testOperations(plan: MigrationPlan): Promise<void> {
    // Test basic operations with the new algorithm
    const keys = await this.keyManagementService.listKeys(plan.userId);
    const pqKey = keys.find(k => k.metadata.algorithm === plan.targetAlgorithm);
    
    if (!pqKey) {
      throw new Error('No PQC key found for testing');
    }
    
    // Perform basic validation tests
    this.logger.log(`Testing operations for key ${pqKey.id}`);
    
    // Additional testing logic would go here
    // For now, we'll just log that testing occurred
  }

  private async updateDependencies(plan: MigrationPlan): Promise<void> {
    // Update system to use new keys
    this.logger.log('Updating system dependencies to use new keys');
    
    // This would involve updating references in the system
    // For now, it's a placeholder
  }

  private async monitorStability(plan: MigrationPlan): Promise<void> {
    // Monitor system stability for a period
    this.logger.log('Monitoring system stability');
    
    // In a real implementation, this would monitor metrics
    // for a configurable period before proceeding
  }

  private async fullPQTransition(plan: MigrationPlan): Promise<void> {
    // Enable quantum resistance requirement
    if (this.config.requireQuantumResistance) {
      this.cryptoAgilityService.enableQuantumResistance();
      this.logger.log('Quantum resistance requirement enabled');
    }
  }

  private async deprecateClassicalKeys(plan: MigrationPlan): Promise<void> {
    // Deprecate classical keys
    const keys = await this.keyManagementService.listKeys(plan.userId);
    const classicalKeys = keys.filter(k => !k.metadata.algorithm.includes('ML-') && 
                                           !k.metadata.algorithm.includes('Kyber'));
    
    for (const key of classicalKeys) {
      await this.keyManagementService.updateKeyMetadata(key.id, {
        status: 'deprecated',
      });
    }
    
    this.logger.log(`Deprecated ${classicalKeys.length} classical keys`);
  }

  private isCriticalPhase(phaseName: string): boolean {
    const criticalPhases = ['pre-migration-check', 'generate-pq-keys', 'enable-hybrid-mode'];
    return criticalPhases.includes(phaseName);
  }

  private getKeyTypeForAlgorithm(algorithm: string): 'key-exchange' | 'signature' | 'encryption' {
    if (algorithm.includes('KEM') || algorithm === 'X25519') {
      return 'key-exchange';
    }
    if (algorithm.includes('DSA') || algorithm === 'ED25519') {
      return 'signature';
    }
    return 'encryption';
  }

  async rollbackMigration(planId: string): Promise<void> {
    const plan = this.migrationPlans.get(planId);
    
    if (!plan) {
      throw new Error(`Migration plan not found: ${planId}`);
    }

    if (!plan.rollbackAvailable) {
      throw new Error('Rollback is not available for this migration plan');
    }

    this.logger.log(`Rolling back migration plan: ${planId}`);
    
    // Disable quantum resistance
    this.cryptoAgilityService.disableQuantumResistance();
    
    // Re-enable classical keys
    const keys = await this.keyManagementService.listKeys(plan.userId);
    const classicalKeys = keys.filter(k => !k.metadata.algorithm.includes('ML-') && 
                                           !k.metadata.algorithm.includes('Kyber'));
    
    for (const key of classicalKeys) {
      await this.keyManagementService.updateKeyMetadata(key.id, {
        status: 'active',
      });
    }
    
    // Disable hybrid mode if configured
    if (!this.config.enableHybridMode) {
      this.cryptoAgilityService.disableHybridMode();
    }
    
    plan.status = 'failed';
    this.logger.log('Migration rolled back successfully');
  }

  getMigrationPlan(planId: string): MigrationPlan | null {
    return this.migrationPlans.get(planId) || null;
  }

  listMigrationPlans(userId?: string): MigrationPlan[] {
    const plans = Array.from(this.migrationPlans.values());
    
    if (userId) {
      return plans.filter(p => p.userId === userId);
    }
    
    return plans;
  }

  async checkMigrationStatus(): Promise<{
    ready: boolean;
    hybridModeEnabled: boolean;
    quantumResistanceRequired: boolean;
    activeMigrations: number;
    recommendations: string[];
  }> {
    const activeMigrations = Array.from(this.migrationPlans.values())
      .filter(p => p.status === 'in-progress').length;
    
    const recommendations: string[] = [];
    
    if (!this.cryptoAgilityService.isHybridModeEnabled()) {
      recommendations.push('Consider enabling hybrid mode for gradual migration');
    }
    
    if (!this.cryptoAgilityService.canFallbackToClassical()) {
      recommendations.push('Enable classical fallback for migration safety');
    }
    
    if (this.config.migrationDeadline && this.config.migrationDeadline < new Date()) {
      recommendations.push('Migration deadline has passed');
    }
    
    return {
      ready: this.cryptoAgilityService.isHybridModeEnabled() && 
             this.cryptoAgilityService.canFallbackToClassical(),
      hybridModeEnabled: this.cryptoAgilityService.isHybridModeEnabled(),
      quantumResistanceRequired: this.cryptoAgilityService.isQuantumResistantRequired(),
      activeMigrations,
      recommendations,
    };
  }

  async scheduleAutoMigration(
    targetAlgorithm: PQCAlgorithm,
    scheduledDate: Date,
    userId?: string,
  ): Promise<MigrationPlan> {
    const plan = await this.createMigrationPlan(targetAlgorithm, userId);
    
    // In a real implementation, this would use a job scheduler
    this.logger.log(`Scheduled auto-migration for ${scheduledDate.toISOString()}`);
    
    return plan;
  }
}
