import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/common';
import { ZKPProofService } from './zkp-proof.service';
import { ZKPProof, ProofType } from '../entities/zkp-proof.entity';
import { Nullifier } from '../entities/nullifier.entity';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { PaymentDetails, SettlementDetails, IdentityDetails } from '../interfaces/zkp-proof.interface';

describe('ZKPProofService', () => {
  let service: ZKPProofService;
  let zkpProofRepository: Repository<ZKPProof>;
  let nullifierRepository: Repository<Nullifier>;
  let cacheManager: Cache;

  const mockZKPProofRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockNullifierRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockCacheManager = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZKPProofService,
        {
          provide: getRepositoryToken(ZKPProof),
          useValue: mockZKPProofRepository,
        },
        {
          provide: getRepositoryToken(Nullifier),
          useValue: mockNullifierRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<ZKPProofService>(ZKPProofService);
    zkpProofRepository = module.get<Repository<ZKPProof>>(getRepositoryToken(ZKPProof));
    nullifierRepository = module.get<Repository<Nullifier>>(getRepositoryToken(Nullifier));
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePaymentProof', () => {
    it('should generate a payment proof successfully', async () => {
      const paymentDetails: PaymentDetails = {
        senderPrivateKey: 'sender_key',
        recipientPrivateKey: 'recipient_key',
        amount: 100,
        timestamp: Date.now(),
        nonce: 'nonce123',
        paymentHash: 'payment_hash',
        merkleRoot: 'merkle_root',
      };

      mockNullifierRepository.findOne.mockResolvedValue(null);
      mockZKPProofRepository.create.mockReturnValue({
        id: 'proof_id',
        transactionId: paymentDetails.paymentHash,
        proofType: ProofType.PAYMENT,
      });
      mockZKPProofRepository.save.mockResolvedValue({});
      mockNullifierRepository.create.mockReturnValue({});
      mockNullifierRepository.save.mockResolvedValue({});
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.generatePaymentProof(paymentDetails);

      expect(result).toBeDefined();
      expect(result.proof).toBeDefined();
      expect(result.publicSignals).toBeDefined();
      expect(result.proofType).toBe('groth16');
      expect(mockNullifierRepository.findOne).toHaveBeenCalled();
      expect(mockZKPProofRepository.create).toHaveBeenCalled();
      expect(mockZKPProofRepository.save).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should throw error if nullifier already exists', async () => {
      const paymentDetails: PaymentDetails = {
        senderPrivateKey: 'sender_key',
        recipientPrivateKey: 'recipient_key',
        amount: 100,
        timestamp: Date.now(),
        nonce: 'nonce123',
        paymentHash: 'payment_hash',
        merkleRoot: 'merkle_root',
      };

      mockNullifierRepository.findOne.mockResolvedValue({ nullifierHash: 'existing' });

      await expect(service.generatePaymentProof(paymentDetails)).rejects.toThrow(
        'Nullifier already exists - potential double-spending attempt'
      );
    });
  });

  describe('generateSettlementProof', () => {
    it('should generate a settlement proof successfully', async () => {
      const settlementDetails: SettlementDetails = {
        merchantPrivateKey: 'merchant_key',
        paymentHash: 'payment_hash',
        settlementAmount: 100,
        settlementTimestamp: Date.now(),
        merchantPublicKey: 'merchant_pubkey',
        expectedSettlementAmount: 100,
        merkleRoot: 'merkle_root',
      };

      mockZKPProofRepository.create.mockReturnValue({});
      mockZKPProofRepository.save.mockResolvedValue({});
      mockNullifierRepository.create.mockReturnValue({});
      mockNullifierRepository.save.mockResolvedValue({});

      const result = await service.generateSettlementProof(settlementDetails);

      expect(result).toBeDefined();
      expect(result.proof).toBeDefined();
      expect(mockZKPProofRepository.create).toHaveBeenCalled();
    });
  });

  describe('generateIdentityProof', () => {
    it('should generate an identity proof successfully', async () => {
      const identityDetails: IdentityDetails = {
        identityPrivateKey: 'identity_key',
        identityCommitment: 'identity_commitment',
        age: 25,
        countryCode: 'US',
        minAge: 18,
        allowedCountries: 'US',
      };

      mockZKPProofRepository.create.mockReturnValue({});
      mockZKPProofRepository.save.mockResolvedValue({});

      const result = await service.generateIdentityProof(identityDetails);

      expect(result).toBeDefined();
      expect(result.proof).toBeDefined();
      expect(mockZKPProofRepository.create).toHaveBeenCalled();
    });
  });

  describe('getCachedProof', () => {
    it('should return cached proof if exists', async () => {
      const transactionId = 'tx123';
      const cachedProof = { proof: 'cached_proof_data' };
      mockCacheManager.get.mockResolvedValue(cachedProof);

      const result = await service.getCachedProof(transactionId);

      expect(result).toEqual(cachedProof);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`proof:${transactionId}`);
    });

    it('should return null if no cached proof exists', async () => {
      const transactionId = 'tx123';
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getCachedProof(transactionId);

      expect(result).toBeNull();
    });
  });

  describe('getProofById', () => {
    it('should return proof by id', async () => {
      const proofId = 'proof123';
      const mockProof = { id: proofId, transactionId: 'tx123' };
      mockZKPProofRepository.findOne.mockResolvedValue(mockProof);

      const result = await service.getProofById(proofId);

      expect(result).toEqual(mockProof);
      expect(mockZKPProofRepository.findOne).toHaveBeenCalledWith({ where: { id: proofId } });
    });
  });

  describe('getProofsByTransaction', () => {
    it('should return proofs by transaction id', async () => {
      const transactionId = 'tx123';
      const mockProofs = [
        { id: 'proof1', transactionId },
        { id: 'proof2', transactionId },
      ];
      mockZKPProofRepository.find.mockResolvedValue(mockProofs);

      const result = await service.getProofsByTransaction(transactionId);

      expect(result).toEqual(mockProofs);
      expect(mockZKPProofRepository.find).toHaveBeenCalledWith({
        where: { transactionId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('isNullifierUsed', () => {
    it('should return true if nullifier is used', async () => {
      const nullifierHash = 'nullifier123';
      mockNullifierRepository.findOne.mockResolvedValue({ spent: true });

      const result = await service.isNullifierUsed(nullifierHash);

      expect(result).toBe(true);
    });

    it('should return false if nullifier is not used', async () => {
      const nullifierHash = 'nullifier123';
      mockNullifierRepository.findOne.mockResolvedValue(null);

      const result = await service.isNullifierUsed(nullifierHash);

      expect(result).toBe(false);
    });
  });

  describe('markNullifierSpent', () => {
    it('should mark nullifier as spent', async () => {
      const nullifierHash = 'nullifier123';
      mockNullifierRepository.update.mockResolvedValue({});

      await service.markNullifierSpent(nullifierHash);

      expect(mockNullifierRepository.update).toHaveBeenCalledWith(
        { nullifierHash },
        { spent: true }
      );
    });
  });
});
