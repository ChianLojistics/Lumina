import { Injectable, Logger } from '@nestjs/common';
import { x25519 } from '@noble/curves/ed25519';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from 'crypto';
import {
  HybridKeyPair,
  HybridPrivateKey,
  HybridPublicKey,
  HybridSharedSecret,
  KeyEncapsulationResult,
  PQCAlgorithm,
} from '../interfaces/hybrid-key-exchange.interface';

@Injectable()
export class HybridKeyExchangeService {
  private readonly logger = new Logger(HybridKeyExchangeService.name);

  async generateKeyPair(): Promise<HybridKeyPair> {
    const startTime = Date.now();
    
    try {
      // Classical X25519 key pair
      const classicalPrivateKey = x25519.utils.randomPrivateKey();
      const classicalPublicKey = x25519.getPublicKey(classicalPrivateKey);
      
      // Post-quantum ML-KEM-1024 key pair
      const pqKeyPair = ml_kem1024.keygen();
      
      const duration = Date.now() - startTime;
      this.logger.log(`Hybrid key pair generated in ${duration}ms`);
      
      return {
        classical: {
          privateKey: classicalPrivateKey,
          publicKey: classicalPublicKey,
        },
        postQuantum: {
          privateKey: pqKeyPair.secretKey,
          publicKey: pqKeyPair.publicKey,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to generate hybrid key pair: ${error.message}`);
      throw error;
    }
  }

  async encapsulate(peerPublicKey: HybridPublicKey): Promise<KeyEncapsulationResult> {
    const startTime = Date.now();
    
    try {
      // Classical ECDH
      const ephemeralPrivateKey = randomBytes(32);
      const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);
      const classicalShared = x25519.getSharedSecret(ephemeralPrivateKey, peerPublicKey.classical);
      
      // Post-quantum KEM encapsulation
      const pqResult = ml_kem1024.encapsulate(peerPublicKey.postQuantum);
      
      // Combine secrets using HKDF
      const combined = this.combineSecrets(classicalShared, pqResult.sharedSecret);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Key encapsulation completed in ${duration}ms`);
      
      return {
        ciphertext: pqResult.cipherText,
        sharedSecret: combined,
      };
    } catch (error: any) {
      this.logger.error(`Failed to encapsulate: ${error.message}`);
      throw error;
    }
  }

  async decapsulate(
    privateKey: HybridPrivateKey,
    ciphertext: Uint8Array,
    peerPublicKey?: HybridPublicKey,
  ): Promise<HybridSharedSecret> {
    const startTime = Date.now();
    
    try {
      // Post-quantum KEM decapsulation
      const pqSharedSecret = ml_kem1024.decapsulate(ciphertext, privateKey.postQuantum);
      
      // Classical ECDH (if peer public key provided)
      let classicalShared: Uint8Array;
      if (peerPublicKey) {
        classicalShared = x25519.getSharedSecret(privateKey.classical, peerPublicKey.classical);
      } else {
        // If no peer public key, use zero as fallback (should not happen in normal flow)
        classicalShared = new Uint8Array(32);
      }
      
      // Combine secrets using HKDF
      const combined = this.combineSecrets(classicalShared, pqSharedSecret);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Key decapsulation completed in ${duration}ms`);
      
      return {
        classical: classicalShared,
        postQuantum: pqSharedSecret,
        combined,
      };
    } catch (error: any) {
      this.logger.error(`Failed to decapsulate: ${error.message}`);
      throw error;
    }
  }

  async deriveSharedSecret(
    privateKey: HybridPrivateKey,
    peerPublicKey: HybridPublicKey,
  ): Promise<HybridSharedSecret> {
    const startTime = Date.now();
    
    try {
      // Classical ECDH
      const classicalShared = x25519.getSharedSecret(privateKey.classical, peerPublicKey.classical);
      
      // Post-quantum KEM (encapsulate then decapsulate for shared secret)
      const pqEncapsulate = ml_kem1024.encapsulate(peerPublicKey.postQuantum);
      const pqSharedSecret = ml_kem1024.decapsulate(pqEncapsulate.cipherText, privateKey.postQuantum);
      
      // Combine secrets using HKDF
      const combined = this.combineSecrets(classicalShared, pqSharedSecret);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Shared secret derivation completed in ${duration}ms`);
      
      return {
        classical: classicalShared,
        postQuantum: pqSharedSecret,
        combined,
      };
    } catch (error: any) {
      this.logger.error(`Failed to derive shared secret: ${error.message}`);
      throw error;
    }
  }

  private combineSecrets(secret1: Uint8Array, secret2: Uint8Array): Uint8Array {
    // Use HKDF to combine the two secrets
    const combinedInput = new Uint8Array(secret1.length + secret2.length);
    combinedInput.set(secret1);
    combinedInput.set(secret2, secret1.length);
    
    // Derive a 32-byte key from the combined input
    return hkdf(sha256, combinedInput, '', '', 32);
  }

  getSupportedAlgorithms(): PQCAlgorithm[] {
    return [
      PQCAlgorithm.ML_KEM_512,
      PQCAlgorithm.ML_KEM_768,
      PQCAlgorithm.ML_KEM_1024,
      PQCAlgorithm.X25519,
    ];
  }

  async generateKeyPairWithAlgorithm(algorithm: PQCAlgorithm): Promise<HybridKeyPair> {
    switch (algorithm) {
      case PQCAlgorithm.ML_KEM_1024:
        return this.generateKeyPair();
      default:
        throw new Error(`Algorithm ${algorithm} not yet implemented for hybrid key exchange`);
    }
  }
}
