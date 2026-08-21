import { Test, TestingModule } from '@nestjs/testing';
import { L1CacheService } from './l1-cache.service';

describe('L1CacheService', () => {
  let service: L1CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [L1CacheService],
    }).compile();

    service = module.get<L1CacheService>(L1CacheService);
  });

  afterEach(() => {
    service.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get and set', () => {
    it('should set and get a value', async () => {
      await service.set('test-key', 'test-value');
      const value = await service.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent key', async () => {
      const value = await service.get('non-existent-key');
      expect(value).toBeNull();
    });

    it('should expire values after TTL', async () => {
      await service.set('test-key', 'test-value', 100); // 100ms TTL
      await new Promise(resolve => setTimeout(resolve, 150));
      const value = await service.get('test-key');
      expect(value).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      await service.set('test-key', 'test-value');
      await service.delete('test-key');
      const value = await service.get('test-key');
      expect(value).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all keys', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.clear();
      const value1 = await service.get('key1');
      const value2 = await service.get('key2');
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await service.set('test-key', 'test-value');
      const has = await service.has('test-key');
      expect(has).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const has = await service.has('non-existent-key');
      expect(has).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await service.set('key1', 'value1');
      await service.get('key1');
      await service.get('non-existent-key');
      
      const stats = await service.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
    });
  });

  describe('setTags and getByTag', () => {
    it('should set tags and retrieve keys by tag', async () => {
      await service.set('key1', 'value1');
      await service.setTags('key1', ['tag1', 'tag2']);
      
      const keys = await service.getByTag('tag1');
      expect(keys).toContain('key1');
    });
  });

  describe('getKeys', () => {
    it('should return all keys', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      
      const keys = await service.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('getSize', () => {
    it('should return cache size', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      
      const size = await service.getSize();
      expect(size).toBe(2);
    });
  });
});
