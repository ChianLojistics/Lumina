import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '../entities/ledger-entry.entity';

interface Conflict {
  transactionId: string;
  service: string;
  expectedState: Record<string, any>;
  actualState: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
}

interface ResolutionResult {
  resolved: boolean;
  action: string;
  correctedState?: Record<string, any>;
  timestamp: number;
}

@Injectable()
export class ConflictResolutionService {
  private readonly logger = new Logger(ConflictResolutionService.name);

  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
  ) {}

  /**
   * Resolve a detected conflict
   */
  async resolve(conflict: Conflict): Promise<ResolutionResult> {
    this.logger.log(`Resolving conflict for transaction ${conflict.transactionId}`);

    switch (conflict.severity) {
      case 'high':
        return this.resolveHighSeverity(conflict);
      case 'medium':
        return this.resolveMediumSeverity(conflict);
      case 'low':
        return this.resolveLowSeverity(conflict);
      default:
        throw new Error(`Unknown conflict severity: ${conflict.severity}`);
    }
  }

  /**
   * Resolve high severity conflicts (data corruption, double-spending)
   */
  private async resolveHighSeverity(conflict: Conflict): Promise<ResolutionResult> {
    this.logger.warn(`High severity conflict detected for ${conflict.transactionId}`);

    // Get all entries for this transaction
    const entries = await this.ledgerRepository.find({
      where: { transactionId: conflict.transactionId },
      order: { timestamp: 'ASC' },
    });

    // Determine the correct state based on ledger order
    const correctState = this.determineCorrectState(entries);

    // Create a correction entry
    const correctionEntry = this.ledgerRepository.create({
      entryId: `correction-${conflict.transactionId}-${Date.now()}`,
      timestamp: Date.now(),
      service: conflict.service,
      operation: 'correction',
      transactionId: conflict.transactionId,
      data: {
        originalConflict: conflict,
        correctedState: correctState,
        reason: 'High severity conflict resolution',
      },
      signature: '',
      previousHash: '',
    });

    await this.ledgerRepository.save(correctionEntry);

    this.logger.log(`High severity conflict resolved with correction entry`);

    return {
      resolved: true,
      action: 'correction_entry',
      correctedState: correctState,
      timestamp: Date.now(),
    };
  }

  /**
   * Resolve medium severity conflicts (operation conflicts)
   */
  private async resolveMediumSeverity(conflict: Conflict): Promise<ResolutionResult> {
    this.logger.log(`Medium severity conflict detected for ${conflict.transactionId}`);

    // For conflicting operations, use the latest operation as the truth
    const entries = await this.ledgerRepository.find({
      where: { transactionId: conflict.transactionId, service: conflict.service },
      order: { timestamp: 'DESC' },
      take: 1,
    });

    if (entries.length === 0) {
      return {
        resolved: false,
        action: 'no_action',
        timestamp: Date.now(),
      };
    }

    const latestEntry = entries[0];
    const correctedState = {
      operation: latestEntry.operation,
      data: latestEntry.data,
      timestamp: latestEntry.timestamp,
    };

    this.logger.log(`Medium severity conflict resolved using latest operation`);

    return {
      resolved: true,
      action: 'use_latest',
      correctedState,
      timestamp: Date.now(),
    };
  }

  /**
   * Resolve low severity conflicts (missing operations)
   */
  private async resolveLowSeverity(conflict: Conflict): Promise<ResolutionResult> {
    this.logger.log(`Low severity conflict detected for ${conflict.transactionId}`);

    // Low severity conflicts are informational and don't require correction
    // Just log and mark as resolved
    return {
      resolved: true,
      action: 'informational',
      timestamp: Date.now(),
    };
  }

  /**
   * Determine the correct state from ledger entries
   */
  private determineCorrectState(entries: LedgerEntry[]): Record<string, any> {
    if (entries.length === 0) {
      return {};
    }

    // Use the latest entry as the source of truth
    const latestEntry = entries[entries.length - 1];
    
    return {
      service: latestEntry.service,
      operation: latestEntry.operation,
      data: latestEntry.data,
      timestamp: latestEntry.timestamp,
      entryId: latestEntry.entryId,
    };
  }

  /**
   * Batch resolve multiple conflicts
   */
  async batchResolve(conflicts: Conflict[]): Promise<ResolutionResult[]> {
    const results: ResolutionResult[] = [];

    for (const conflict of conflicts) {
      try {
        const result = await this.resolve(conflict);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to resolve conflict for transaction ${conflict.transactionId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        results.push({
          resolved: false,
          action: 'error',
          timestamp: Date.now(),
        });
      }
    }

    return results;
  }

  /**
   * Get resolution statistics
   */
  async getStatistics() {
    // Count correction entries in the ledger
    const correctionEntries = await this.ledgerRepository.count({
      where: { operation: 'correction' },
    });

    return {
      totalCorrections: correctionEntries,
      resolutionRate: this.calculateResolutionRate(),
    };
  }

  /**
   * Calculate overall resolution rate
   */
  private calculateResolutionRate(): number {
    // This would be calculated from historical data
    // For now, return a placeholder
    return 95.0;
  }

  /**
   * Validate a proposed resolution before applying it
   */
  async validateResolution(
    conflict: Conflict,
    proposedResolution: Record<string, any>,
  ): Promise<boolean> {
    // Check if the proposed resolution is valid
    if (!proposedResolution || Object.keys(proposedResolution).length === 0) {
      return false;
    }

    // Check if the resolution addresses the conflict
    if (conflict.severity === 'high') {
      // High severity conflicts require explicit correction
      return proposedResolution.action === 'correction_entry';
    }

    return true;
  }

  /**
   * Manual conflict resolution (for admin intervention)
   */
  async manualResolution(
    transactionId: string,
    resolvedState: Record<string, any>,
    adminId: string,
  ): Promise<ResolutionResult> {
    this.logger.log(`Manual resolution for ${transactionId} by admin ${adminId}`);

    const manualEntry = this.ledgerRepository.create({
      entryId: `manual-${transactionId}-${Date.now()}`,
      timestamp: Date.now(),
      service: 'admin',
      operation: 'manual_resolution',
      transactionId,
      data: {
        resolvedState,
        adminId,
        reason: 'Manual intervention',
      },
      signature: '',
      previousHash: '',
    });

    await this.ledgerRepository.save(manualEntry);

    return {
      resolved: true,
      action: 'manual',
      correctedState: resolvedState,
      timestamp: Date.now(),
    };
  }
}
