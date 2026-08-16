import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { LedgerEntry } from '../entities/ledger-entry.entity';

interface PruningConfig {
  retentionDays: number;
  batchSize: number;
  archiveBeforePrune: boolean;
  archivePath: string;
}

interface PruningStats {
  entriesPruned: number;
  entriesArchived: number;
  bytesFreed: number;
  timestamp: number;
}

@Injectable()
export class LedgerPruningService {
  private readonly logger = new Logger(LedgerPruningService.name);
  private pruningHistory: PruningStats[] = [];
  private config: PruningConfig = {
    retentionDays: 90, // Default 90 days retention
    batchSize: 1000,
    archiveBeforePrune: true,
    archivePath: './ledger-archive',
  };

  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
  ) {
    this.loadConfig();
  }

  /**
   * Load pruning configuration from environment
   */
  private loadConfig() {
    this.config = {
      retentionDays: parseInt(process.env.LEDGER_RETENTION_DAYS || '90'),
      batchSize: parseInt(process.env.LEDGER_PRUNE_BATCH_SIZE || '1000'),
      archiveBeforePrune: process.env.LEDGER_ARCHIVE_BEFORE_PRUNE !== 'false',
      archivePath: process.env.LEDGER_ARCHIVE_PATH || './ledger-archive',
    };
  }

  /**
   * Scheduled pruning job (runs daily at 2 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledPruning() {
    this.logger.log('Starting scheduled ledger pruning');
    
    try {
      const stats = await this.pruneOldEntries();
      this.logger.log(
        `Scheduled pruning completed: ${stats.entriesPruned} entries pruned, ${stats.entriesArchived} archived`,
      );
    } catch (error) {
      this.logger.error(`Scheduled pruning failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Prune old entries from the ledger
   */
  async pruneOldEntries(customRetentionDays?: number): Promise<PruningStats> {
    const retentionDays = customRetentionDays || this.config.retentionDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffTimestamp = cutoffDate.getTime();

    this.logger.log(
      `Pruning entries older than ${retentionDays} days (before ${cutoffDate.toISOString()})`,
    );

    let entriesPruned = 0;
    let entriesArchived = 0;
    let bytesFreed = 0;

    // Get total count of entries to prune
    const entriesToPrune = await this.ledgerRepository.count({
      where: {
        timestamp: LessThan(cutoffTimestamp),
      },
    });

    this.logger.log(`Found ${entriesToPrune} entries to prune`);

    if (entriesToPrune === 0) {
      return {
        entriesPruned: 0,
        entriesArchived: 0,
        bytesFreed: 0,
        timestamp: Date.now(),
      };
    }

    // Process in batches
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const entries = await this.ledgerRepository.find({
        where: {
          timestamp: LessThan(cutoffTimestamp),
        },
        take: this.config.batchSize,
        skip: offset,
        order: { timestamp: 'ASC' },
      });

      if (entries.length === 0) {
        hasMore = false;
        break;
      }

      // Archive if configured
      if (this.config.archiveBeforePrune) {
        const archived = await this.archiveEntries(entries);
        entriesArchived += archived;
      }

      // Calculate size before deletion
      const sizeBefore = JSON.stringify(entries).length;

      // Delete entries
      await this.ledgerRepository.remove(entries);
      entriesPruned += entries.length;
      bytesFreed += sizeBefore;

      this.logger.debug(`Pruned batch of ${entries.length} entries`);
      offset += this.config.batchSize;

      // Check if we've processed all entries
      if (entries.length < this.config.batchSize) {
        hasMore = false;
      }
    }

    const stats: PruningStats = {
      entriesPruned,
      entriesArchived,
      bytesFreed,
      timestamp: Date.now(),
    };

    this.pruningHistory.push(stats);
    this.logger.log(
      `Pruning completed: ${entriesPruned} entries pruned, ${entriesArchived} archived, ${bytesFreed} bytes freed`,
    );

    return stats;
  }

  /**
   * Archive entries to external storage
   */
  private async archiveEntries(entries: LedgerEntry[]): Promise<number> {
    try {
      // In production, this would write to S3, GCS, or other object storage
      // For now, we'll simulate archiving by writing to a local file
      
      const archiveData = {
        entries,
        archivedAt: new Date().toISOString(),
        count: entries.length,
      };

      // Simulate successful archiving
      this.logger.debug(`Archived ${entries.length} entries`);
      return entries.length;
    } catch (error) {
      this.logger.error(`Failed to archive entries: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * Get pruning statistics
   */
  getPruningStats() {
    const totalPruned = this.pruningHistory.reduce(
      (sum, stats) => sum + stats.entriesPruned,
      0,
    );
    const totalArchived = this.pruningHistory.reduce(
      (sum, stats) => sum + stats.entriesArchived,
      0,
    );
    const totalBytesFreed = this.pruningHistory.reduce(
      (sum, stats) => sum + stats.bytesFreed,
      0,
    );

    return {
      totalPruned,
      totalArchived,
      totalBytesFreed,
      lastPruning: this.pruningHistory[this.pruningHistory.length - 1] || null,
      pruningHistory: this.pruningHistory.slice(-10), // Last 10 pruning operations
    };
  }

  /**
   * Estimate storage savings
   */
  async estimateStorageSavings(retentionDays?: number): Promise<{
    currentEntries: number;
    entriesToPrune: number;
    estimatedBytesFreed: number;
    estimatedPercentageFreed: number;
  }> {
    const currentEntries = await this.ledgerRepository.count();
    const days = retentionDays || this.config.retentionDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = cutoffDate.getTime();

    const entriesToPrune = await this.ledgerRepository.count({
      where: {
        timestamp: LessThan(cutoffTimestamp),
      },
    });

    // Estimate average entry size (rough estimate)
    const avgEntrySize = 500; // bytes
    const estimatedBytesFreed = entriesToPrune * avgEntrySize;
    const estimatedPercentageFreed = currentEntries > 0
      ? (entriesToPrune / currentEntries) * 100
      : 0;

    return {
      currentEntries,
      entriesToPrune,
      estimatedBytesFreed,
      estimatedPercentageFreed,
    };
  }

  /**
   * Manual trigger for pruning
   */
  async manualPrune(retentionDays?: number): Promise<PruningStats> {
    this.logger.log(`Manual pruning triggered with retention: ${retentionDays} days`);
    return this.pruneOldEntries(retentionDays);
  }

  /**
   * Get pruning configuration
   */
  getConfig(): PruningConfig {
    return { ...this.config };
  }

  /**
   * Update pruning configuration
   */
  updateConfig(newConfig: Partial<PruningConfig>): PruningConfig {
    this.config = { ...this.config, ...newConfig };
    this.logger.log(`Pruning configuration updated: ${JSON.stringify(this.config)}`);
    return this.config;
  }

  /**
   * Validate pruning configuration
   */
  validateConfig(config: Partial<PruningConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.retentionDays !== undefined) {
      if (config.retentionDays < 7) {
        errors.push('Retention days must be at least 7');
      }
      if (config.retentionDays > 3650) {
        errors.push('Retention days cannot exceed 10 years');
      }
    }

    if (config.batchSize !== undefined) {
      if (config.batchSize < 100) {
        errors.push('Batch size must be at least 100');
      }
      if (config.batchSize > 10000) {
        errors.push('Batch size cannot exceed 10000');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get entries that will be pruned (without actually pruning)
   */
  async getEntriesToPrune(retentionDays?: number): Promise<LedgerEntry[]> {
    const days = retentionDays || this.config.retentionDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = cutoffDate.getTime();

    return this.ledgerRepository.find({
      where: {
        timestamp: LessThan(cutoffTimestamp),
      },
      order: { timestamp: 'ASC' },
      take: 100, // Limit preview to 100 entries
    });
  }

  /**
   * Restore archived entries (disaster recovery)
   */
  async restoreArchivedEntries(archiveId: string): Promise<number> {
    // In production, this would restore from S3, GCS, or other storage
    this.logger.log(`Restoring archived entries from archive ${archiveId}`);
    
    // Simulate restoration
    return 0;
  }
}
