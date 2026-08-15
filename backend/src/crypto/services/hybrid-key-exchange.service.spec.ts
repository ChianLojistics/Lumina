import { Test, TestingModule } from '@nestjs/testing';
import { HybridKeyExchangeService } from './hybrid-key-exchange.service';

describe('HybridKeyExchangeService', () => {
  let service: HybridKeyExchangeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HybridKeyExchangeService],
    }).compile();

    service = module.get<HybridKeyExchangeService>(HybridKeyExchangeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateKeyPair', () => {
    it('should generate a hybrid key pair', async () => {
      const keyPair = await service.generateKeyPair();

      expect(keyPair).toBeDefined();
      expect(keyPair.classical).toBeDefined();
      expect(keyPair.classical.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.classical.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.classical.privateKey.length).toBe(32);
      expect(keyPair.classical.publicKey.length).toBe(32);
      expect(keyPair.postQuantum).toBeDefined();
      expect(keyPair.postQuantum.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.postQuantum.publicKey).toBeInstanceOf(Uint8Array);
    });

    it('should generate different key pairs on each call', async () => {
      const keyPair1 = await service.generateKeyPair();
      const keyPair2 = await service.generateKeyPair();

      expect(keyPair1.classical.privateKey).not.toEqual(keyPair2.classical.privateKey);
      expect(keyPair1.postQuantum.privateKey).not.toEqual(keyPair2.postQuantum.privateKey);
    });
  });

  describe('encapsulate', () => {
    it('should encapsulate a shared secret', async () => {
      const keyPair = await service.generateKeyPair();
      const peerPublicKey = {
        classical: keyPair.classical.publicKey,
        postQuantum: keyPair.postQuantum.publicKey,
      };

      const result = await service.encapsulate(peerPublicKey);

      expect(result).toBeDefined();
      expect(result.ciphertext).toBeInstanceOf(Uint8Array);
      expect(result.sharedSecret).toBeInstanceOf(Uint8Array);
      expect(result.sharedSecret.length).toBe(32);
    });

    it('should generate different ciphertexts for each encapsulation', async () => {
      const keyPair = await service.generateKeyPair();
      const peerPublicKey = {
        classical: keyPair.classical.publicKey,
        postQuantum: keyPair.postQuantum.publicKey,
      };

      const result1 = await service.encapsulate(peerPublicKey);
      const result2 = await service.encapsulate(peerPublicKey);

      expect(result1.ciphertext).not.toEqual(result2.ciphertext);
      expect(result1.sharedSecret).not.toEqual(result2.sharedSecret);
    });
  });

  describe('decapsulate', () => {
    it('should decapsulate a shared secret', async () => {
      const keyPair = await service.generateKeyPair();
      const peerPublicKey = {
        classical: keyPair.classical.publicKey,
        postQuantum: keyPair.postQuantum.publicKey,
      };

      const encapsulated = await service.encapsulate(peerPublicKey);
      const privateKey = {
        classical: keyPair.classical.privateKey,
        postQuantum: keyPair.postQuantum.privateKey,
      };

      const result = await service.decapsulate(privateKey, encapsulated.ciphertext, peerPublicKey);

      expect(result).toBeDefined();
      expect(result.classical).toBeInstanceOf(Uint8Array);
      expect(result.postQuantum).toBeInstanceOf(Uint8Array);
      expect(result.combined).toBeInstanceOf(Uint8Array);
      expect(result.combined.length).toBe(32);
    });

    it('should derive the same shared secret from encapsulation and decapsulation', async () => {
      const keyPair = await service.generateKeyPair();
      const peerPublicKey = {
        classical: keyPair.classical.publicKey,
        postQuantum: keyPair.postQuantum.publicKey,
      };

      const encapsulated = await service.encapsulate(peerPublicKey);
      const privateKey = {
        classical: keyPair.classical.privateKey,
        postQuantum: keyPair.postQuantum.privateKey,
      };

      const decapsulated = await service.decapsulate(privateKey, encapsulated.ciphertext, peerPublicKey);

      expect(encapsulated.sharedSecret).toEqual(decapsulated.combined);
    });
  });

  describe('deriveSharedSecret', () => {
    it('should derive shared secret from key pairs', async () => {
      const keyPair1 = await service.generateKeyPair();
      const keyPair2 = await service.generateKeyPair();

      const privateKey = {
        classical: keyPair1.classical.privateKey,
        postQuantum: keyPair1.postQuantum.privateKey,
      };

      const peerPublicKey = {
        classical: keyPair2.classical.publicKey,
        postQuantum: keyPair2.postQuantum.publicKey,
      };

      const result = await service.deriveSharedSecret(privateKey, peerPublicKey);

      expect(result).toBeDefined();
      expect(result.classical).toBeInstanceOf(Uint8Array);
      expect(result.postQuantum).toBeInstanceOf(Uint8Array);
      expect(result.combined).toBeInstanceOf(Uint8Array);
      expect(result.combined.length).toBe(32);
    });

    it('should derive the same shared secret for both parties', async () => {
      const keyPair1 = await service.generateKeyPair();
      const keyPair2 = await service.generateKeyPair();

      const secret1 = await service.deriveSharedSecret(
        {
          classical: keyPair1.classical.privateKey,
          postQuantum: keyPair1.postQuantum.privateKey,
        },
        {
          classical: keyPair2.classical.publicKey,
          postQuantum: keyPair2.postQuantum.publicKey,
        },
      );

      const secret2 = await service.deriveSharedSecret(
        {
          classical: keyPair2.classical.privateKey,
          postQuantum: keyPair2.postQuantum.privateKey,
        },
        {
          classical: keyPair1.classical.publicKey,
          postQuantum: keyPair1.postQuantum.publicKey,
        },
      );

      expect(secret1.combined).toEqual(secret2.combined);
    });
  });

  describe('getSupportedAlgorithms', () => {
    it('should return supported algorithms', () => {
      const algorithms = service.getSupportedAlgorithms();

      expect(algorithms).toBeDefined();
      expect(Array.isArray(algorithms)).toBe(true);
      expect(algorithms.length).toBeGreaterThan(0);
    });
  });
});
