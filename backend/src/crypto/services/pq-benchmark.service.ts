import { Injectable, Logger } from '@nestjs/common';
import { HybridKeyExchangeService } from './hybrid-key-exchange.service';
import { PQSignatureService } from './pq-signature.service';
import { QuantumEncryptionService } from './quantum-encryption.service';
import { CryptoAgilityService } from './crypto-agility.service';
import { CryptoMetrics } from '../interfaces/crypto-agility.interface';
import { PQCAlgorithm } from '../interfaces/hybrid-key-exchange.interface';
import { EncryptionAlgorithm } from '../interfaces/encryption.interface';
import { randomBytes } from 'crypto';

export interface BenchmarkResult {
  algorithm: string;
  operation: string;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  iterations: number;
  throughput: number; // operations per second
  keySize?: number;
  dataSize?: number;
  timestamp: Date;
}

export interface BenchmarkReport {
  keyExchange: BenchmarkResult[];
  signatures: BenchmarkResult[];
  encryption: BenchmarkResult[];
  summary: {
    totalOperations: number;
    totalDuration: number;
    fastestAlgorithm: string;
    slowestAlgorithm: string;
  };
}

@Injectable()
export class PQBenchmarkService {
  private readonly logger = new Logger(PQBenchmarkService.name);
  private readonly DEFAULT_ITERATIONS = 100;
  private readonly DEFAULT_DATA_SIZE = 1024; // 1KB

  constructor(
    private readonly hybridKeyExchangeService: HybridKeyExchangeService,
    private readonly pqSignatureService: PQSignatureService,
    private readonly quantumEncryptionService: QuantumEncryptionService,
    private readonly cryptoAgilityService: CryptoAgilityService,
  ) {}

  async benchmarkKeyExchange(
    algorithm: PQCAlgorithm = PQCAlgorithm.ML_KEM_1024,
    iterations: number = this.DEFAULT_ITERATIONS,
  ): Promise<BenchmarkResult> {
    this.logger.log(`Starting key exchange benchmark for ${algorithm} with ${iterations} iterations`);
    
    const durations: number[] = [];
    const testData = new Uint8Array(this.DEFAULT_DATA_SIZE);
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      try {
        const keyPair = await this.hybridKeyExchangeService.generateKeyPair();
        const sharedSecret = await this.hybridKeyExchangeService.deriveSharedSecret(
          {
            classical: keyPair.classical.privateKey,
            postQuantum: keyPair.postQuantum.privateKey,
          },
          {
            classical: keyPair.classical.publicKey,
            postQuantum: keyPair.postQuantum.publicKey,
          },
        );
        
        const duration = Date.now() - startTime;
        durations.push(duration);
        
        // Record metric
        this.cryptoAgilityService.recordMetric({
          algorithm,
          operation: 'key-exchange',
          duration,
          keySize: keyPair.postQuantum.publicKey.length,
          dataSize: this.DEFAULT_DATA_SIZE,
          timestamp: new Date(),
        });
      } catch (error: any) {
        this.logger.error(`Benchmark iteration ${i} failed: ${error.message}`);
      }
    }
    
