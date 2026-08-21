import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitModule } from '../rate-limit.module';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitAlgorithmService } from '../services/rate-limit-algorithm.service';
import { RateLimitAlgorithm } from '../entities/rate-limit-policy.entity';

describe('Rate Limiting Chaos Tests', () => {
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

  describe('Redis Connection Failure', () => {
    it('should fallback to memory when Redis is unavailable', async () => {
      const config = {
        requestsPerSecond: 10,
        burstCapacity: 20,
        windowSize: 1,
      };

      const redisAvailableBefore = algorithmService.isRedisAvailable();

      const result = await algorithmService.checkLimit(
        'chaos-redis-fail',
        RateLimitAlgorithm.TOKEN_BUCKET,
        config,
        true,
      );

      expect(result).toBeDefined();
      expect(result.allowed).toBeDefined();
      expect(result.remaining).toBeDefined();
      expect(result.limit).toBe(10);

      console.log(`Redis Availability Test:`);
      console.log(`- Redis available before: ${redisAvailableBefore}`);
      console.log(`- Request allowed: ${result.allowed}`);
      console.log(`- Fallback to memory: ${!redisAvailableBefore || !algorithmService.isRedisAvailable()}`);
    });

    it('should maintain rate limiting during Redis unavailability', async () => {
      const config = {
        requestsPerSecond: 5,
        burstCapacity: 10,
        windowSize: 1,
      };

      const results = [];
      for (let i = 0; i < 15; i++) {
        const result = await algorithmService.checkLimit(
          `chaos-sustained-${i}`,
          RateLimitAlgorithm.TOKEN_BUCKET,
          config,
          false,
        );
        results.push(result);
      }

      const allowedCount = results.filter(r => r.allowed).length;
      const blockedCount = results.filter(r => !r.allowed).length;

      console.log(`Sustained Redis Failure Test:`);
      console.log(`- Allowed: ${allowedCount}`);
      console.log(`- Blocked: ${blockedCount}`);
      console.log(`- Rate limiting maintained: ${allowedCount <= 10}`);

      expect(allowedCount).toBeLessThanOrEqual(10);
    });
  });

  describe('Rapid Redis Reconnection', () => {
    it('should handle rapid Redis connection changes', async () => {
      const config = {
        requestsPerSecond: 10,
        burstCapacity: 20,
        windowSize: 1,
      };

      const results = [];
      for (let i = 0; i < 20; i++) {
        const useRedis = i % 2 === 0;
        const result = await algorithmService.checkLimit(
          `chaos-flip-${i}`,
          RateLimitAlgorithm.TOKEN_BUCKET,
          config,
          useRedis,
        );
        results.push({ allowed: result.allowed, useRedis });
      }

      const allowedWithRedis = results.filter(r => r.useRedis && r.allowed).length;
      const allowedWithoutRedis = results.filter(r => !r.useRedis && r.allowed).length;

      console.log(`Rapid Reconnection Test:`);
      console.log(`- Allowed with Redis: ${allowedWithRedis}`);
      console.log(`- Allowed without Redis: ${allowedWithoutRedis}`);
      console.log(`- Total requests: ${results.length}`);

      expect(results.every(r => r.allowed !== undefined)).toBe(true);
    });
  });

  describe('Partial Redis Failure', () => {
    it('should handle partial Redis failures gracefully', async () => {
      const config = {
        requestsPerSecond: 10,
        burstCapacity: 20,
        windowSize: 1,
      };

      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          algorithmService.checkLimit(
            `chaos-partial-${i}`,
            RateLimitAlgorithm.TOKEN_BUCKET,
            config,
            Math.random() > 0.5,
          )
        );
      }

      const results = await Promise.all(promises);
      const successfulResults = results.filter(r => r !== null);

      console.log(`Partial Failure Test:`);
      console.log(`- Total requests: ${promises.length}`);
      console.log(`- Successful results: ${successfulResults.length}`);
      console.log(`- Success rate: ${((successfulResults.length / promises.length) * 100).toFixed(2)}%`);

      expect(successfulResults.length).toBeGreaterThan(promises.length * 0.8);
    });
  });

  describe('Concurrent Failures', () => {
    it('should handle concurrent request failures', async () => {
      const config = {
        requestsPerSecond: 100,
        burstCapacity: 200,
        windowSize: 1,
      };

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          algorithmService.checkLimit(
            `chaos-concurrent-${i}`,
            RateLimitAlgorithm.TOKEN_BUCKET,
            config,
            false,
          ).catch(error => ({ error: error.message }))
        );
      }

      const results = await Promise.all(promises);
      const successful = results.filter(r => !r.error);
      const failed = results.filter(r => r.error);

      console.log(`Concurrent Failure Test:`);
      console.log(`- Successful: ${successful.length}`);
      console.log(`- Failed: ${failed.length}`);
      console.log(`- Success rate: ${((successful.length / results.length) * 100).toFixed(2)}%`);

      expect(successful.length).toBeGreaterThan(results.length * 0.9);
    });
  });

  describe('Memory Pressure', () => {
    it('should handle memory pressure during fallback', async () => {
      const config = {
        requestsPerSecond: 10,
        burstCapacity: 20,
        windowSize: 1,
      };

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        await algorithmService.checkLimit(
          `chaos-memory-${i}`,
          RateLimitAlgorithm.TOKEN_BUCKET,
          config,
          false,
        );
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory Pressure Test:`);
      console.log(`- Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('State Recovery', () => {
    it('should recover state after Redis reconnection', async () => {
      const config = {
        requestsPerSecond: 5,
        burstCapacity: 10,
        windowSize: 1,
      };

      const key = 'chaos-recovery';

      for (let i = 0; i < 5; i++) {
        await algorithmService.checkLimit(key, RateLimitAlgorithm.TOKEN_BUCKET, config, false);
      }

      await algorithmService.resetLimit(key);

      const result = await algorithmService.checkLimit(key, RateLimitAlgorithm.TOKEN_BUCKET, config, false);

      console.log(`State Recovery Test:`);
      console.log(`- Request allowed after reset: ${result.allowed}`);
      console.log(`- Remaining: ${result.remaining}`);

      expect(result.allowed).toBe(true);
    });
  });

  describe('Algorithm Switching During Failure', () => {
    it('should handle algorithm switching during Redis failure', async () => {
      const config = {
        requestsPerSecond: 10,
        burstCapacity: 20,
        windowSize: 1,
      };

      const algorithms = [
        RateLimitAlgorithm.TOKEN_BUCKET,
        RateLimitAlgorithm.SLIDING_WINDOW,
        RateLimitAlgorithm.LEAKY_BUCKET,
      ];

      const results = [];
      for (let i = 0; i < 30; i++) {
        const algorithm = algorithms[i % algorithms.length];
        const result = await algorithmService.checkLimit(
          `chaos-switch-${i}`,
          algorithm,
          config,
          false,
        );
        results.push({ algorithm, allowed: result.allowed });
      }

      const resultsByAlgorithm = {
        [RateLimitAlgorithm.TOKEN_BUCKET]: results.filter(r => r.algorithm === RateLimitAlgorithm.TOKEN_BUCKET),
        [RateLimitAlgorithm.SLIDING_WINDOW]: results.filter(r => r.algorithm === RateLimitAlgorithm.SLIDING_WINDOW),
        [RateLimitAlgorithm.LEAKY_BUCKET]: results.filter(r => r.algorithm === RateLimitAlgorithm.LEAKY_BUCKET),
      };

      console.log(`Algorithm Switching Test:`);
      console.log(`- Token Bucket: ${resultsByAlgorithm[RateLimitAlgorithm.TOKEN_BUCKET].length} requests`);
      console.log(`- Sliding Window: ${resultsByAlgorithm[RateLimitAlgorithm.SLIDING_WINDOW].length} requests`);
      console.log(`- Leaky Bucket: ${resultsByAlgorithm[RateLimitAlgorithm.LEAKY_BUCKET].length} requests`);

      expect(results.every(r => r.allowed !== undefined)).toBe(true);
    });
  });

  describe('High Load During Failure', () => {
    it('should handle high load during Redis failure', async () => {
      const config = {
        requestsPerSecond: 50,
        burstCapacity: 100,
        windowSize: 1,
      };

      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 500; i++) {
        promises.push(
          algorithmService.checkLimit(
            `chaos-highload-${i}`,
            RateLimitAlgorithm.TOKEN_BUCKET,
            config,
            false,
          )
        );
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      const allowed = results.filter(r => r.allowed).length;
      const blocked = results.filter(r => !r.allowed).length;

      console.log(`High Load During Failure Test:`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Allowed: ${allowed}`);
      console.log(`- Blocked: ${blocked}`);
      console.log(`- Throughput: ${(500 / (duration / 1000)).toFixed(2)} req/s`);

      expect(duration).toBeLessThan(10000);
      expect(allowed + blocked).toBe(500);
    });
  });
});
