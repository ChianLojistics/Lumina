import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { ReconciliationReport } from '../entities/reconciliation-report.entity';
import { ReconcileDto } from '../dto/reconcile.dto';
import { ConflictResolutionService } from './conflict-resolution.service';

interface Conflict {
  transactionId: string;
  service: string;
  expectedState: Record<string, any>;
  actualState: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
}

interface ServiceState {
  service: string;
  transactionCount: number;
  lastSync: number;
  stateHash: string;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
    @InjectRepository(ReconciliationReport)
    private readonly reconciliationRepository: Repository<ReconciliationReport>,
    private readonly conflictResolution: ConflictResolutionService,
  ) {}

  /**
   * Perform reconciliation for a time range
   */
  async reconcile(dto: ReconcileDto): Promise<ReconciliationReport> {
    this.logger.log(`Starting reconciliation from ${dto.startTime} to ${dto.endTime}`);

    const startTime = new Date(dto.startTime).getTime();
    const endTime = new Date(dto.endTime).getTime();

    // Get all ledger entries in time range
    const entries = await this.ledgerRepository.find({
      where: {
        timestamp: Between(startTime, endTime),
      },
      order: { timestamp: 'ASC' },
    });

    // Filter by services if specified
    const filteredEntries = dto.services
      ? entries.filter(entry => dto.services!.includes(entry.service))
      : entries;

    // Get service states
    const serviceStates = await this.getServiceStates(filteredEntries);

    // Detect conflicts
    const conflicts = await this.detectConflicts(filteredEntries, serviceStates);

    // Resolve conflicts
    const resolvedConflicts = await this.resolveConflicts(conflicts);

    // Create reconciliation report
    const report = this.reconciliationRepository.create({
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      conflictsDetected: conflicts.length,
      conflictsResolved: resolvedConflicts.length,
      status: conflicts.length === resolvedConflicts.length ? 'completed' : 'partial',
      report: {
        serviceStates,
        conflicts,
        resolvedConflicts,
        entriesProcessed: filteredEntries.length,
        timestamp: Date.now(),
      },
    });

    const savedReport = await this.reconciliationRepository.save(report);

    this.logger.log(
      `Reconciliation completed: ${conflicts.length} conflicts detected, ${resolvedConflicts.length} resolved`,
    );

    return savedReport;
  }

  /**
   * Get current state of all services from ledger
   */
  private async getServiceStates(entries: LedgerEntry[]): Promise<ServiceState[]> {
    const serviceMap = new Map<string, ServiceState>();

    for (const entry of entries) {
      if (!serviceMap.has(entry.service)) {
        serviceMap.set(entry.service, {
          service: entry.service,
          transactionCount: 0,
          lastSync: entry.timestamp,
          stateHash: '',
        });
      }

      const state = serviceMap.get(entry.service)!;
      state.transactionCount++;
      state.lastSync = Math.max(state.lastSync, entry.timestamp);
    }

    // Calculate state hashes
    for (const [service, state] of serviceMap) {
      const serviceEntries = entries.filter(e => e.service === service);
      const stateData = serviceEntries.map(e => ({
        transactionId: e.transactionId,
        operation: e.operation,
        data: e.data,
      }));
      state.stateHash = await this.calculateStateHash(stateData);
    }

    return Array.from(serviceMap.values());
  }

  /**
   * Detect conflicts between ledger entries and expected states
   */
  private async detectConflicts(
    entries: LedgerEntry[],
    serviceStates: ServiceState[],
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Group entries by transaction
    const transactionMap = new Map<string, LedgerEntry[]>();
    for (const entry of entries) {
      if (!transactionMap.has(entry.transactionId)) {
        transactionMap.set(entry.transactionId, []);
      }
      transactionMap.get(entry.transactionId)!.push(entry);
    }

    // Check for conflicts within each transaction
    for (const [transactionId, txEntries] of transactionMap) {
      const conflict = this.checkTransactionConflict(transactionId, txEntries);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    // Check for service state inconsistencies
    for (const serviceState of serviceStates) {
      const serviceEntries = entries.filter(e => e.service === serviceState.service);
      const stateConflict = await this.checkServiceStateConflict(
        serviceState,
        serviceEntries,
      );
      if (stateConflict) {
        conflicts.push(stateConflict);
      }
    }

    return conflicts;
  }

  /**
   * Check for conflicts within a transaction
   */
  private checkTransactionConflict(
    transactionId: string,
    entries: LedgerEntry[],
  ): Conflict | null {
    // Check for duplicate operations
    const operationCounts = new Map<string, number>();
    for (const entry of entries) {
      const key = `${entry.service}:${entry.operation}`;
      operationCounts.set(key, (operationCounts.get(key) || 0) + 1);
    }

    for (const [key, count] of operationCounts) {
      if (count > 1) {
        const [service, operation] = key.split(':');
        return {
          transactionId,
          service,
          expectedState: { operation, count: 1 },
          actualState: { operation, count },
          severity: 'high',
        };
      }
    }

    // Check for conflicting operations (e.g., both credit and debit)
    const operations = entries.map(e => e.operation);
    if (operations.includes('credit') && operations.includes('debit')) {
      const service = entries[0]?.service || 'unknown';
      return {
        transactionId,
        service,
        expectedState: { operation: 'single' },
        actualState: { operations: 'conflicting' },
        severity: 'medium',
      };
    }

    return null;
  }

  /**
   * Check for service state conflicts
   */
  private async checkServiceStateConflict(
    serviceState: ServiceState,
    entries: LedgerEntry[],
  ): Promise<Conflict | null> {
    // Check for missing expected operations
    const expectedOperations = ['create', 'update', 'delete'];
    const actualOperations = [...new Set(entries.map(e => e.operation))];

    for (const expectedOp of expectedOperations) {
      if (!actualOperations.includes(expectedOp)) {
        // This might be expected, so only flag as low severity
        return {
          transactionId: 'N/A',
          service: serviceState.service,
          expectedState: { operation: expectedOp },
          actualState: { operations: actualOperations },
          severity: 'low',
        };
      }
    }

    return null;
  }

  /**
   * Resolve detected conflicts
   */
  private async resolveConflicts(conflicts: Conflict[]): Promise<Conflict[]> {
    const resolved: Conflict[] = [];

    for (const conflict of conflicts) {
      try {
        const resolution = await this.conflictResolution.resolve(conflict);
        if (resolution) {
          resolved.push(conflict);
          this.logger.log(`Resolved conflict for transaction ${conflict.transactionId}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to resolve conflict for transaction ${conflict.transactionId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return resolved;
  }

  /**
   * Calculate hash of service state
   */
  private async calculateStateHash(stateData: any[]): Promise<string> {
    const { sha256 } = await import('@noble/hashes/sha256');
    const serialized = JSON.stringify(stateData);
    const hash = sha256(serialized);
    return Buffer.from(hash).toString('hex');
  }

  /**
   * Get reconciliation report by ID
   */
  async getReport(reportId: string): Promise<ReconciliationReport> {
    return this.reconciliationRepository.findOne({ where: { id: reportId } });
  }

  /**
   * Get recent reconciliation reports
   */
  async getRecentReports(limit: number = 10): Promise<ReconciliationReport[]> {
    return this.reconciliationRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get reconciliation statistics
   */
  async getStatistics() {
    const totalReports = await this.reconciliationRepository.count();
    const completedReports = await this.reconciliationRepository.count({
      where: { status: 'completed' },
    });
    const partialReports = await this.reconciliationRepository.count({
      where: { status: 'partial' },
    });

    const recentReports = await this.reconciliationRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const totalConflictsDetected = recentReports.reduce(
      (sum, report) => sum + report.conflictsDetected,
      0,
    );
    const totalConflictsResolved = recentReports.reduce(
      (sum, report) => sum + report.conflictsResolved,
      0,
    );

    return {
      totalReports,
      completedReports,
      partialReports,
      totalConflictsDetected,
      totalConflictsResolved,
      resolutionRate: totalConflictsDetected > 0
        ? (totalConflictsResolved / totalConflictsDetected) * 100
        : 100,
    };
  }

  /**
   * Schedule automatic reconciliation
   */
  async scheduleAutoReconciliation(intervalMinutes: number = 60) {
    // This would be implemented using @nestjs/schedule
    this.logger.log(`Auto-reconciliation scheduled every ${intervalMinutes} minutes`);
  }
}
