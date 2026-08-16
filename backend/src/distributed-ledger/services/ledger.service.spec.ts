import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerService } from './ledger.service';
import { RaftConsensusService } from './raft-consensus.service';
import { MerkleTreeService } from './merkle-tree.service';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { ReconciliationReport } from '../entities/reconciliation-report.entity';
import { WriteEntryDto } from '../dto/write-entry.dto';

describe('LedgerService', () => {
  let service: LedgerService;
  let ledgerRepository: Repository<LedgerEntry>;
  let raftService: RaftConsensusService;
  let merkleService: MerkleTreeService;

  const mockLedgerEntry = {
    id: '1',
    entryId: 'test-entry-id',
    timestamp: Date.now(),
    service: 'payment',
    operation: 'create',
    transactionId: 'tx-123',
    data: { amount: 100 },
    signature: 'test-signature',
    previousHash: '0'.repeat(64),
    merkleProof: '',
    createdAt: new Date(),
  };

  const mockLedgerRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRaftService = {
    proposeEntry: jest.fn(),
    getClusterHealth: jest.fn(),
  };

  const mockMerkleService = {
    generateProof: jest.fn(),
    serializeProof: jest.fn(),
    getRootHash: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        {
          provide: getRepositoryToken(LedgerEntry),
          useValue: mockLedgerRepository,
        },
        {
          provide: getRepositoryToken(ReconciliationReport),
          useValue: {},
        },
        {
          provide: RaftConsensusService,
          useValue: mockRaftService,
        },
        {
          provide: MerkleTreeService,
          useValue: mockMerkleService,
        },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    ledgerRepository = module.get<Repository<LedgerEntry>>(getRepositoryToken(LedgerEntry));
    raftService = module.get<RaftConsensusService>(RaftConsensusService);
    merkleService = module.get<MerkleTreeService>(MerkleTreeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('writeEntry', () => {
    it('should write entry to ledger successfully', async () => {
      const dto: WriteEntryDto = {
        service: 'payment',
        operation: 'create',
        transactionId: 'tx-123',
        data: { amount: 100 },
        consistencyLevel: 'eventual',
      };

      mockLedgerRepository.findOne.mockResolvedValue(null);
      mockLedgerRepository.create.mockReturnValue(mockLedgerEntry);
      mockLedgerRepository.save.mockResolvedValue(mockLedgerEntry);
      mockRaftService.proposeEntry.mockResolvedValue(true);
      mockLedgerRepository.find.mockResolvedValue([mockLedgerEntry]);
      mockMerkleService.generateProof.mockReturnValue([]);
      mockMerkleService.serializeProof.mockReturnValue('');

      const result = await service.writeEntry(dto);

      expect(result).toBeDefined();
      expect(ledgerRepository.create).toHaveBeenCalled();
      expect(ledgerRepository.save).toHaveBeenCalled();
      expect(raftService.proposeEntry).toHaveBeenCalled();
    });

    it('should throw error when consensus fails with strong consistency', async () => {
      const dto: WriteEntryDto = {
        service: 'payment',
        operation: 'create',
        transactionId: 'tx-123',
        data: { amount: 100 },
        consistencyLevel: 'strong',
      };

      mockLedgerRepository.findOne.mockResolvedValue(null);
      mockLedgerRepository.create.mockReturnValue(mockLedgerEntry);
      mockRaftService.proposeEntry.mockResolvedValue(false);

      await expect(service.writeEntry(dto)).rejects.toThrow('Failed to achieve consensus for entry');
    });

    it('should succeed with eventual consistency even if consensus fails', async () => {
      const dto: WriteEntryDto = {
        service: 'payment',
        operation: 'create',
        transactionId: 'tx-123',
        data: { amount: 100 },
        consistencyLevel: 'eventual',
      };

      mockLedgerRepository.findOne.mockResolvedValue(null);
      mockLedgerRepository.create.mockReturnValue(mockLedgerEntry);
      mockLedgerRepository.save.mockResolvedValue(mockLedgerEntry);
      mockRaftService.proposeEntry.mockResolvedValue(false);
      mockLedgerRepository.find.mockResolvedValue([mockLedgerEntry]);
      mockMerkleService.generateProof.mockReturnValue([]);
      mockMerkleService.serializeProof.mockReturnValue('');

      const result = await service.writeEntry(dto);

      expect(result).toBeDefined();
    });
  });

  describe('getEntryById', () => {
    it('should return entry by ID', async () => {
      mockLedgerRepository.findOne.mockResolvedValue(mockLedgerEntry);

      const result = await service.getEntryById('test-entry-id');

      expect(result).toEqual(mockLedgerEntry);
      expect(ledgerRepository.findOne).toHaveBeenCalledWith({
        where: { entryId: 'test-entry-id' },
      });
    });

    it('should throw error when entry not found', async () => {
      mockLedgerRepository.findOne.mockResolvedValue(null);

      await expect(service.getEntryById('non-existent')).rejects.toThrow('Entry non-existent not found');
    });
  });

  describe('getTransactionEntries', () => {
    it('should return all entries for a transaction', async () => {
      mockLedgerRepository.find.mockResolvedValue([mockLedgerEntry]);

      const result = await service.getTransactionEntries('tx-123');

      expect(result).toEqual([mockLedgerEntry]);
      expect(ledgerRepository.find).toHaveBeenCalledWith({
        where: { transactionId: 'tx-123' },
        order: { timestamp: 'ASC' },
      });
    });
  });

  describe('verifyEntry', () => {
    it('should verify valid entry', async () => {
      mockLedgerRepository.findOne.mockResolvedValue(mockLedgerEntry);
      mockLedgerRepository.find.mockResolvedValue([mockLedgerEntry]);
      mockMerkleService.deserializeProof.mockReturnValue([]);
      mockMerkleService.getRootHash.mockReturnValue('roothash');
      mockMerkleService.verifyProof.mockReturnValue(true);

      const result = await service.verifyEntry('test-entry-id');

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', async () => {
      const invalidEntry = { ...mockLedgerEntry, signature: 'invalid' };
      mockLedgerRepository.findOne.mockResolvedValue(invalidEntry);

      const result = await service.verifyEntry('test-entry-id');

      expect(result).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return ledger statistics', async () => {
      mockLedgerRepository.count.mockResolvedValue(100);
      mockLedgerRepository.createQueryBuilder().select().addSelect().groupBy().getRawMany.mockResolvedValue([
        { service: 'payment', count: 50 },
        { service: 'ramp', count: 50 },
      ]);
      mockLedgerRepository.findOne.mockResolvedValue(mockLedgerEntry);

      const result = await service.getStatistics();

      expect(result).toBeDefined();
      expect(result.totalEntries).toBe(100);
      expect(result.entriesByService).toHaveLength(2);
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when consensus is reached', async () => {
      mockRaftService.getClusterHealth.mockReturnValue({
        nodes: 3,
        leader: 'node-1',
        currentTerm: 1,
        commitIndex: 100,
        consensusReached: true,
      });

      mockLedgerRepository.count.mockResolvedValue(100);
      mockLedgerRepository.createQueryBuilder().select().addSelect().groupBy().getRawMany.mockResolvedValue([]);
      mockLedgerRepository.findOne.mockResolvedValue(mockLedgerEntry);

      const result = await service.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.consensusReached).toBe(true);
    });

    it('should return degraded status when consensus is not reached', async () => {
      mockRaftService.getClusterHealth.mockReturnValue({
        nodes: 3,
        leader: 'node-1',
        currentTerm: 1,
        commitIndex: 100,
        consensusReached: false,
      });

      mockLedgerRepository.count.mockResolvedValue(100);
      mockLedgerRepository.createQueryBuilder().select().addSelect().groupBy().getRawMany.mockResolvedValue([]);
      mockLedgerRepository.findOne.mockResolvedValue(mockLedgerEntry);

      const result = await service.getHealth();

      expect(result.status).toBe('degraded');
    });
  });
});
