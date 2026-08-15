import { Injectable, Logger } from '@nestjs/common';
import { gcm } from '@noble/ciphers/webcrypto';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { randomBytes as cryptoRandomBytes } from 'crypto';
import {
  EncryptedData,
  EncryptionResult,
  DecryptionResult,
  EncryptionAlgorithm,
  KeyDerivationAlgorithm,
} from '../interfaces/encryption.interface';

@Injectable()
export class QuantumEncryptionService {
  private readonly logger = new Logger(QuantumEncryptionService.name);

  async encrypt(
    plaintext: Uint8Array,
    key: Uint8Array,
    algorithm: EncryptionAlgorithm = EncryptionAlgorithm.AES_256_GCM,
  ): Promise<EncryptionResult> {
    const startTime = Date.now();
    
    try {
      let encryptedData: EncryptedData;
      
      switch (algorithm) {
        case EncryptionAlgorithm.AES_256_GCM:
          encryptedData = await this.encryptAES256GCM(plaintext, key);
          break;
        default:
          throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
      }
      
      const duration = Date.now() - startTime;
      this.logger.log(`Encryption completed in ${duration}ms using ${algorithm}`);
      
      return { encryptedData };
    } catch (error: any) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw error;
    }
  }

  async decrypt(
    encryptedData: EncryptedData,
    key: Uint8Array,
  ): Promise<DecryptionResult> {
    const startTime = Date.now();
    
    try {
      let plaintext: Uint8Array;
      
      switch (encryptedData.algorithm) {
        case EncryptionAlgorithm.AES_256_GCM:
          plaintext = await this.decryptAES256GCM(encryptedData, key);
          break;
        default:
          throw new Error(`Unsupported encryption algorithm: ${encryptedData.algorithm}`);
      }
      
      const duration = Date.now() - startTime;
      this.logger.log(`Decryption completed in ${duration}ms using ${encryptedData.algorithm}`);
      
      return { plaintext, algorithm: encryptedData.algorithm };
    } catch (error: any) {
      this.logger.error(`Decryption failed: ${error.message}`);
      throw error;
    }
  }

  async deriveKey(
    inputKey: Uint8Array,
    salt?: Uint8Array,
    info?: string,
    algorithm: KeyDerivationAlgorithm = KeyDerivationAlgorithm.HKDF_SHA256,
    keyLength: number = 32,
  ): Promise<Uint8Array> {
    const startTime = Date.now();
    
    try {
      let derivedKey: Uint8Array;
      const saltBytes = salt || cryptoRandomBytes(16);
      const infoBytes = info ? new TextEncoder().encode(info) : new Uint8Array(0);
      
      switch (algorithm) {
        case KeyDerivationAlgorithm.HKDF_SHA256:
          derivedKey = hkdf(sha256, inputKey, saltBytes, infoBytes, keyLength);
          break;
        case KeyDerivationAlgorithm.HKDF_SHA512:
          derivedKey = hkdf(sha512, inputKey, saltBytes, infoBytes, keyLength);
          break;
        default:
          throw new Error(`Unsupported key derivation algorithm: ${algorithm}`);
      }
      
      const duration = Date.now() - startTime;
      this.logger.log(`Key derivation completed in ${duration}ms using ${algorithm}`);
      
      return derivedKey;
    } catch (error: any) {
      this.logger.error(`Key derivation failed: ${error.message}`);
      throw error;
    }
  }

  async encryptWithPQCKey(
    plaintext: Uint8Array,
    pqSharedSecret: Uint8Array,
    algorithm: EncryptionAlgorithm = EncryptionAlgorithm.AES_256_GCM,
  ): Promise<EncryptionResult> {
    // Derive encryption key from PQC shared secret
    const encryptionKey = await this.deriveKey(
      pqSharedSecret,
      undefined,
      'encryption',
      KeyDerivationAlgorithm.HKDF_SHA256,
      32,
    );
    
    return this.encrypt(plaintext, encryptionKey, algorithm);
  }

  async decryptWithPQCKey(
    encryptedData: EncryptedData,
    pqSharedSecret: Uint8Array,
  ): Promise<DecryptionResult> {
    // Derive decryption key from PQC shared secret
    const decryptionKey = await this.deriveKey(
      pqSharedSecret,
      encryptedData.keyDerivationInfo?.salt,
      'encryption',
      KeyDerivationAlgorithm.HKDF_SHA256,
      32,
    );
    
    return this.decrypt(encryptedData, decryptionKey);
  }

  private async encryptAES256GCM(
    plaintext: Uint8Array,
    key: Uint8Array,
  ): Promise<EncryptedData> {
    const nonce = cryptoRandomBytes(12); // 96-bit nonce for GCM
    const cipher = gcm(key, nonce);
    const ciphertext = await cipher.encrypt(plaintext);
    
    return {
      ciphertext,
      nonce,
      algorithm: EncryptionAlgorithm.AES_256_GCM,
      keyDerivationInfo: {
        algorithm: KeyDerivationAlgorithm.HKDF_SHA256,
      },
    };
  }

  private async decryptAES256GCM(
    encryptedData: EncryptedData,
    key: Uint8Array,
  ): Promise<Uint8Array> {
    const cipher = gcm(key, encryptedData.nonce);
    const plaintext = await cipher.decrypt(encryptedData.ciphertext);
    
    return plaintext;
  }

  generateRandomKey(length: number = 32): Uint8Array {
    return cryptoRandomBytes(length);
  }

  getSupportedAlgorithms(): EncryptionAlgorithm[] {
    return Object.values(EncryptionAlgorithm);
  }

  getSupportedKeyDerivationAlgorithms(): KeyDerivationAlgorithm[] {
    return Object.values(KeyDerivationAlgorithm);
  }
}
