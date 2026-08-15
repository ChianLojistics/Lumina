import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, randomBytes } from 'crypto';
import { HybridKeyExchangeService } from './hybrid-key-exchange.service';
import { PQSignatureService } from './pq-signature.service';
import {
  PQKeyMetadata,
  StoredKeyPair,
  KeyRotationResult,
  KeyGenerationOptions,
} from '../interfaces/key-management.interface';
import { PQCAlgorithm } from '../interfaces/hybrid-key-exchange.interface';

// In-memory storage for development (replace with database in production)
const keyStorage = new Map<string, StoredKeyPair>();
const privateKeysStorage = new Map<string, Uint8Array>(); // Simulates HSM

@Injectable()
export class PQKeyManagementService {
  private readonly logger = new Logger(PQKeyManagementService.name);
  private readonly DEFAULT_KEY_TTL_DAYS = 365;

  constructor(
    private readonly hybridKeyExchangeService: HybridKeyExchangeService,
    private readonly pqSignatureService: PQSignatureService,
  ) {}

  async generateKey(options: KeyGenerationOptions): Promise<StoredKeyPair> {
    const startTime = Date.now();
    
    try {
      const keyId = randomUUID();
      const expiresAt = options.expiresAt || this.calculateExpiry(options.algorithm);
      
      let publicKey: Uint8Array;
      let privateKey: Uint8Array;
      
      switch (options.algorithm) {
        case PQCAlgorithm.ML_KEM_1024:
        case PQCAlgorithm.ML_KEM_768:
        case PQCAlgorithm.ML_KEM_512:
          if (options.keyType !== 'key-exchange') {
            throw new Error(`Algorithm ${options.algorithm} is for key-exchange only`);
          }
          const hybridKeyPair = await this.hybridKeyExchangeService.generateKeyPair();
          publicKey = hybridKeyPair.postQuantum.publicKey;
          privateKey = hybridKeyPair.postQuantum.privateKey;
          break;
          
        case PQCAlgorithm.ML_DSA_65:
        case PQCAlgorithm.ML_DSA_87:
        case PQCAlgorithm.ML_DSA_44:
          if (options.keyType !== 'signature') {
            throw new Error(`Algorithm ${options.algorithm} is for signatures only`);
          }
          const pqKeyPair = await this.pqSignatureService.generatePQKeypair();
          publicKey = pqKeyPair.publicKey;
          privateKey = pqKeyPair.privateKey;
          break;
          
        case PQCAlgorithm.X25519:
          if (options.keyType !== 'key-exchange') {
            throw new Error(`Algorithm ${options.algorithm} is for key-exchange only`);
          }
          const x25519KeyPair = await this.pqSignatureService.generateClassicalKeypair();
          publicKey = x25519KeyPair.publicKey;
          privateKey = x25519KeyPair.privateKey;
          break;
          
        case PQCAlgorithm.ED25519:
          if (options.keyType !== 'signature') {
            throw new Error(`Algorithm ${options.algorithm} is for signatures only`);
          }
          const edKeyPair = await this.pqSignatureService.generateClassicalKeypair();
          publicKey = edKeyPair.publicKey;
          privateKey = edKeyPair.privateKey;
          break;
          
        default:
          throw new Error(`Unsupported algorithm: ${options.algorithm}`);
      }
      
      const metadata: PQKeyMetadata = {
        id: keyId,
        algorithm: options.algorithm,
        strength: options.strength || this.getAlgorithmStrength(options.algorithm),
        keyType: options.keyType,
        createdAt: new Date(),
        expiresAt,
        status: 'active',
        userId: options.userId,
        version: 1,
      };
      
      // Store private key securely (simulating HSM)
      await this.storePrivateKey(keyId, privateKey);
      
      // Store public key and metadata
      const storedKeyPair: StoredKeyPair = {
        id: keyId,
        publicKey,
        metadata,
      };
      
      keyStorage.set(keyId, storedKeyPair);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Key generated for ${options.algorithm} in ${duration}ms`);
      
      return storedKeyPair;
    } catch (error: any) {
      this.logger.error(`Failed to generate key: ${error.message}`);
      throw error;
    }
  }

  async getKey(keyId: string): Promise<StoredKeyPair | null> {
    const storedKey = keyStorage.get(keyId);
    
    if (!storedKey) {
      return null;
    }
    
    // Check if key is expired
    if (storedKey.metadata.expiresAt < new Date()) {
      storedKey.metadata.status = 'deprecated';
      keyStorage.set(keyId, storedKey);
    }
    
    return storedKey;
  }

  async getPrivateKey(keyId: string): Promise<Uint8Array | null> {
    return privateKeysStorage.get(keyId) || null;
  }

  async listKeys(userId?: string, keyType?: string): Promise<StoredKeyPair[]> {
    const allKeys = Array.from(keyStorage.values());
    
    return allKeys.filter((key) => {
      if (userId && key.metadata.userId !== userId) {
        return false;
      }
      if (keyType && key.metadata.keyType !== keyType) {
        return false;
      }
      return true;
    });
  }

  async rotateKey(oldKeyId: string): Promise<KeyRotationResult> {
    const startTime = Date.now();
    
    try {
      const oldKey = await this.getKey(oldKeyId);
      
      if (!oldKey) {
        throw new Error(`Key not found: ${oldKeyId}`);
      }
      
      // Mark old key as deprecated
      oldKey.metadata.status = 'deprecated';
      keyStorage.set(oldKeyId, oldKey);
      
      // Generate new key with same algorithm
      const newKey = await this.generateKey({
        algorithm: oldKey.metadata.algorithm,
        strength: oldKey.metadata.strength,
        keyType: oldKey.metadata.keyType,
        userId: oldKey.metadata.userId,
        expiresAt: this.calculateExpiry(oldKey.metadata.algorithm),
      });
      
      // Set parent relationship for tracking
      newKey.metadata.parentId = oldKeyId;
      newKey.metadata.version = oldKey.metadata.version + 1;
      keyStorage.set(newKey.id, newKey);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Key rotated from ${oldKeyId} to ${newKey.id} in ${duration}ms`);
      
      return {
        oldKeyId,
        newKeyId: newKey.id,
        rotatedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to rotate key: ${error.message}`);
      throw error;
    }
  }

  async revokeKey(keyId: string): Promise<void> {
    const key = await this.getKey(keyId);
    
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }
    
    key.metadata.status = 'revoked';
    keyStorage.set(keyId, key);
    
    // Remove private key from storage
    privateKeysStorage.delete(keyId);
    
    this.logger.log(`Key ${keyId} revoked`);
  }

  async deleteKey(keyId: string): Promise<void> {
    const key = await this.getKey(keyId);
    
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }
    
    if (key.metadata.status === 'active') {
      throw new Error(`Cannot delete active key. Revoke it first.`);
    }
    
    keyStorage.delete(keyId);
    privateKeysStorage.delete(keyId);
    
    this.logger.log(`Key ${keyId} deleted`);
  }

  async cleanupExpiredKeys(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [keyId, key] of keyStorage.entries()) {
      if (key.metadata.expiresAt < now && key.metadata.status === 'deprecated') {
        // Only delete if deprecated for more than 30 days
        const deprecatedDays = (now.getTime() - key.metadata.expiresAt.getTime()) / (1000 * 60 * 60 * 24);
        if (deprecatedDays > 30) {
          keyStorage.delete(keyId);
          privateKeysStorage.delete(keyId);
          cleanedCount++;
        }
      }
    }
    
    this.logger.log(`Cleaned up ${cleanedCount} expired keys`);
    return cleanedCount;
  }

  async getKeyMetadata(keyId: string): Promise<PQKeyMetadata | null> {
    const key = await this.getKey(keyId);
    return key ? key.metadata : null;
  }

  async updateKeyMetadata(keyId: string, updates: Partial<PQKeyMetadata>): Promise<void> {
    const key = await this.getKey(keyId);
    
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }
    
    key.metadata = { ...key.metadata, ...updates };
    keyStorage.set(keyId, key);
    
    this.logger.log(`Key metadata updated for ${keyId}`);
  }

  private async storePrivateKey(keyId: string, privateKey: Uint8Array): Promise<void> {
    // In production, this would store in HSM or encrypted database
    privateKeysStorage.set(keyId, privateKey);
  }

  private calculateExpiry(algorithm: string): Date {
    const ttlDays = this.DEFAULT_KEY_TTL_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);
    return expiresAt;
  }

  private getAlgorithmStrength(algorithm: string): number {
    const strengths: Record<string, number> = {
      [PQCAlgorithm.ML_KEM_512]: 128,
      [PQCAlgorithm.ML_KEM_768]: 192,
      [PQCAlgorithm.ML_KEM_1024]: 256,
      [PQCAlgorithm.ML_DSA_44]: 128,
      [PQCAlgorithm.ML_DSA_65]: 192,
      [PQCAlgorithm.ML_DSA_87]: 256,
      [PQCAlgorithm.X25519]: 128,
      [PQCAlgorithm.ED25519]: 128,
    };
    
    return strengths[algorithm] || 128;
  }

  async getKeyStatistics(): Promise<{
    total: number;
    active: number;
    deprecated: number;
    revoked: number;
    byType: Record<string, number>;
    byAlgorithm: Record<string, number>;
  }> {
    const allKeys = Array.from(keyStorage.values());
    
    const stats = {
      total: allKeys.length,
      active: 0,
      deprecated: 0,
      revoked: 0,
      byType: {} as Record<string, number>,
      byAlgorithm: {} as Record<string, number>,
    };
    
    for (const key of allKeys) {
      // Count by status
      stats[key.metadata.status]++;
      
      // Count by type
      stats.byType[key.metadata.keyType] = (stats.byType[key.metadata.keyType] || 0) + 1;
      
      // Count by algorithm
      stats.byAlgorithm[key.metadata.algorithm] = (stats.byAlgorithm[key.metadata.algorithm] || 0) + 1;
    }
    
    return stats;
  }
}
