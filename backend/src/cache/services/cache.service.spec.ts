import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { L1CacheService } from './l1-cache.service';
import { L2CacheService } from './l2-cache.service';
import { L3CacheService } from './l3-cache.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { CacheStampedeProtection } from './cache-stampede-protection.service';

describe('CacheService', () => {
  let service: CacheService;
  let l1Cache: L1CacheService;
  let l2Cache: L2CacheService;
  let l3Cache: L3CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: L1CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
            has: jest.fn(),
            getStats: jest.fn(),
            setTags: jest.fn(),
          },
        },
        {
          provide: L2CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
            has: jest.fn(),
            getStats: jest.fn(),
            setTags: jest.fn(),
            getByTag: jest.fn(),
            getKeys: jest.fn(),
            getSize: jest.fn(),
            publishInvalidation: jest.fn(),
            subscribeInvalidation: jest.fn(),
            invalidateByTag: jest.fn(),
            healthCheck: jest.fn(),
          },
        },
        {
          provide: L3CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
            has: jest.fn(),
            getStats: jest.fn(),
          },
        },
        {
          provide: CacheInvalidationService,
          useValue: {
            invalidate: jest.fn(),
            invalidateByTag: jest.fn(),
            invalidatePattern: jest.fn(),
          },
        },
        {
          provide: CacheStampedeProtection,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    l1Cache = module.get<L1CacheService>(L1CacheService);
    l2Cache = module.get<L2CacheService>(L2CacheService);
    l3Cache = module.get<L3CacheService>(L3CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return value from L1 cache', async () => {
      (l1Cache.get as jest.Mock).mockResolvedValue('l1-value');
      const value = await service.get('test-key');
      expect(value).toBe('l1-value');
      expect(l1Cache.get).toHaveBeenCalledWith('test-key');
    });

    it('should return value from L2 cache if L1 misses', async () => {
      (l1Cache.get as jest.Mock).mockResolvedValue(null);
      (l2Cache.get as jest.Mock).mockResolvedValue('l2-value');
      (l1Cache.set as jest.Mock).mockResolvedValue(undefined);
      
      const value = await service.get('test-key');
      expect(value).toBe('l2-value');
      expect(l2Cache.get).toHaveBeenCalledWith('test-key');
      expect(l1Cache.set).toHaveBeenCalledWith('test-key', 'l2-value');
    });

    it('should return value from L3 cache if L1 and L2 miss', async () => {
      (l1Cache.get as jest.Mock).mockResolvedValue(null);
      (l2Cache.get as jest.Mock).mockResolvedValue(null);
      (l3Cache.get as jest.Mock).mockResolvedValue('l3-value');
      (l2Cache.set as jest.Mock).mockResolvedValue(undefined);
      (l1Cache.set as jest.Mock).mockResolvedValue(undefined);
      
      const value = await service.get('test-key');
      expect(value).toBe('l3-value');
      expect(l3Cache.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null if all layers miss', async () => {
      (l1Cache.get as jest.Mock).mockResolvedValue(null);
      (l2Cache.get as jest.Mock).mockResolvedValue(null);
      (l3Cache.get as jest.Mock).mockResolvedValue(null);
      
      const value = await service.get('test-key');
      expect(value).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in all layers', async () => {
      (l1Cache.set as jest.Mock).mockResolvedValue(undefined);
      (l2Cache.set as jest.Mock).mockResolvedValue(undefined);
      (l3Cache.set as jest.Mock).mockResolvedValue(undefined);
      
      await service.set('test-key', 'test-value', 3600);
      
      expect(l1Cache.set).toHaveBeenCalledWith('test-key', 'test-value', 3600);
      expect(l2Cache.set).toHaveBeenCalledWith('test-key', 'test-value', 3600);
      expect(l3Cache.set).toHaveBeenCalledWith('test-key', 'test-value', 3600);
    });
  });

  describe('delete', () => {
    it('should delete from all layers', async () => {
      (l1Cache.delete as jest.Mock).mockResolvedValue(undefined);
      (l2Cache.delete as jest.Mock).mockResolvedValue(undefined);
      (l3Cache.delete as jest.Mock).mockResolvedValue(undefined);
      
      await service.delete('test-key');
      
      expect(l1Cache.delete).toHaveBeenCalledWith('test-key');
      expect(l2Cache.delete).toHaveBeenCalledWith('test-key');
      expect(l3Cache.delete).toHaveBeenCalledWith('test-key');
    });
  });

  describe('clear', () => {
    it('should clear all layers', async () => {
      (l1Cache.clear as jest.Mock).mockResolvedValue(undefined);
      (l2Cache.clear as jest.Mock).mockResolvedValue(undefined);
      (l3Cache.clear as jest.Mock).mockResolvedValue(undefined);
      
      await service.clear();
      
      expect(l1Cache.clear).toHaveBeenCalled();
      expect(l2Cache.clear).toHaveBeenCalled();
      expect(l3Cache.clear).toHaveBeenCalled();
    });
  });

  describe('has', () => {
    it('should return true if key exists in any layer', async () => {
      (l1Cache.has as jest.Mock).mockResolvedValue(true);
      const has = await service.has('test-key');
      expect(has).toBe(true);
    });

    it('should return false if key does not exist in any layer', async () => {
      (l1Cache.has as jest.Mock).mockResolvedValue(false);
      (l2Cache.has as jest.Mock).mockResolvedValue(false);
      (l3Cache.has as jest.Mock).mockResolvedValue(false);
      
      const has = await service.has('test-key');
      expect(has).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return combined stats from all layers', async () => {
      (l1Cache.getStats as jest.Mock).mockResolvedValue({
        hits: 100,
        misses: 50,
        size: 10,
        evictions: 5,
        hitRate: 0.67,
        avgLatency: 0.1,
      });
      (l2Cache.getStats as jest.Mock).mockResolvedValue({
        hits: 200,
        misses: 100,
        size: 1000,
        evictions: 50,
        hitRate: 0.67,
        avgLatency: 5,
      });
      (l3Cache.getStats as jest.Mock).mockResolvedValue({
        hits: 300,
        misses: 150,
        size: 0,
        evictions: 0,
        hitRate: 0.67,
        avgLatency: 50,
      });
      
      const stats = await service.getStats();
      
      expect(stats.l1.hits).toBe(100);
      expect(stats.l2.hits).toBe(200);
      expect(stats.l3.hits).toBe(300);
      expect(stats.overall.totalHits).toBe(600);
      expect(stats.overall.totalMisses).toBe(300);
    });
  });

  describe('healthCheck', () => {
    it('should return health status of all layers', async () => {
      (l2Cache.healthCheck as jest.Mock).mockResolvedValue(true);
      
      const health = await service.healthCheck();
      
      expect(health.l1).toBe(true);
      expect(health.l2).toBe(true);
      expect(health.l3).toBe(true);
    });
  });
});
