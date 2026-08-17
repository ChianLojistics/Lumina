import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ZKPProof } from '../entities/zkp-proof.entity';

@Injectable()
export class ZKPCacheService {
  private readonly logger = new Logger(ZKPCacheService.name);
  private readonly PROOF_CACHE_TTL = 3600; // 1 hour
  private readonly VERIFICATION_KEY_CACHE_TTL = 86400; // 24 hours
  private readonly WITNESS_CACHE_TTL = 1800; // 30 minutes

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  // Proof caching

  async cacheProof(transactionId: string, proof: any): Promise<void> {
    const cacheKey = `proof:${transactionId}`;
    await this.cacheManager.set(cacheKey, proof, { ttl: this.PROOF_CACHE_TTL });
    this.logger.debug(`Cached proof for transaction: ${transactionId}`);
  }

  async getCachedProof(transactionId: string): Promise<any | null> {
    const cacheKey = `proof:${transactionId}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Retrieved cached proof for transaction: ${transactionId}`);
      return cached as any;
    }
    return null;
  }

  async invalidateProofCache(transactionId: string): Promise<void> {
    const cacheKey = `proof:${transactionId}`;
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Invalidated proof cache for transaction: ${transactionId}`);
  }

  // Verification key caching

  async cacheVerificationKey(circuitName: string, verificationKey: any): Promise<void> {
    const cacheKey = `vkey:${circuitName}`;
    await this.cacheManager.set(cacheKey, verificationKey, { 
      ttl: this.VERIFICATION_KEY_CACHE_TTL 
    });
    this.logger.debug(`Cached verification key for circuit: ${circuitName}`);
  }

  async getCachedVerificationKey(circuitName: string): Promise<any | null> {
    const cacheKey = `vkey:${circuitName}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Retrieved cached verification key for circuit: ${circuitName}`);
      return cached as any;
    }
    return null;
  }

  // Witness caching

  async cacheWitness(transactionId: string, witness: any): Promise<void> {
    const cacheKey = `witness:${transactionId}`;
    await this.cacheManager.set(cacheKey, witness, { ttl: this.WITNESS_CACHE_TTL });
    this.logger.debug(`Cached witness for transaction: ${transactionId}`);
  }

  async getCachedWitness(transactionId: string): Promise<any | null> {
    const cacheKey = `witness:${transactionId}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Retrieved cached witness for transaction: ${transactionId}`);
      return cached as any;
    }
    return null;
  }

  // Batch operations

  async cacheProofsBatch(proofs: Map<string, any>): Promise<void> {
    const promises = Array.from(proofs.entries()).map(([transactionId, proof]) =>
      this.cacheProof(transactionId, proof)
    );
    await Promise.all(promises);
    this.logger.debug(`Batch cached ${proofs.size} proofs`);
  }

  async getProofsBatch(transactionIds: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const promises = transactionIds.map(async (transactionId) => {
      const proof = await this.getCachedProof(transactionId);
      if (proof) {
        results.set(transactionId, proof);
      }
    });
    await Promise.all(promises);
    return results;
  }

  // Cache statistics

  async getCacheStats(): Promise<{
    proofCacheSize: number;
    verificationKeyCacheSize: number;
    witnessCacheSize: number;
  }> {
    // Simplified cache stats - in production, this would use Redis INFO command
    return {
      proofCacheSize: 0,
      verificationKeyCacheSize: 0,
      witnessCacheSize: 0,
    };
  }

  // Cache warming

  async warmCache(transactionIds: string[]): Promise<void> {
    this.logger.log(`Warming cache for ${transactionIds.length} transactions`);
    // In production, this would pre-load frequently accessed proofs
    const warmed = await this.getProofsBatch(transactionIds);
    this.logger.log(`Cache warming complete: ${warmed.size} proofs loaded`);
  }

  // Performance optimization helpers

  async getOptimalBatchSize(): Promise<number> {
    // Determine optimal batch size based on system performance
    // In production, this would be based on benchmarking
    return 100;
  }

  async shouldUseCache(transactionId: string): Promise<boolean> {
    // Determine if caching is beneficial for this transaction
    // In production, this would consider access patterns
    return true;
  }

  // Cache invalidation

  async clearAllProofCache(): Promise<void> {
    this.logger.warn('Clearing all proof cache');
    // In production, this would use Redis FLUSHDB or pattern-based deletion
    const keys = await this.getCacheKeys('proof:*');
    await Promise.all(keys.map(key => this.cacheManager.del(key)));
  }

  async clearCircuitCache(circuitName: string): Promise<void> {
    this.logger.debug(`Clearing cache for circuit: ${circuitName}`);
    await this.cacheManager.del(`vkey:${circuitName}`);
  }

  private async getCacheKeys(pattern: string): Promise<string[]> {
    // In production with Redis, this would use KEYS command
    // For now, return empty array
    return [];
  }
}
