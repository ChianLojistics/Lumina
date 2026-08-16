import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReconciliationService } from './reconciliation.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { ReconciliationReport } from '../entities/reconciliation-report.entity';
import { ReconcileDto } from '../dto/reconcile.dto';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let ledgerRepository: Repository<LedgerEntry>;
  let reconciliationRepository: Repository<ReconciliationReport>;
  let conflictResolution: ConflictResolutionService;

  const mockLedgerEntries = [
    {
      id: '1',
      entryId: 'entry-1',
      timestamp: Date.now(),
      service: 'payment',
      operation: 'create',
      transactionId: 'tx-123',
      data: { amount: 100 },
      signature: 'sig1',
      previousHash: '0'.repeat(64),
      merkleProof: '',
      createdAt: new Date(),
    },
    {
      id: '2',
      entryId: 'entry-2',
      timestamp: Date.now() + 1000,
      service: 'ramp',
      operation: 'create',
      transactionId: 'tx-123',
      data: { amount: 100 },
      signature: 'sig2',
      previousHash: 'hash1',
      merkleProof: '',
      createdAt: new Date(),
    },
  ];

  const mockLedgerRepository = {
    find: jest.fn(),
  };

  const mockReconciliationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockConflictResolution = {
    resolve: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        {
          provide: getRepositoryToken(LedgerEntry),
          useValue: mockLedgerRepository,
        },
        {
          provide: getRepositoryToken(ReconciliationReport),
          useValue: mockReconciliationRepository,
        },
        {
          provide: ConflictResolutionService,
          useValue: mockConflictResolution,
        },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
    ledgerRepository = module.get<Repository<LedgerEntry>>(getRepositoryToken(LedgerEntry));
    reconciliationRepository = module.get<Repository<ReconciliationReport>>(
      getRepositoryToken(ReconciliationReport),
    );
    conflictResolution = module.get<ConflictResolutionService>(ConflictResolutionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reconcile', () => {
    it('should perform reconciliation successfully', async () => {
      const dto: ReconcileDto = {
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date().toISOString(),
      };

      mockLedgerRepository.find.mockResolvedValue(mockLedgerEntries);
      mockConflictResolution.resolve.mockResolvedValue(true);
      mockReconciliationRepository.create.mockReturnValue({
        id: 'report-1',
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        conflictsDetected: 0,
        conflictsResolved: 0,
        status: 'completed',
        report: {},
        createdAt: new Date(),
      });
      mockReconciliationRepository.save.mockResolvedValue({
        id: 'report-1',
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        conflictsDetected: 0,
        conflictsResolved: 0,
        status: 'completed',
        report: {},
        createdAt: new Date(),
      });

      const result = await service.reconcile(dto);

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(ledgerRepository.find).toHaveBeenCalled();
    });

    it('should filter by services when provided', async () => {
      const dto: ReconcileDto = {
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date().toISOString(),
        services: ['payment'],
      };

      mockLedgerRepository.find.mockResolvedValue([mockLedgerEntries[0]]);
      mockConflictResolution.resolve.mockResolvedValue(true);
      mockReconciliationRepository.create.mockReturnValue({
        id: 'report-1',
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        conflictsDetected: 0,
        conflictsResolved: 0,
        status: 'completed',
        report: {},
        createdAt: new Date(),
      });
      mockReconciliationRepository.save.mockResolvedValue({
        id: 'report-1',
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        conflictsDetected: 0,
        conflictsResolved: 0,
        status: 'completed',
        report: {},
        createdAt: new Date(),
      });

      await service.reconcile(dto);

      expect(ledgerRepository.find).toHaveBeenCalled();
    });

    it('should handle conflicts and mark status as partial when not all resolved', async () => {
      const dto: ReconcileDto = {
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date().toISOString(),
      };

      mockLedgerRepository.find.mockResolvedValue(mockLedgerEntries);
      mockConflictResolution.resolve.mockResolvedValue(false);
      mockReconciliationRepository.create.mockReturnValue({
        id: 'report-1',
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        conflictsDetected: 1,
        conflictsResolved: 0,
        status: 'partial',
        report: {},
        createdAt: new Date(),
      });
      mockReconciliationRepository.save.mockResolvedValue({
        id: 'report-1',
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        conflictsDetected: 1,
        conflictsResolved: 0,
        status: 'partial',
        report: {},
        createdAt: new Date(),
      });

      const result = await service.reconcile(dto);

      expect(result.status).toBe('partial');
    });
  });

  describe('getReport', () => {
    it('should return reconciliation report by ID', async () => {
      const mockReport = {
        id: 'report-1',
        startTime: new Date(),
        endTime: new Date(),
        conflictsDetected: 0,
        conflictsResolved: 0,
        status: 'completed',
        report: {},
        createdAt: new Date(),
      };

      mockReconciliationRepository.findOne.mockResolvedValue(mockReport);

      const result = await service.getReport('report-1');

      expect(result).toEqual(mockReport);
      expect(reconciliationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'report-1' },
      });
    });
  });

  describe('getRecentReports', () => {
    it('should return recent reconciliation reports', async () => {
      const mockReports = [
        {
          id: 'report-1',
          startTime: new Date(),
          endTime: new Date(),
          conflictsDetected: 0,
          conflictsResolved: 0,
          status: 'completed',
          report: {},
          createdAt: new Date(),
        },
      ];

      mockReconciliationRepository.find.mockResolvedValue(mockReports);

      const result = await service.getRecentReports(10);

      expect(result).toEqual(mockReports);
      expect(reconciliationRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 10,
      });
    });
  });

  describe('getStatistics', () => {
    it('should return reconciliation statistics', async () => {
      mockReconciliationRepository.count.mockResolvedValue(100);
      mockReconciliationRepository.count.mockResolvedValueOnce(95).mockResolvedValueOnce(5);
      mockReconciliationRepository.find.mockResolvedValue([
        {
          conflictsDetected: 10,
          conflictsResolved: 9,
        },
      ]);

      const result = await service.getStatistics();

      expect(result).toBeDefined();
      expect(result.totalReports).toBe(100);
      expect(result.completedReports).toBe(95);
      expect(result.partialReports).toBe(5);
    });
  });
});
