export interface LedgerClientOptions {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  consistencyLevel?: 'strong' | 'eventual';
}

export interface WriteEntryOptions {
  service: string;
  operation: string;
  transactionId: string;
  data: Record<string, any>;
  consistencyLevel?: 'strong' | 'eventual';
}

export interface QueryOptions {
  transactionId?: string;
  service?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

export interface LedgerEntry {
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
}

export interface LedgerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  nodes: number;
  leader: string;
  lastCommitIndex: number;
  consensusReached: boolean;
  storageSize: number;
}
