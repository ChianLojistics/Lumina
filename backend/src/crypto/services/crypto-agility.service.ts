import { Injectable, Logger } from '@nestjs/common';
import {
  CryptoAlgorithm,
  CryptoPolicy,
  AlgorithmSelectionOptions,
  CryptoMetrics,
} from '../interfaces/crypto-agility.interface';
import { PQCAlgorithm } from '../interfaces/hybrid-key-exchange.interface';
import { EncryptionAlgorithm } from '../interfaces/encryption.interface';

@Injectable()
export class CryptoAgilityService {
  private readonly logger = new Logger(CryptoAgilityService.name);
  private policy: CryptoPolicy;
  private metrics: CryptoMetrics[] = [];

  constructor() {
    this.policy = this.initializeDefaultPolicy();
  }

  private initializeDefaultPolicy(): CryptoPolicy {
    return {
      keyExchange: [
        {
          name: PQCAlgorithm.X25519,
          type: 'key-exchange',
          strength: 128,
          quantumResistant: false,
          performance: 100000,
          keySize: 32,
          status: 'active',
        },
        {
          name: PQCAlgorithm.ML_KEM_1024,
          type: 'key-exchange',
          strength: 256,
          quantumResistant: true,
          performance: 10000,
          keySize: 1568,
          status: 'active',
        },
        {
          name: PQCAlgorithm.ML_KEM_768,
          type: 'key-exchange',
          strength: 192,
          quantumResistant: true,
          performance: 15000,
          keySize: 1184,
          status: 'active',
        },
      ],
      signature: [
        {
          name: PQCAlgorithm.ED25519,
          type: 'signature',
          strength: 128,
          quantumResistant: false,
          performance: 100000,
          keySize: 32,
          signatureSize: 64,
          status: 'active',
        },
        {
          name: PQCAlgorithm.ML_DSA_65,
          type: 'signature',
          strength: 192,
          quantumResistant: true,
          performance: 5000,
          keySize: 1952,
          signatureSize: 3309,
          status: 'active',
        },
        {
          name: PQCAlgorithm.ML_DSA_87,
          type: 'signature',
          strength: 256,
          quantumResistant: true,
          performance: 3000,
          keySize: 2592,
          signatureSize: 4627,
          status: 'active',
        },
      ],
      encryption: [
        {
          name: EncryptionAlgorithm.AES_256_GCM,
          type: 'encryption',
          strength: 256,
          quantumResistant: false,
          performance: 100000,
          keySize: 32,
          status: 'active',
        },
      ],
      minStrength: 128,
      requireQuantumResistant: false,
      allowHybrid: true,
      fallbackToClassical: true,
    };
  }

  selectAlgorithm(
    type: 'key-exchange' | 'signature' | 'encryption',
    options?: AlgorithmSelectionOptions,
  ): CryptoAlgorithm {
    const algorithms = this.policy[type];
    
    if (!algorithms || algorithms.length === 0) {
      throw new Error(`No algorithms available for type: ${type}`);
    }

    let filtered = [...algorithms];

    // Filter by quantum resistance if required
    if (options?.quantumResistant) {
      filtered = filtered.filter((a) => a.quantumResistant);
      if (filtered.length === 0 && this.policy.fallbackToClassical) {
        this.logger.warn(
          `No quantum-resistant algorithms available for ${type}, falling back to classical`,
        );
        filtered = [...algorithms];
      }
    }

    // Filter by minimum strength
    if (options?.minStrength) {
      filtered = filtered.filter((a) => a.strength >= options.minStrength);
    }

    // Filter by active status
    filtered = filtered.filter((a) => a.status === 'active');

    if (filtered.length === 0) {
      throw new Error(
        `No suitable algorithms available for type: ${type} with given options`,
      );
    }

    // Prioritize performance if requested
    if (options?.prioritizePerformance) {
      filtered.sort((a, b) => b.performance - a.performance);
    } else {
      // Otherwise, prioritize quantum-resistant and higher strength
      filtered.sort((a, b) => {
        if (a.quantumResistant !== b.quantumResistant) {
          return a.quantumResistant ? -1 : 1;
        }
        return b.strength - a.strength;
      });
    }

    return filtered[0];
  }

