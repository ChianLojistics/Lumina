import { Test, TestingModule } from '@nestjs/testing';
import { PQSignatureService } from './pq-signature.service';

describe('PQSignatureService', () => {
  let service: PQSignatureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PQSignatureService],
    }).compile();

    service = module.get<PQSignatureService>(PQSignatureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePQKeypair', () => {
    it('should generate a post-quantum key pair', async () => {
      const keyPair = await service.generatePQKeypair();

      expect(keyPair).toBeDefined();
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey.length).toBeGreaterThan(0);
      expect(keyPair.publicKey.length).toBeGreaterThan(0);
    });

    it('should generate different key pairs on each call', async () => {
      const keyPair1 = await service.generatePQKeypair();
      const keyPair2 = await service.generatePQKeypair();

      expect(keyPair1.privateKey).not.toEqual(keyPair2.privateKey);
      expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey);
    });
  });

  describe('generateClassicalKeypair', () => {
    it('should generate a classical Ed25519 key pair', async () => {
      const keyPair = await service.generateClassicalKeypair();

      expect(keyPair).toBeDefined();
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey.length).toBe(32);
      expect(keyPair.publicKey.length).toBe(32);
    });

    it('should generate different key pairs on each call', async () => {
      const keyPair1 = await service.generateClassicalKeypair();
      const keyPair2 = await service.generateClassicalKeypair();

      expect(keyPair1.privateKey).not.toEqual(keyPair2.privateKey);
      expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey);
    });
  });

  describe('sign and verify', () => {
    it('should sign and verify a message correctly', async () => {
      const keyPair = await service.generatePQKeypair();
      const message = new TextEncoder().encode('Test message');

      const signature = await service.sign(message, keyPair.privateKey);
      const isValid = await service.verify(message, signature.signature, keyPair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should fail to verify a tampered message', async () => {
      const keyPair = await service.generatePQKeypair();
      const message = new TextEncoder().encode('Test message');
      const tamperedMessage = new TextEncoder().encode('Tampered message');

      const signature = await service.sign(message, keyPair.privateKey);
      const isValid = await service.verify(tamperedMessage, signature.signature, keyPair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should fail to verify with wrong public key', async () => {
      const keyPair1 = await service.generatePQKeypair();
      const keyPair2 = await service.generatePQKeypair();
      const message = new TextEncoder().encode('Test message');

      const signature = await service.sign(message, keyPair1.privateKey);
      const isValid = await service.verify(message, signature.signature, keyPair2.publicKey);

      expect(isValid).toBe(false);
    });

    it('should produce different signatures for the same message', async () => {
      const keyPair = await service.generatePQKeypair();
      const message = new TextEncoder().encode('Test message');

      const signature1 = await service.sign(message, keyPair.privateKey);
      const signature2 = await service.sign(message, keyPair.privateKey);

      expect(signature1.signature).not.toEqual(signature2.signature);
    });
  });

  describe('classicalSign and classicalVerify', () => {
    it('should sign and verify a message correctly with Ed25519', async () => {
      const keyPair = await service.generateClassicalKeypair();
      const message = new TextEncoder().encode('Test message');

      const signature = await service.classicalSign(message, keyPair.privateKey);
      const isValid = await service.classicalVerify(message, signature, keyPair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should fail to verify a tampered message with Ed25519', async () => {
      const keyPair = await service.generateClassicalKeypair();
      const message = new TextEncoder().encode('Test message');
      const tamperedMessage = new TextEncoder().encode('Tampered message');

      const signature = await service.classicalSign(message, keyPair.privateKey);
      const isValid = await service.classicalVerify(tamperedMessage, signature, keyPair.publicKey);

      expect(isValid).toBe(false);
    });
  });

  describe('hybridSign and hybridVerify', () => {
    it('should create and verify hybrid signatures', async () => {
      const classicalKey = await service.generateClassicalKeypair();
      const pqKey = await service.generatePQKeypair();
      const message = new TextEncoder().encode('Test message');

      const signature = await service.hybridSign(message, classicalKey, pqKey);
      const result = await service.hybridVerify(message, signature, classicalKey, pqKey);

      expect(result.valid).toBe(true);
      expect(result.classicalValid).toBe(true);
      expect(result.postQuantumValid).toBe(true);
    });

    it('should fail hybrid verification if classical signature is invalid', async () => {
      const classicalKey = await service.generateClassicalKeypair();
      const pqKey = await service.generatePQKeypair();
      const message = new TextEncoder().encode('Test message');
      const tamperedMessage = new TextEncoder().encode('Tampered message');

      const signature = await service.hybridSign(message, classicalKey, pqKey);
      const result = await service.hybridVerify(tamperedMessage, signature, classicalKey, pqKey);

      expect(result.valid).toBe(false);
      expect(result.classicalValid).toBe(false);
    });

    it('should fail hybrid verification if PQ signature is invalid', async () => {
      const classicalKey = await service.generateClassicalKeypair();
      const pqKey = await service.generatePQKeypair();
      const message = new TextEncoder().encode('Test message');

      const signature = await service.hybridSign(message, classicalKey, pqKey);
      // Tamper with the PQ signature
      signature.postQuantum[0] = signature.postQuantum[0] ^ 0xFF;
      
      const result = await service.hybridVerify(message, signature, classicalKey, pqKey);

      expect(result.valid).toBe(false);
      expect(result.postQuantumValid).toBe(false);
    });
  });

  describe('signWithFallback and verifyWithFallback', () => {
    it('should use hybrid mode when PQ key is provided', async () => {
      const classicalKey = await service.generateClassicalKeypair();
      const pqKey = await service.generatePQKeypair();
      const message = new TextEncoder().encode('Test message');

      const signature = await service.signWithFallback(message, classicalKey, pqKey);
      const result = await service.verifyWithFallback(message, signature, classicalKey, pqKey);

      expect(result.valid).toBe(true);
      expect(result.classicalValid).toBe(true);
      expect(result.postQuantumValid).toBe(true);
    });

    it('should fallback to classical when PQ key is not provided', async () => {
      const classicalKey = await service.generateClassicalKeypair();
      const message = new TextEncoder().encode('Test message');

      const signature = await service.signWithFallback(message, classicalKey);
      const result = await service.verifyWithFallback(message, signature, classicalKey);

      expect(result.valid).toBe(true);
      expect(result.classicalValid).toBe(true);
      expect(result.postQuantumValid).toBe(true); // Should be true when PQ is not provided
    });
  });
});