    return this.calculateBenchmarkResult(algorithm, 'key-exchange', durations, iterations);
  }

  async benchmarkSignature(
    algorithm: PQCAlgorithm = PQCAlgorithm.ML_DSA_65,
    iterations: number = this.DEFAULT_ITERATIONS,
  ): Promise<BenchmarkResult> {
    this.logger.log(`Starting signature benchmark for ${algorithm} with ${iterations} iterations`);
    
    const signDurations: number[] = [];
    const verifyDurations: number[] = [];
    const testData = new Uint8Array(this.DEFAULT_DATA_SIZE);
    
    // Generate key pair once
    const keyPair = await this.pqSignatureService.generatePQKeypair();
    
    for (let i = 0; i < iterations; i++) {
      // Benchmark signing
      const signStart = Date.now();
      try {
        await this.pqSignatureService.sign(testData, keyPair.privateKey);
        const signDuration = Date.now() - signStart;
        signDurations.push(signDuration);
        
        this.cryptoAgilityService.recordMetric({
          algorithm,
          operation: 'sign',
          duration: signDuration,
          keySize: keyPair.publicKey.length,
          dataSize: this.DEFAULT_DATA_SIZE,
          timestamp: new Date(),
        });
      } catch (error: any) {
        this.logger.error(`Sign benchmark iteration ${i} failed: ${error.message}`);
      }
      
      // Benchmark verification
      const verifyStart = Date.now();
      try {
        const signature = await this.pqSignatureService.sign(testData, keyPair.privateKey);
        await this.pqSignatureService.verify(testData, signature.signature, keyPair.publicKey);
        const verifyDuration = Date.now() - verifyStart;
        verifyDurations.push(verifyDuration);
        
        this.cryptoAgilityService.recordMetric({
          algorithm,
          operation: 'verify',
          duration: verifyDuration,
          keySize: keyPair.publicKey.length,
          dataSize: this.DEFAULT_DATA_SIZE,
          timestamp: new Date(),
        });
      } catch (error: any) {
        this.logger.error(`Verify benchmark iteration ${i} failed: ${error.message}`);
      }
    }
    
    // Return combined result for signing (usually the bottleneck)
    return this.calculateBenchmarkResult(algorithm, 'sign', signDurations, iterations);
  }

  async benchmarkEncryption(
    algorithm: EncryptionAlgorithm = EncryptionAlgorithm.AES_256_GCM,
    iterations: number = this.DEFAULT_ITERATIONS,
    dataSize: number = this.DEFAULT_DATA_SIZE,
  ): Promise<BenchmarkResult> {
    this.logger.log(`Starting encryption benchmark for ${algorithm} with ${iterations} iterations`);
    
    const encryptDurations: number[] = [];
    const decryptDurations: number[] = [];
    const key = this.quantumEncryptionService.generateRandomKey();
    const testData = new Uint8Array(dataSize);
    crypto.getRandomValues(testData);
    
    for (let i = 0; i < iterations; i++) {
      // Benchmark encryption
      const encryptStart = Date.now();
      try {
        await this.quantumEncryptionService.encrypt(testData, key, algorithm);
        const encryptDuration = Date.now() - encryptStart;
        encryptDurations.push(encryptDuration);
        
        this.cryptoAgilityService.recordMetric({
          algorithm,
          operation: 'encrypt',
          duration: encryptDuration,
          keySize: key.length,
          dataSize,
          timestamp: new Date(),
        });
      } catch (error: any) {
        this.logger.error(`Encrypt benchmark iteration ${i} failed: ${error.message}`);
      }
      
      // Benchmark decryption
      const decryptStart = Date.now();
      try {
        const encrypted = await this.quantumEncryptionService.encrypt(testData, key, algorithm);
        await this.quantumEncryptionService.decrypt(encrypted.encryptedData, key);
        const decryptDuration = Date.now() - decryptStart;
        decryptDurations.push(decryptDuration);
        
        this.cryptoAgilityService.recordMetric({
          algorithm,
          operation: 'decrypt',
          duration: decryptDuration,
          keySize: key.length,
          dataSize,
          timestamp: new Date(),
        });
      } catch (error: any) {
        this.logger.error(`Decrypt benchmark iteration ${i} failed: ${error.message}`);
      }
    }
    
    // Return combined result for encryption
    return this.calculateBenchmarkResult(algorithm, "encrypt", encryptDurations, iterations, dataSize);
  }

  async runFullBenchmark(): Promise<BenchmarkReport> {
    this.logger.log('Starting full PQC benchmark suite');
    
    const keyExchangeResults: BenchmarkResult[] = [];
    const signatureResults: BenchmarkResult[] = [];
    const encryptionResults: BenchmarkResult[] = [];
    
    // Benchmark key exchange algorithms
    const keAlgorithms = [PQCAlgorithm.ML_KEM_1024, PQCAlgorithm.ML_KEM_768];
    for (const algo of keAlgorithms) {
      try {
        const result = await this.benchmarkKeyExchange(algo, 50);
        keyExchangeResults.push(result);
      } catch (error: any) {
        this.logger.error(`Key exchange benchmark failed for ${algo}: ${error.message}`);
      }
    }
    
    // Benchmark signature algorithms
    const sigAlgorithms = [PQCAlgorithm.ML_DSA_65, PQCAlgorithm.ML_DSA_87];
    for (const algo of sigAlgorithms) {
      try {
        const result = await this.benchmarkSignature(algo, 50);
        signatureResults.push(result);
      } catch (error: any) {
        this.logger.error(`Signature benchmark failed for ${algo}: ${error.message}`);
      }
    }
    
    // Benchmark encryption algorithms
    const encAlgorithms = [EncryptionAlgorithm.AES_256_GCM];
    for (const algo of encAlgorithms) {
      try {
        const result = await this.benchmarkEncryption(algo, 100);
        encryptionResults.push(result);
      } catch (error: any) {
        this.logger.error(`Encryption benchmark failed for ${algo}: ${error.message}`);
      }
    }
    
    // Calculate summary
    const allResults = [...keyExchangeResults, ...signatureResults, ...encryptionResults];
    const totalOperations = allResults.reduce((sum, r) => sum + r.iterations, 0);
    const totalDuration = allResults.reduce((sum, r) => sum + r.averageDuration * r.iterations, 0);
    
    const sortedBySpeed = [...allResults].sort((a, b) => a.averageDuration - b.averageDuration);
    const fastestAlgorithm = sortedBySpeed[0]?.algorithm || 'N/A';
    const slowestAlgorithm = sortedBySpeed[sortedBySpeed.length - 1]?.algorithm || 'N/A';
    
    const report: BenchmarkReport = {
      keyExchange: keyExchangeResults,
      signatures: signatureResults,
      encryption: encryptionResults,
      summary: {
        totalOperations,
        totalDuration,
        fastestAlgorithm,
        slowestAlgorithm,
      },
    };
    
    this.logger.log('Full benchmark suite completed');
    return report;
  }

  async compareWithClassical(): Promise<{
    classical: BenchmarkResult[];
    postQuantum: BenchmarkResult[];
    speedupRatio: Record<string, number>;
  }> {
    this.logger.log('Comparing classical vs post-quantum algorithms');
    
    const classical: BenchmarkResult[] = [];
    const postQuantum: BenchmarkResult[] = [];
    const speedupRatio: Record<string, number> = {};
    
    // Compare key exchange
    try {
      const classicalKE = await this.benchmarkKeyExchange(PQCAlgorithm.X25519, 50);
      const pqKE = await this.benchmarkKeyExchange(PQCAlgorithm.ML_KEM_1024, 50);
      
      classical.push(classicalKE);
      postQuantum.push(pqKE);
      speedupRatio['key-exchange'] = classicalKE.averageDuration / pqKE.averageDuration;
    } catch (error: any) {
      this.logger.error(`Key exchange comparison failed: ${error.message}`);
    }
    
    // Compare signatures
    try {
      const classicalSig = await this.benchmarkSignature(PQCAlgorithm.ED25519, 50);
      const pqSig = await this.benchmarkSignature(PQCAlgorithm.ML_DSA_65, 50);
      
      classical.push(classicalSig);
      postQuantum.push(pqSig);
      speedupRatio['signature'] = classicalSig.averageDuration / pqSig.averageDuration;
    } catch (error: any) {
      this.logger.error(`Signature comparison failed: ${error.message}`);
    }
    
    return { classical, postQuantum, speedupRatio };
  }

  private calculateBenchmarkResult(
    algorithm: string,
    operation: string,
    durations: number[],
    iterations: number,
    dataSize?: number,
  ): BenchmarkResult {
    if (durations.length === 0) {
      throw new Error('No successful benchmark iterations');
    }
    
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const throughput = 1000 / averageDuration; // operations per second
    
    return {
      algorithm,
      operation,
      averageDuration,
      minDuration,
      maxDuration,
      iterations: durations.length,
      throughput,
      dataSize,
      timestamp: new Date(),
    };
  }

  async getHistoricalMetrics(
    algorithm?: string,
    operation?: string,
    limit: number = 100,
  ): Promise<CryptoMetrics[]> {
    const metrics = this.cryptoAgilityService.getMetrics(algorithm, operation);
    return metrics.slice(-limit);
  }

  async getPerformanceTrend(
    algorithm: string,
    operation: string,
    hours: number = 24,
  ): Promise<{
    algorithm: string;
    operation: string;
    trend: Array<{ timestamp: Date; averageDuration: number }>;
    improvement: number; // percentage
  }> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const metrics = this.cryptoAgilityService.getMetrics(algorithm, operation)
      .filter(m => m.timestamp >= cutoff);
    
    if (metrics.length < 2) {
      return {
        algorithm,
        operation,
        trend: [],
        improvement: 0,
      };
    }
    
    // Group by hour
    const hourlyGroups = new Map<number, number[]>();
    for (const metric of metrics) {
      const hour = Math.floor(metric.timestamp.getTime() / (60 * 60 * 1000));
      if (!hourlyGroups.has(hour)) {
        hourlyGroups.set(hour, []);
      }
      hourlyGroups.get(hour)!.push(metric.duration);
    }
    
    const trend = Array.from(hourlyGroups.entries())
      .map(([hour, durations]) => ({
        timestamp: new Date(hour * 60 * 60 * 1000),
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate improvement (first vs last)
    const first = trend[0]?.averageDuration || 0;
    const last = trend[trend.length - 1]?.averageDuration || 0;
    const improvement = first > 0 ? ((first - last) / first) * 100 : 0;
    
    return {
      algorithm,
      operation,
      trend,
      improvement,
    };
  }
}
