import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import {
  LedgerClientOptions,
  WriteEntryOptions,
  QueryOptions,
  LedgerEntry,
  LedgerHealth,
} from '../interfaces/ledger-client.interface';

@Injectable()
export class LedgerClientService {
  private readonly logger = new Logger(LedgerClientService.name);
  private readonly options: LedgerClientOptions;

  constructor(private readonly httpService: HttpService) {
    this.options = {
      baseUrl: process.env.LEDGER_SERVICE_URL || 'http://localhost:4000',
      timeout: 10000,
      retryAttempts: 3,
      consistencyLevel: 'eventual',
    };
  }

  /**
   * Write entry to ledger with retry logic
   */
  async writeEntry(options: WriteEntryOptions): Promise<LedgerEntry> {
    const payload = {
      service: options.service,
      operation: options.operation,
      transactionId: options.transactionId,
      data: options.data,
      consistencyLevel: options.consistencyLevel || this.options.consistencyLevel,
    };

    return this.withRetry(async () => {
      const response = await firstValueFrom(
        this.httpService.post(`${this.options.baseUrl}/api/ledger/write`, payload, {
          timeout: this.options.timeout,
        }),
      );
      return response.data as LedgerEntry;
    });
  }

  /**
   * Batch write entries to ledger
   */
  async batchWriteEntries(options: WriteEntryOptions[]): Promise<LedgerEntry[]> {
    return this.withRetry(async () => {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.options.baseUrl}/api/ledger/write/batch`,
          options,
          {
            timeout: this.options.timeout * options.length,
          },
        ),
      );
      return response.data as LedgerEntry[];
    });
  }

  /**
   * Get entry by ID
   */
  async getEntryById(entryId: string): Promise<LedgerEntry> {
    return this.withRetry(async () => {
      const response = await firstValueFrom(
        this.httpService.get(`${this.options.baseUrl}/api/ledger/${entryId}`, {
          timeout: this.options.timeout,
        }),
      );
      return response.data as LedgerEntry;
    });
  }

  /**
   * Get all entries for a transaction
   */
  async getTransactionEntries(transactionId: string): Promise<LedgerEntry[]> {
    return this.withRetry(async () => {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.options.baseUrl}/api/ledger/transactions/${transactionId}`,
          {
            timeout: this.options.timeout,
          },
        ),
      );
      return response.data as LedgerEntry[];
    });
  }

  /**
   * Query ledger with filters
   */
  async queryLedger(options: QueryOptions): Promise<{ entries: LedgerEntry[]; total: number }> {
    const params = new URLSearchParams();
    
    if (options.transactionId) params.append('transactionId', options.transactionId);
    if (options.service) params.append('service', options.service);
    if (options.startTime) params.append('startTime', options.startTime);
    if (options.endTime) params.append('endTime', options.endTime);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    return this.withRetry(async () => {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.options.baseUrl}/api/ledger/query?${params.toString()}`,
          {
            timeout: this.options.timeout,
          },
        ),
      );
      return response.data as { entries: LedgerEntry[]; total: number };
    });
  }

  /**
   * Verify entry integrity
   */
  async verifyEntry(entryId: string): Promise<boolean> {
    return this.withRetry(async () => {
      const response = await firstValueFrom(
        this.httpService.get(`${this.options.baseUrl}/api/ledger/${entryId}/verify`, {
          timeout: this.options.timeout,
        }),
      );
      return (response.data as { valid: boolean }).valid;
    });
  }

  /**
   * Get ledger health
   */
  async getHealth(): Promise<LedgerHealth> {
    return this.withRetry(async () => {
      const response = await firstValueFrom(
        this.httpService.get(`${this.options.baseUrl}/api/ledger/health`, {
          timeout: this.options.timeout,
        }),
      );
      return response.data as LedgerHealth;
    });
  }

  /**
   * Get ledger statistics
   */
  async getStatistics(): Promise<any> {
    return this.withRetry(async () => {
      const response = await firstValueFrom(
        this.httpService.get(`${this.options.baseUrl}/api/ledger/statistics`, {
          timeout: this.options.timeout,
        }),
      );
      return response.data as any;
    });
  }

  /**
   * Execute operation with retry logic
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    const maxAttempts = this.options.retryAttempts || 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          this.logger.error(`Operation failed after ${maxAttempts} attempts: ${lastError.message}`);
          throw lastError;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if ledger is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return health.status === 'healthy';
    } catch (error) {
      this.logger.error(`Health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Write entry with idempotency check
   */
  async writeEntryIdempotent(options: WriteEntryOptions): Promise<LedgerEntry> {
    // First check if entry already exists
    try {
      const existingEntries = await this.getTransactionEntries(options.transactionId);
      const existingEntry = existingEntries.find(
        entry =>
          entry.service === options.service &&
          entry.operation === options.operation,
      );

      if (existingEntry) {
        this.logger.log(`Entry already exists for transaction ${options.transactionId}`);
        return existingEntry;
      }
    } catch (error) {
      // Entry doesn't exist, proceed with write
      this.logger.debug(`No existing entry found, proceeding with write`);
    }

    return this.writeEntry(options);
  }

  /**
   * Async write with callback
   */
  async writeEntryAsync(
    options: WriteEntryOptions,
    callback?: (error: Error | null, result?: LedgerEntry) => void,
  ): Promise<void> {
    this.writeEntry(options)
      .then(result => callback?.(null, result))
      .catch(error => callback?.(error));
  }
}
