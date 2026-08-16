import { LedgerEntry } from '../entities/ledger-entry.entity';

export class LedgerResponseDto {
  entryId: string;
  timestamp: number;
  service: string;
  operation: string;
  transactionId: string;
  data: Record<string, any>;
  signature: string;
  previousHash: string;
  merkleProof: string;
  createdAt: Date;

  constructor(entry: LedgerEntry) {
    this.entryId = entry.entryId;
    this.timestamp = entry.timestamp;
    this.service = entry.service;
    this.operation = entry.operation;
    this.transactionId = entry.transactionId;
    this.data = entry.data;
    this.signature = entry.signature;
    this.previousHash = entry.previousHash;
    this.merkleProof = entry.merkleProof;
    this.createdAt = entry.createdAt;
  }
}

export class LedgerHealthResponseDto {
  status: 'healthy' | 'degraded' | 'unhealthy';
  nodes: number;
  leader: string;
  lastCommitIndex: number;
  consensusReached: boolean;
  storageSize: number;
}