  getPolicy(): CryptoPolicy {
    return { ...this.policy };
  }

  updatePolicy(newPolicy: Partial<CryptoPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
    this.logger.log('Cryptographic policy updated');
  }

  addAlgorithm(type: 'key-exchange' | 'signature' | 'encryption', algorithm: CryptoAlgorithm): void {
    if (!this.policy[type]) {
      this.policy[type] = [];
    }
    this.policy[type].push(algorithm);
    this.logger.log(`Algorithm ${algorithm.name} added to ${type}`);
  }

  removeAlgorithm(type: 'key-exchange' | 'signature' | 'encryption', algorithmName: string): void {
    if (this.policy[type]) {
      this.policy[type] = this.policy[type].filter((a) => a.name !== algorithmName);
      this.logger.log(`Algorithm ${algorithmName} removed from ${type}`);
    }
  }

  setAlgorithmStatus(
    type: 'key-exchange' | 'signature' | 'encryption',
    algorithmName: string,
    status: 'active' | 'deprecated' | 'experimental',
  ): void {
    const algorithm = this.policy[type]?.find((a) => a.name === algorithmName);
    if (algorithm) {
      algorithm.status = status;
      this.logger.log(`Algorithm ${algorithmName} status set to ${status}`);
    }
  }

  enableQuantumResistance(): void {
    this.policy.requireQuantumResistant = true;
    this.logger.log('Quantum resistance requirement enabled');
  }

  disableQuantumResistance(): void {
    this.policy.requireQuantumResistant = false;
    this.logger.log('Quantum resistance requirement disabled');
  }

  enableHybridMode(): void {
    this.policy.allowHybrid = true;
    this.logger.log('Hybrid mode enabled');
  }

  disableHybridMode(): void {
    this.policy.allowHybrid = false;
    this.logger.log('Hybrid mode disabled');
  }

  setMinimumStrength(strength: number): void {
    this.policy.minStrength = strength;
    this.logger.log(`Minimum security strength set to ${strength} bits`);
  }

  recordMetric(metric: CryptoMetrics): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  getMetrics(algorithm?: string, operation?: string): CryptoMetrics[] {
    let filtered = [...this.metrics];
    
    if (algorithm) {
      filtered = filtered.filter((m) => m.algorithm === algorithm);
    }
    
    if (operation) {
      filtered = filtered.filter((m) => m.operation === operation);
    }
    
    return filtered;
  }

  getAveragePerformance(algorithm: string, operation: string): number {
    const relevantMetrics = this.getMetrics(algorithm, operation);
    
    if (relevantMetrics.length === 0) {
      return 0;
    }
    
    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / relevantMetrics.length;
  }

  getAlgorithmRecommendations(
    type: 'key-exchange' | 'signature' | 'encryption',
  ): CryptoAlgorithm[] {
    const algorithms = this.policy[type];
    
    // Return active algorithms sorted by recommendation score
    return algorithms
      .filter((a) => a.status === 'active')
      .sort((a, b) => {
        // Calculate recommendation score
        const scoreA = this.calculateRecommendationScore(a);
        const scoreB = this.calculateRecommendationScore(b);
        return scoreB - scoreA;
      });
  }

  private calculateRecommendationScore(algorithm: CryptoAlgorithm): number {
    let score = 0;
    
    // Quantum resistance gets bonus
    if (algorithm.quantumResistant) {
      score += 50;
    }
    
    // Higher strength gets bonus
    score += algorithm.strength / 4;
    
    // Performance gets bonus (normalized)
    score += Math.log10(algorithm.performance) * 10;
    
    // Active status required
    if (algorithm.status !== 'active') {
      score -= 100;
    }
    
    return score;
  }

  isQuantumResistantRequired(): boolean {
    return this.policy.requireQuantumResistant;
  }

  isHybridModeEnabled(): boolean {
    return this.policy.allowHybrid;
  }

  getMinimumStrength(): number {
    return this.policy.minStrength;
  }

  canFallbackToClassical(): boolean {
    return this.policy.fallbackToClassical;
  }
}
