import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { ReconciliationReport } from '../entities/reconciliation-report.entity';
import { WriteEntryDto } from '../dto/write-entry.dto';
import { QueryLedgerDto } from '../dto/query-ledger.dto';
import { RaftConsensusService } from './raft-consensus.service';
import { MerkleTreeService } from './merkle-tree.service';
import { sha256 } from '@noble/hashes/sha256';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);
  private previousHash = '0'.repeat(64);

  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
    @InjectRepository(ReconciliationReport)
    private readonly reconciliationRepository: Repository<ReconciliationReport>,
    private readonly raftService: RaftConsensusService,
    private readonly merkleService: MerkleTreeService,
  ) {}

  /**
   * Write entry to distributed ledger
   */
  async writeEntry(dto: WriteEntryDto): Promise<LedgerEntry> {
    const entryId = uuidv4();
    const timestamp = Date.now();
    const entryData = {
      entryId,
      timestamp,
      service: dto.service,
      operation: dto.operation,
      transactionId: dto.transactionId,
      data: dto.data,
    };

    // Get previous entry for hash chain
    const lastEntry = await this.ledgerRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    const previousHash = lastEntry?.previousHash || this.previousHash;

    // Create signature
    const signature = this.createSignature(entryData, previousHash);

    // Create ledger entry
    const ledgerEntry = this.ledgerRepository.create({
      entryId,
      timestamp,
      service: dto.service,
      operation: dto.operation,
      transactionId: dto.transactionId,
      data: dto.data,
      signature,
      previousHash,
    });

    // Propose to Raft consensus
    const consensusResult = await this.raftService.proposeEntry(entryData);
    
    if (!consensusResult && dto.consistencyLevel === 'strong') {
      throw new Error('Failed to achieve consensus for entry');
    }

    // Save to database
    const savedEntry = await this.ledgerRepository.save(ledgerEntry);

    // Generate Merkle proof
    const recentEntries = await this.getRecentEntries(100);
    const entryIndex = recentEntries.findIndex(e => e.entryId === entryId);
    if (entryIndex >= 0) {
      const proof = this.merkleService.generateProof(
        recentEntries.map(e => JSON.stringify(e.data)),
        entryIndex,
      );
      savedEntry.merkleProof = this.merkleService.serializeProof(proof);
      await this.ledgerRepository.save(savedEntry);
    }

    this.logger.log(`Written entry ${entryId} to ledger`);
    return savedEntry;
  }

  /**
   * Get entry by ID
   */
  async getEntryById(entryId: string): Promise<LedgerEntry> {
    const entry = await this.ledgerRepository.findOne({ where: { entryId } });
    if (!entry) {
      throw new NotFoundException(`Entry ${entryId} not found`);
    }
    return entry;
  }

  /**
   * Get all entries for a transaction
   */
  async getTransactionEntries(transactionId: string): Promise<LedgerEntry[]> {
    return this.ledgerRepository.find({
      where: { transactionId },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * Query ledger with filters
   */
  async queryLedger(dto: QueryLedgerDto): Promise<{ entries: LedgerEntry[]; total: number }> {
    const queryBuilder = this.ledgerRepository.createQueryBuilder('entry');

    if (dto.transactionId) {
      queryBuilder.andWhere('entry.transactionId = :transactionId', { transactionId: dto.transactionId });
    }

    if (dto.service) {
      queryBuilder.andWhere('entry.service = :service', { service: dto.service });
    }

    if (dto.startTime) {
      queryBuilder.andWhere('entry.timestamp >= :startTime', { startTime: new Date(dto.startTime).getTime() });
    }

    if (dto.endTime) {
      queryBuilder.andWhere('entry.timestamp <= :endTime', { endTime: new Date(dto.endTime).getTime() });
    }

    const total = await queryBuilder.getCount();

    queryBuilder.orderBy('entry.timestamp', 'DESC');

    if (dto.limit) {
      queryBuilder.limit(dto.limit);
    }

    if (dto.offset) {
      queryBuilder.offset(dto.offset);
    }

    const entries = await queryBuilder.getMany();

    return { entries, total };
  }

  /**
   * Verify entry integrity
   */
  async verifyEntry(entryId: string): Promise<boolean> {
    const entry = await this.getEntryById(entryId);
    
    // Verify signature
    const expectedSignature = this.createSignature(
      {
        entryId: entry.entryId,
        timestamp: entry.timestamp,
        service: entry.service,
        operation: entry.operation,
        transactionId: entry.transactionId,
        data: entry.data,
      },
      entry.previousHash,
    );

    if (entry.signature !== expectedSignature) {
      this.logger.warn(`Signature verification failed for entry ${entryId}`);
      return false;
    }

    // Verify hash chain
    if (entry.previousHash !== this.previousHash) {
      const previousEntry = await this.ledgerRepository.findOne({
        where: {},
        order: { createdAt: 'DESC' },
      });

      if (previousEntry && entry.previousHash !== this.calculateHash(previousEntry)) {
        this.logger.warn(`Hash chain verification failed for entry ${entryId}`);
        return false;
      }
    }

    // Verify Merkle proof if available
    if (entry.merkleProof) {
      const recentEntries = await this.getRecentEntries(100);
      const entryIndex = recentEntries.findIndex(e => e.entryId === entryId);
      
      if (entryIndex >= 0) {
        const proof = this.merkleService.deserializeProof(entry.merkleProof);
        const rootHash = this.merkleService.getRootHash(
          recentEntries.map(e => JSON.stringify(e.data)),
        );
        const leafHash = this.calculateHash(entry);
        
        if (!this.merkleService.verifyProof(leafHash, proof, rootHash)) {
          this.logger.warn(`Merkle proof verification failed for entry ${entryId}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get recent entries for Merkle tree
   */
  private async getRecentEntries(count: number): Promise<LedgerEntry[]> {
    return this.ledgerRepository.find({
      order: { createdAt: 'DESC' },
      take: count,
    });
  }

  /**
   * Create signature for entry
   */
  private createSignature(data: any, previousHash: string): string {
    const serialized = JSON.stringify(data) + previousHash;
    const hash = sha256(serialized);
    return Buffer.from(hash).toString('hex');
  }

  /**
   * Calculate hash of entry
   */
  private calculateHash(entry: LedgerEntry): string {
    const serialized = JSON.stringify({
      entryId: entry.entryId,
      timestamp: entry.timestamp,
      service: entry.service,
      operation: entry.operation,
      transactionId: entry.transactionId,
      data: entry.data,
    });
    const hash = sha256(serialized);
    return Buffer.from(hash).toString('hex');
  }

  /**
   * Get ledger statistics
   */
  async getStatistics() {
    const totalEntries = await this.ledgerRepository.count();
    const entriesByService = await this.ledgerRepository
      .createQueryBuilder('entry')
      .select('entry.service', 'service')
      .addSelect('COUNT(*)', 'count')
      .groupBy('entry.service')
      .getRawMany();

    const lastEntry = await this.ledgerRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    return {
      totalEntries,
      entriesByService,
      lastEntryTimestamp: lastEntry?.timestamp || null,
      lastEntryId: lastEntry?.entryId || null,
    };
  }

  /**
   * Get ledger health
   */
  async getHealth() {
    const raftHealth = this.raftService.getClusterHealth();
    const stats = await this.getStatistics();
    const recentEntry = await this.ledgerRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!raftHealth.consensusReached) {
      status = 'degraded';
    }
    
    if (raftHealth.nodes < 2) {
      status = 'degraded';
    }

    if (!recentEntry && stats.totalEntries > 0) {
      status = 'unhealthy';
    }

    return {
      status,
      nodes: raftHealth.nodes,
      leader: raftHealth.leader,
      lastCommitIndex: raftHealth.commitIndex,
      consensusReached: raftHealth.consensusReached,
      storageSize: stats.totalEntries,
      lastEntryTimestamp: stats.lastEntryTimestamp,
    };
  }

  /**
   * Batch write entries
   */
  async batchWriteEntries(dtos: WriteEntryDto[]): Promise<LedgerEntry[]> {
    const entries: LedgerEntry[] = [];
    
    for (const dto of dtos) {
      try {
        const entry = await this.writeEntry(dto);
        entries.push(entry);
      } catch (error) {
        this.logger.error(`Failed to write entry in batch: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }

    return entries;
  }
}
