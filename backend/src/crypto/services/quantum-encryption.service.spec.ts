import { Test, TestingModule } from '@nestjs/testing';
import { QuantumEncryptionService } from './quantum-encryption.service';
import { EncryptionAlgorithm, KeyDerivationAlgorithm } from '../interfaces/encryption.interface';

describe('QuantumEncryptionService', () => {
  let service: QuantumEncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuantumEncryptionService],
    }).compile();

    service = module.get<QuantumEncryptionService>(QuantumEncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const plaintext = new TextEncoder().encode('Test message');
      const key = service.generateRandomKey();

      const encrypted = await service.encrypt(plaintext, key, EncryptionAlgorithm.AES_256_GCM);
      const decrypted = await service.decrypt(encrypted.encryptedData, key);

      expect(decrypted.plaintext).toEqual(plaintext);
    });

    it('should produce different ciphertexts for the same plaintext', async () => {
      const plaintext = new TextEncoder().encode('Test message');
      const key = service.generateRandomKey();

      const encrypted1 = await service.encrypt(plaintext, key, EncryptionAlgorithm.AES_256_GCM);
      const encrypted2 = await service.encrypt(plaintext, key, EncryptionAlgorithm.AES_256_GCM);

      expect(encrypted1.encryptedData.ciphertext).not.toEqual(encrypted2.encryptedData.ciphertext);
      expect(encrypted1.encryptedData.nonce).not.toEqual(encrypted2.encryptedData.nonce);
    });

    it('should fail to decrypt with wrong key', async () => {
      const plaintext = new TextEncoder().encode('Test message');
      const key1 = service.generateRandomKey();
      const key2 = service.generateRandomKey();

      const encrypted = await service.encrypt(plaintext, key1, EncryptionAlgorithm.AES_256_GCM);

      await expect(service.decrypt(encrypted.encryptedData, key2)).rejects.toThrow();
    });

    it('should handle empty data', async () => {
      const plaintext = new Uint8Array(0);
      const key = service.generateRandomKey();

      const encrypted = await service.encrypt(plaintext, key, EncryptionAlgorithm.AES_256_GCM);
      const decrypted = await service.decrypt(encrypted.encryptedData, key);

      expect(decrypted.plaintext).toEqual(plaintext);
    });

    it('should handle large data', async () => {
      const plaintext = new Uint8Array(1024 * 1024); // 1MB
      crypto.getRandomValues(plaintext);
      const key = service.generateRandomKey();

      const encrypted = await service.encrypt(plaintext, key, EncryptionAlgorithm.AES_256_GCM);
      const decrypted = await service.decrypt(encrypted.encryptedData, key);

      expect(decrypted.plaintext).toEqual(plaintext);
    });
  });

  describe('deriveKey', () => {
    it('should derive a key from input material', async () => {
      const inputKey = service.generateRandomKey();
      const salt = service.generateRandomKey(16);

      const derivedKey = await service.deriveKey(
        inputKey,
        salt,
        'test',
        KeyDerivationAlgorithm.HKDF_SHA256,
        32,
      );

      expect(derivedKey).toBeInstanceOf(Uint8Array);
      expect(derivedKey.length).toBe(32);
    });

    it('should derive different keys with different salts', async () => {
      const inputKey = service.generateRandomKey();
      const salt1 = service.generateRandomKey(16);
      const salt2 = service.generateRandomKey(16);

      const derivedKey1 = await service.deriveKey(
        inputKey,
        salt1,
        'test',
        KeyDerivationAlgorithm.HKDF_SHA256,
        32,
      );
      const derivedKey2 = await service.deriveKey(
        inputKey,
        salt2,
        'test',
        KeyDerivationAlgorithm.HKDF_SHA256,
        32,
      );

      expect(derivedKey1).not.toEqual(derivedKey2);
    });

    it('should derive different keys with different info', async () => {
      const inputKey = service.generateRandomKey();
      const salt = service.generateRandomKey(16);

      const derivedKey1 = await service.deriveKey(
        inputKey,
        salt,
        'info1',
        KeyDerivationAlgorithm.HKDF_SHA256,
        32,
      );
      const derivedKey2 = await service.deriveKey(
        inputKey,
        salt,
        'info2',
        KeyDerivationAlgorithm.HKDF_SHA256,
        32,
      );

      expect(derivedKey1).not.toEqual(derivedKey2);
    });

    it('should derive the same key with same inputs', async () => {
      const inputKey = service.generateRandomKey();
      const salt = service.generateRandomKey(16);

      const derivedKey1 = await service.deriveKey(
        inputKey,
        salt,
        'test',
        KeyDerivationAlgorithm.HKDF_SHA256,
        32,
      );
      const derivedKey2 = await service.deriveKey(
        inputKey,
        salt,
        'test',
        KeyDerivationAlgorithm.HKDF_SHA256,
        32,
      );

      expect(derivedKey1).toEqual(derivedKey2);
    });
  });

  describe('encryptWithPQCKey and decryptWithPQCKey', () => {
    it('should encrypt and decrypt using PQC-derived key', async () => {
      const plaintext = new TextEncoder().encode('Test message');
      const pqSharedSecret = service.generateRandomKey(32);

      const encrypted = await service.encryptWithPQCKey(plaintext, pqSharedSecret);
      const decrypted = await service.decryptWithPQCKey(encrypted.encryptedData, pqSharedSecret);

      expect(decrypted.plaintext).toEqual(plaintext);
    });

    it('should produce different ciphertexts for same plaintext with PQC key', async () => {
      const plaintext = new TextEncoder().encode('Test message');
      const pqSharedSecret = service.generateRandomKey(32);

      const encrypted1 = await service.encryptWithPQCKey(plaintext, pqSharedSecret);
      const encrypted2 = await service.encryptWithPQCKey(plaintext, pqSharedSecret);

      expect(encrypted1.encryptedData.ciphertext).not.toEqual(encrypted2.encryptedData.ciphertext);
    });
  });

  describe('generateRandomKey', () => {
    it('should generate a random key of default length', () => {
      const key = service.generateRandomKey();

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });

    it('should generate a random key of specified length', () => {
      const key = service.generateRandomKey(64);

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(64);
    });

    it('should generate different keys on each call', () => {
      const key1 = service.generateRandomKey();
      const key2 = service.generateRandomKey();

      expect(key1).not.toEqual(key2);
    });
  });

  describe('getSupportedAlgorithms', () => {
    it('should return supported encryption algorithms', () => {
      const algorithms = service.getSupportedAlgorithms();

      expect(algorithms).toBeDefined();
      expect(Array.isArray(algorithms)).toBe(true);
      expect(algorithms.length).toBeGreaterThan(0);
      expect(algorithms).toContain(EncryptionAlgorithm.AES_256_GCM);
    });
  });

  describe('getSupportedKeyDerivationAlgorithms', () => {
    it('should return supported key derivation algorithms', () => {
      const algorithms = service.getSupportedKeyDerivationAlgorithms();

      expect(algorithms).toBeDefined();
      expect(Array.isArray(algorithms)).toBe(true);
      expect(algorithms.length).toBeGreaterThan(0);
      expect(algorithms).toContain(KeyDerivationAlgorithm.HKDF_SHA256);
    });
  });
});
