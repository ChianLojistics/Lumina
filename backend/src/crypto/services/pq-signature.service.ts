import { Injectable, Logger } from '@nestjs/common';
import { ed25519 } from '@noble/curves/ed25519';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { randomBytes } from 'crypto';
import {
  PQKeyPair,
  PQSignature,
  HybridSignature,
  ClassicalKeyPair,
  SignatureVerificationResult,
} from '../interfaces/signature.interface';

@Injectable()
export class PQSignatureService {
  private readonly logger = new Logger(PQSignatureService.name);

  async generatePQKeypair(): Promise<PQKeyPair> {
    const startTime = Date.now();
    
    try {
      // Generate ML-DSA-65 (Dilithium5 equivalent) key pair
      const keyPair = ml_dsa65.keygen();
      
      const duration = Date.now() - startTime;
      this.logger.log(`ML-DSA-65 key pair generated in ${duration}ms`);
      
      return {
        privateKey: keyPair.secretKey,
        publicKey: keyPair.publicKey,
      };
    } catch (error: any) {
      this.logger.error(`Failed to generate ML-DSA key pair: ${error.message}`);
      throw error;
    }
  }

  async generateClassicalKeypair(): Promise<ClassicalKeyPair> {
    const startTime = Date.now();
    
    try {
      // Generate Ed25519 key pair
      const privateKey = randomBytes(32);
      const publicKey = ed25519.getPublicKey(privateKey);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Ed25519 key pair generated in ${duration}ms`);
      
      return {
        privateKey,
        publicKey,
      };
    } catch (error: any) {
      this.logger.error(`Failed to generate Ed25519 key pair: ${error.message}`);
      throw error;
    }
  }

  async sign(message: Uint8Array, privateKey: Uint8Array): Promise<PQSignature> {
    const startTime = Date.now();
    
    try {
      const signature = ml_dsa65.sign(message, privateKey);
      
      const duration = Date.now() - startTime;
      this.logger.log(`ML-DSA-65 signature created in ${duration}ms`);
      
      return {
        signature,
        algorithm: 'ML-DSA-65',
      };
    } catch (error: any) {
      this.logger.error(`Failed to create ML-DSA signature: ${error.message}`);
      throw error;
    }
  }

  async verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array,
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const isValid = ml_dsa65.verify(signature, message, publicKey);
      
      const duration = Date.now() - startTime;
      this.logger.log(`ML-DSA-65 verification completed in ${duration}ms, valid: ${isValid}`);
      
      return isValid;
    } catch (error: any) {
      this.logger.error(`Failed to verify ML-DSA signature: ${error.message}`);
      return false;
    }
  }

  async classicalSign(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    const startTime = Date.now();
    
    try {
      const signature = ed25519.sign(message, privateKey);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Ed25519 signature created in ${duration}ms`);
      
      return signature;
    } catch (error: any) {
      this.logger.error(`Failed to create Ed25519 signature: ${error.message}`);
      throw error;
    }
  }

  async classicalVerify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array,
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const isValid = ed25519.verify(signature, message, publicKey);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Ed25519 verification completed in ${duration}ms, valid: ${isValid}`);
      
      return isValid;
    } catch (error: any) {
      this.logger.error(`Failed to verify Ed25519 signature: ${error.message}`);
      return false;
    }
  }

  async hybridSign(
    message: Uint8Array,
    classicalKey: ClassicalKeyPair,
    pqKey: PQKeyPair,
  ): Promise<HybridSignature> {
    const startTime = Date.now();
    
    try {
      // Sign with both classical and post-quantum algorithms
      const classicalSig = await this.classicalSign(message, classicalKey.privateKey);
      const pqSig = await this.sign(message, pqKey.privateKey);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Hybrid signature created in ${duration}ms`);
      
      return {
        classical: classicalSig,
        postQuantum: pqSig.signature,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create hybrid signature: ${error.message}`);
      throw error;
    }
  }

  async hybridVerify(
    message: Uint8Array,
    signature: HybridSignature,
    classicalKey: ClassicalKeyPair,
    pqKey: PQKeyPair,
  ): Promise<SignatureVerificationResult> {
    const startTime = Date.now();
    
    try {
      // Verify both signatures
      const classicalValid = await this.classicalVerify(
        message,
        signature.classical,
        classicalKey.publicKey,
      );
      const pqValid = await this.verify(message, signature.postQuantum, pqKey.publicKey);
      
      const duration = Date.now() - startTime;
      this.logger.log(
        `Hybrid verification completed in ${duration}ms, classical: ${classicalValid}, PQ: ${pqValid}`,
      );
      
      return {
        valid: classicalValid && pqValid,
        classicalValid,
        postQuantumValid: pqValid,
      };
    } catch (error: any) {
      this.logger.error(`Failed to verify hybrid signature: ${error.message}`);
      return {
        valid: false,
        classicalValid: false,
        postQuantumValid: false,
      };
    }
  }

  async signWithFallback(
    message: Uint8Array,
    classicalKey: ClassicalKeyPair,
    pqKey?: PQKeyPair,
  ): Promise<HybridSignature> {
    try {
      if (pqKey) {
        return await this.hybridSign(message, classicalKey, pqKey);
      } else {
        // Fallback to classical only
        const classicalSig = await this.classicalSign(message, classicalKey.privateKey);
        return {
          classical: classicalSig,
          postQuantum: new Uint8Array(0),
        };
      }
    } catch (error: any) {
      this.logger.error(`Fallback signing failed: ${error.message}`);
      throw error;
    }
  }

  async verifyWithFallback(
    message: Uint8Array,
    signature: HybridSignature,
    classicalKey: ClassicalKeyPair,
    pqKey?: PQKeyPair,
  ): Promise<SignatureVerificationResult> {
    try {
      const classicalValid = await this.classicalVerify(
        message,
        signature.classical,
        classicalKey.publicKey,
      );
      
      if (pqKey && signature.postQuantum.length > 0) {
        const pqValid = await this.verify(message, signature.postQuantum, pqKey.publicKey);
        return {
          valid: classicalValid && pqValid,
          classicalValid,
          postQuantumValid: pqValid,
        };
      } else {
        // Classical only verification
        return {
          valid: classicalValid,
          classicalValid,
          postQuantumValid: true, // Consider PQ valid if not provided
        };
      }
    } catch (error: any) {
      this.logger.error(`Fallback verification failed: ${error.message}`);
      return {
        valid: false,
        classicalValid: false,
        postQuantumValid: false,
      };
    }
  }
}
