import { Test, TestingModule } from '@nestjs/testing';
import { RaftConsensusService } from './raft-consensus.service';

describe('RaftConsensusService', () => {
  let service: RaftConsensusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RaftConsensusService],
    }).compile();

    service = module.get<RaftConsensusService>(RaftConsensusService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('configureCluster', () => {
    it('should configure cluster nodes', () => {
      const nodes = [
        { id: 'node-1', address: 'localhost:5000' },
        { id: 'node-2', address: 'localhost:5001' },
        { id: 'node-3', address: 'localhost:5002' },
      ];

      service.configureCluster(nodes);

      const health = service.getClusterHealth();
      expect(health.nodes).toBe(3);
    });
  });

  describe('getNodeState', () => {
    it('should return current node state', () => {
      const state = service.getNodeState();

      expect(state).toBeDefined();
      expect(state.id).toBeDefined();
      expect(state.state).toBeDefined();
      expect(state.currentTerm).toBeDefined();
      expect(state.isLeader).toBeDefined();
    });
  });

  describe('getClusterHealth', () => {
    it('should return cluster health information', () => {
      const health = service.getClusterHealth();

      expect(health).toBeDefined();
      expect(health.nodes).toBeDefined();
      expect(health.leader).toBeDefined();
      expect(health.currentTerm).toBeDefined();
      expect(health.commitIndex).toBeDefined();
      expect(health.consensusReached).toBeDefined();
    });
  });

  describe('proposeEntry', () => {
    it('should propose entry when leader', async () => {
      // Force leader state by calling stepDown first to reset, then manually set
      service['node'].state = 'leader' as any;
      service['node'].currentTerm = 1;

      const data = { test: 'data' };
      const result = await service.proposeEntry(data);

      expect(result).toBe(true);
    });

    it('should throw error when not leader', async () => {
      service['node'].state = 'follower' as any;

      const data = { test: 'data' };

      await expect(service.proposeEntry(data)).rejects.toThrow('Only leader can propose entries');
    });
  });

  describe('requestVote', () => {
    it('should grant vote for higher term', () => {
      const currentTerm = service['node'].currentTerm;
      const result = service.requestVote(currentTerm + 1, 'candidate-1');

      expect(result.voteGranted).toBe(true);
      expect(result.currentTerm).toBe(currentTerm + 1);
    });

    it('should reject vote for lower term', () => {
      const currentTerm = service['node'].currentTerm;
      const result = service.requestVote(currentTerm - 1, 'candidate-1');

      expect(result.voteGranted).toBe(false);
      expect(result.currentTerm).toBe(currentTerm);
    });

    it('should reject vote if already voted for different candidate', () => {
      service['node'].currentTerm = 5;
      service['node'].votedFor = 'candidate-1';

      const result = service.requestVote(5, 'candidate-2');

      expect(result.voteGranted).toBe(false);
    });
  });

  describe('appendEntries', () => {
    it('should accept entries from leader with higher term', () => {
      const currentTerm = service['node'].currentTerm;
      const result = service.appendEntries(
        currentTerm + 1,
        'leader-1',
        0,
        0,
        [],
        0,
      );

      expect(result.success).toBe(true);
      expect(result.currentTerm).toBe(currentTerm + 1);
    });

    it('should reject entries from lower term', () => {
      const currentTerm = service['node'].currentTerm;
      const result = service.appendEntries(
        currentTerm - 1,
        'leader-1',
        0,
        0,
        [],
        0,
      );

      expect(result.success).toBe(false);
      expect(result.currentTerm).toBe(currentTerm);
    });

    it('should reject entries with log mismatch', () => {
      service['node'].currentTerm = 5;
      service['node'].log = [
        { index: 1, term: 5, data: {}, hash: 'hash1' },
      ];

      const result = service.appendEntries(
        5,
        'leader-1',
        1,
        4, // Wrong term
        [],
        0,
      );

      expect(result.success).toBe(false);
    });
  });

  describe('stepDown', () => {
    it('should step down from leader', () => {
      service['node'].state = 'leader' as any;

      service.stepDown();

      expect(service['node'].state).toBe('follower');
    });

    it('should not change state if not leader', () => {
      service['node'].state = 'follower' as any;

      service.stepDown();

      expect(service['node'].state).toBe('follower');
    });
  });

  describe('hashEntry', () => {
    it('should generate consistent hash for same data', () => {
      const data = { test: 'data' };
      const hash1 = service['hashEntry'](data);
      const hash2 = service['hashEntry'](data);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different data', () => {
      const data1 = { test: 'data1' };
      const data2 = { test: 'data2' };
      const hash1 = service['hashEntry'](data1);
      const hash2 = service['hashEntry'](data2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
