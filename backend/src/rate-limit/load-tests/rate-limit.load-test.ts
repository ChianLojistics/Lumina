import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitModule } from '../rate-limit.module';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitAlgorithmService } from '../services/rate-limit-algorithm.service';
import { RateLimitAlgorithm } from '../entities/rate-limit-policy.entity';

describe('Rate Limiting Load Tests', () => {
  let service: RateLimitService;
  let algorithmService: RateLimitAlgorithmService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RateLimitModule],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    algorithmService = module.get<RateLimitAlgorithmService>(RateLimitAlgorithmService);
  });

  afterAll(async () => {
    await algorithmService.cleanup();
  });

  describe('High Throughput Token Bucket', () => {
    it('should handle 1000 requests per second', async () => {
      const config = {
        requestsPerSecond: 1000,
        burstCapacity: 2000,
        windowSize: 1,
      };

      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 1000; i++) {
        promises.push(
          algorithmService.checkLimit(`load-test-${i}`, RateLimitAlgorithm.TOKEN_BUCKET, config, false)
        );
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      const allowedCount = results.filter(r => r.allowed).length;
      const blockedCount = results.filter(r => !r.allowed).length;

      console.log(`Token Bucket Load Test:`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Allowed: ${allowedCount}`);
      console.log(`- Blocked: ${blockedCount}`);
      console.log(`- Throughput: ${(1000 / (duration / 1000)).toFixed(2)} req/s`);

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(allowedCount).toBeGreaterThan(0);
    });

    it('should handle burst traffic', async () => {
      const config = {
        requestsPerSecond: 100,
        burstCapacity: 500,
        windowSize: 1,
      };

      const promises = [];
      for (let i = 0; i < 500; i++) {
        promises.push(
          algorithmService.checkLimit(`burst-test-${i}`, RateLimitAlgorithm.TOKEN_BUCKET, config, false)
        );
      }

      const results = await Promise.all(promises);
      const allowedCount = results.filter(r => r.allowed).length;

      console.log(`Burst Test - Allowed: ${allowedCount}/500`);
      expect(allowedCount).toBeLessThanOrEqual(500);
    });
  });

  describe('High Throughput Sliding Window', () => {
    it('should handle 1000 requests per second', async () => {
      const config = {
        requestsPerSecond: 1000,
        burstCapacity: 1000,
        windowSize: 1,
      };

      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 1000; i++) {
        promises.push(
          algorithmService.checkLimit(`sliding-load-${i}`, RateLimitAlgorithm.SLIDING_WINDOW, config, false)
        );
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      const allowedCount = results.filter(r => r.allowed).length;

      console.log(`Sliding Window Load Test:`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Allowed: ${allowedCount}`);
      console.log(`- Throughput: ${(1000 / (duration / 1000)).toFixed(2)} req/s`);

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('High Throughput Leaky Bucket', () => {
    it('should handle 1000 requests per second', async () => {
      const config = {
        requestsPerSecond: 1000,
        burstCapacity: 1000,
        windowSize: 1,
      };

      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 1000; i++) {
        promises.push(
          algorithmService.checkLimit(`leaky-load-${i}`, RateLimitAlgorithm.LEAKY_BUCKET, config, false)
        );
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      const allowedCount = results.filter(r => r.allowed).length;

      console.log(`Leaky Bucket Load Test:`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Allowed: ${allowedCount}`);
      console.log(`- Throughput: ${(1000 / (duration / 1000)).toFixed(2)} req/s`);

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Concurrent Users', () => {
    it('should handle 100 concurrent users', async () => {
      const config = {
        requestsPerSecond: 10,
        burstCapacity: 20,
        windowSize: 1,
      };

      const userPromises = [];
      for (let user = 0; user < 100; user++) {
        const requestPromises = [];
        for (let req = 0; req < 10; req++) {
          requestPromises.push(
            algorithmService.checkLimit(`user-${user}`, RateLimitAlgorithm.TOKEN_BUCKET, config, false)
          );
        }
        userPromises.push(Promise.all(requestPromises));
      }

      const startTime = Date.now();
      const userResults = await Promise.all(userPromises);
      const duration = Date.now() - startTime;

      let totalAllowed = 0;
      let totalBlocked = 0;
      for (const results of userResults) {
        totalAllowed += results.filter(r => r.allowed).length;
        totalBlocked += results.filter(r => !r.allowed).length;
      }

      console.log(`Concurrent Users Test:`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Total Allowed: ${totalAllowed}`);
      console.log(`- Total Blocked: ${totalBlocked}`);
      console.log(`- Users: 100`);
      console.log(`- Requests per user: 10`);

      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory with many unique keys', async () => {
      const config = {
        requestsPerSecond: 10,
        burstCapacity: 20,
        windowSize: 1,
      };

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 10000; i++) {
        await algorithmService.checkLimit(`memory-test-${i}`, RateLimitAlgorithm.TOKEN_BUCKET, config, false);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory Efficiency Test:`);
      console.log(`- Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Unique keys: 10000`);

      // Memory increase should be reasonable (less than 100MB for 10000 keys)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Sustained Load', () => {
    it('should handle sustained load over time', async () => {
      const config = {
        requestsPerSecond: 100,
        burstCapacity: 200,
        windowSize: 1,
      };

      const startTime = Date.now();
      let totalAllowed = 0;
      let totalBlocked = 0;

      for (let second = 0; second < 10; second++) {
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(
            algorithmService.checkLimit(`sustained-${second}-${i}`, RateLimitAlgorithm.TOKEN_BUCKET, config, false)
          );
        }

        const results = await Promise.all(promises);
        totalAllowed += results.filter(r => r.allowed).length;
        totalBlocked += results.filter(r => !r.allowed).length;

        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between batches
      }

      const duration = Date.now() - startTime;

      console.log(`Sustained Load Test:`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Total Allowed: ${totalAllowed}`);
      console.log(`- Total Blocked: ${totalBlocked}`);
      console.log(`- Average rate: ${(1000 / (duration / 1000)).toFixed(2)} req/s`);

      expect(duration).toBeLessThan(15000);
    });
  });
});
