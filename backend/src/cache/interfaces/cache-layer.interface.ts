export interface CacheLayer {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats(): Promise<CacheStats>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
  hitRate: number;
  avgLatency: number;
}

export interface CacheInvalidationStrategy {
  timeBased?: {
    ttl: number;
    refreshTtl: number;
  };
  eventBased?: {
    events: string[];
    channels: string[];
  };
  tagBased?: {
    tags: string[];
  };
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface AccessPattern {
  key: string;
  frequency: number;
  lastAccessed: number;
  predictedNextAccess: number;
  avgAccessInterval: number;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  avgLatency: number;
  size: number;
  evictionCount: number;
  keyspaceHits: number;
  keyspaceMisses: number;
  l1Hits: number;
  l2Hits: number;
  l3Hits: number;
  totalRequests: number;
}

export interface CacheWarmupConfig {
  patterns: string[];
  schedule: string;
  enabled: boolean;
  maxConcurrent: number;
}

export interface CacheConfig {
  l1: {
    maxSize: number;
    defaultTtl: number;
  };
  l2: {
    defaultTtl: number;
    clusterEnabled: boolean;
    clusterNodes?: string[];
  };
  l3: {
    enabled: boolean;
    provider: 'cloudflare' | 'aws' | 'custom';
    defaultTtl: number;
  };
  invalidation: CacheInvalidationStrategy;
  warmup: CacheWarmupConfig;
  predictive: {
    enabled: boolean;
    analysisInterval: number;
    preloadThreshold: number;
  };
}
