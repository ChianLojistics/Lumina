import { Test, TestingModule } from '@nestjs/testing';
import { CryptoAgilityService } from './crypto-agility.service';
import { PQCAlgorithm } from '../interfaces/hybrid-key-exchange.interface';
import { EncryptionAlgorithm } from '../interfaces/encryption.interface';

describe('CryptoAgilityService', () => {
  let service: CryptoAgilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoAgilityService],
    }).compile();

    service = module.get<CryptoAgilityService>(CryptoAgilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('selectAlgorithm', () => {
    it('should select an algorithm for key-exchange', () => {
      const algorithm = service.selectAlgorithm('key-exchange');

      expect(algorithm).toBeDefined();
      expect(algorithm.type).toBe('key-exchange');
      expect(algorithm.status).toBe('active');
    });

    it('should select an algorithm for signature', () => {
      const algorithm = service.selectAlgorithm('signature');

      expect(algorithm).toBeDefined();
      expect(algorithm.type).toBe('signature');
      expect(algorithm.status).toBe('active');
    });

    it('should select an algorithm for encryption', () => {
      const algorithm = service.selectAlgorithm('encryption');

      expect(algorithm).toBeDefined();
      expect(algorithm.type).toBe('encryption');
      expect(algorithm.status).toBe('active');
    });

    it('should select quantum-resistant algorithm when requested', () => {
      const algorithm = service.selectAlgorithm('key-exchange', { quantumResistant: true });

      expect(algorithm).toBeDefined();
      expect(algorithm.quantumResistant).toBe(true);
    });

    it('should select algorithm with minimum strength', () => {
      const algorithm = service.selectAlgorithm('signature', { minStrength: 192 });

      expect(algorithm).toBeDefined();
      expect(algorithm.strength).toBeGreaterThanOrEqual(192);
    });

    it('should prioritize performance when requested', () => {
      const algorithm = service.selectAlgorithm('key-exchange', { prioritizePerformance: true });

      expect(algorithm).toBeDefined();
      expect(algorithm.performance).toBeGreaterThan(0);
    });
  });

  describe('getPolicy', () => {
    it('should return the current cryptographic policy', () => {
      const policy = service.getPolicy();

      expect(policy).toBeDefined();
      expect(policy.keyExchange).toBeDefined();
      expect(policy.signature).toBeDefined();
      expect(policy.encryption).toBeDefined();
      expect(policy.minStrength).toBeDefined();
      expect(typeof policy.requireQuantumResistant).toBe('boolean');
      expect(typeof policy.allowHybrid).toBe('boolean');
    });
  });

  describe('updatePolicy', () => {
    it('should update the cryptographic policy', () => {
      const originalPolicy = service.getPolicy();
      service.updatePolicy({ minStrength: 256 });
      const updatedPolicy = service.getPolicy();

      expect(updatedPolicy.minStrength).toBe(256);
      expect(updatedPolicy.keyExchange).toEqual(originalPolicy.keyExchange);
    });
  });

  describe('addAlgorithm', () => {
    it('should add a new algorithm', () => {
      const newAlgorithm = {
        name: 'TEST-ALGORITHM',
        type: 'key-exchange' as const,
        strength: 128,
        quantumResistant: true,
        performance: 5000,
        keySize: 64,
        status: 'active' as const,
      };

      service.addAlgorithm('key-exchange', newAlgorithm);
      const policy = service.getPolicy();

      expect(policy.keyExchange).toContainEqual(newAlgorithm);
    });
  });

  describe('removeAlgorithm', () => {
    it('should remove an algorithm', () => {
      const policyBefore = service.getPolicy();
      const algorithmToRemove = policyBefore.keyExchange[0];

      service.removeAlgorithm('key-exchange', algorithmToRemove.name);
      const policyAfter = service.getPolicy();

      expect(policyAfter.keyExchange).not.toContainEqual(algorithmToRemove);
    });
  });

  describe('setAlgorithmStatus', () => {
    it('should set algorithm status', () => {
      const policy = service.getPolicy();
      const algorithm = policy.keyExchange[0];

      service.setAlgorithmStatus('key-exchange', algorithm.name, 'deprecated');
      const updatedPolicy = service.getPolicy();

      const updatedAlgorithm = updatedPolicy.keyExchange.find(a => a.name === algorithm.name);
      expect(updatedAlgorithm?.status).toBe('deprecated');
    });
  });

  describe('enableQuantumResistance and disableQuantumResistance', () => {
    it('should enable quantum resistance requirement', () => {
      service.enableQuantumResistance();
      expect(service.isQuantumResistantRequired()).toBe(true);
    });

    it('should disable quantum resistance requirement', () => {
      service.disableQuantumResistance();
      expect(service.isQuantumResistantRequired()).toBe(false);
    });
  });

  describe('enableHybridMode and disableHybridMode', () => {
    it('should enable hybrid mode', () => {
      service.enableHybridMode();
      expect(service.isHybridModeEnabled()).toBe(true);
    });

    it('should disable hybrid mode', () => {
      service.disableHybridMode();
      expect(service.isHybridModeEnabled()).toBe(false);
    });
  });

  describe('setMinimumStrength', () => {
    it('should set minimum security strength', () => {
      service.setMinimumStrength(256);
      expect(service.getMinimumStrength()).toBe(256);
    });
  });

  describe('recordMetric and getMetrics', () => {
    it('should record and retrieve metrics', () => {
      const metric = {
        algorithm: PQCAlgorithm.ML_KEM_1024,
        operation: 'keygen' as const,
        duration: 100,
        keySize: 1568,
        dataSize: 1024,
        timestamp: new Date(),
      };

      service.recordMetric(metric);
      const metrics = service.getMetrics(PQCAlgorithm.ML_KEM_1024, 'keygen');

      expect(metrics).toContainEqual(metric);
    });

    it('should filter metrics by algorithm', () => {
      const metric1 = {
        algorithm: PQCAlgorithm.ML_KEM_1024,
        operation: 'keygen' as const,
        duration: 100,
        timestamp: new Date(),
      };
      const metric2 = {
        algorithm: PQCAlgorithm.ML_DSA_65,
        operation: 'keygen' as const,
        duration: 150,
        timestamp: new Date(),
      };

      service.recordMetric(metric1);
      service.recordMetric(metric2);

      const mlKemMetrics = service.getMetrics(PQCAlgorithm.ML_KEM_1024);
      const mlDsaMetrics = service.getMetrics(PQCAlgorithm.ML_DSA_65);

      expect(mlKemMetrics).toHaveLength(1);
      expect(mlDsaMetrics).toHaveLength(1);
      expect(mlKemMetrics[0].algorithm).toBe(PQCAlgorithm.ML_KEM_1024);
      expect(mlDsaMetrics[0].algorithm).toBe(PQCAlgorithm.ML_DSA_65);
    });

    it('should filter metrics by operation', () => {
      const metric1 = {
        algorithm: PQCAlgorithm.ML_KEM_1024,
        operation: 'keygen' as const,
        duration: 100,
        timestamp: new Date(),
      };
      const metric2 = {
        algorithm: PQCAlgorithm.ML_KEM_1024,
        operation: 'sign' as const,
        duration: 150,
        timestamp: new Date(),
      };

      service.recordMetric(metric1);
      service.recordMetric(metric2);

      const keygenMetrics = service.getMetrics(PQCAlgorithm.ML_KEM_1024, 'keygen');
      const signMetrics = service.getMetrics(PQCAlgorithm.ML_KEM_1024, 'sign');

      expect(keygenMetrics).toHaveLength(1);
      expect(signMetrics).toHaveLength(1);
    });
  });

  describe('getAveragePerformance', () => {
    it('should calculate average performance for algorithm and operation', () => {
      const algorithm = PQCAlgorithm.ML_KEM_1024;
      const operation = 'keygen';

      service.recordMetric({ algorithm, operation, duration: 100, timestamp: new Date() });
      service.recordMetric({ algorithm, operation, duration: 200, timestamp: new Date() });
      service.recordMetric({ algorithm, operation, duration: 300, timestamp: new Date() });

      const average = service.getAveragePerformance(algorithm, operation);

      expect(average).toBe(200);
    });

    it('should return 0 when no metrics exist', () => {
      const average = service.getAveragePerformance('non-existent', 'non-existent');

      expect(average).toBe(0);
    });
  });

  describe('getAlgorithmRecommendations', () => {
    it('should return algorithm recommendations for key-exchange', () => {
      const recommendations = service.getAlgorithmRecommendations('key-exchange');

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.every(r => r.status === 'active')).toBe(true);
    });

    it('should return algorithm recommendations for signature', () => {
      const recommendations = service.getAlgorithmRecommendations('signature');

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should return algorithm recommendations for encryption', () => {
      const recommendations = service.getAlgorithmRecommendations('encryption');

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should prioritize quantum-resistant algorithms in recommendations', () => {
      const recommendations = service.getAlgorithmRecommendations('key-exchange');

      // Quantum-resistant algorithms should appear first
      const firstQuantumResistant = recommendations.find(r => r.quantumResistant);
      const firstClassical = recommendations.find(r => !r.quantumResistant);

      if (firstQuantumResistant && firstClassical) {
        const quantumIndex = recommendations.indexOf(firstQuantumResistant);
        const classicalIndex = recommendations.indexOf(firstClassical);
        expect(quantumIndex).toBeLessThan(classicalIndex);
      }
    });
  });
});
