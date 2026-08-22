# Multi-Layer Caching Architecture

## Overview

Lumina implements a sophisticated multi-layer caching system designed to optimize performance, reduce database load, and handle traffic spikes efficiently. The system consists of three cache layers:

- **L1 (In-Memory)**: Fast, small-capacity cache using LRU eviction
- **L2 (Redis)**: Distributed cache with clustering support
- **L3 (CDN)**: Edge cache for static/semi-static data

## Architecture Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                    Cache Service                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │   L1    │──│   L2    │──│   L3    │                  │
│  │ In-Mem  │  │  Redis  │  │   CDN   │                  │
│  └─────────┘  └─────────┘  └─────────┘                  │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│  Database   │
└─────────────┘
```

## Cache Layers

### L1 Cache (In-Memory)

**Implementation**: `L1CacheService` using `lru-cache`

**Characteristics**:
- Very fast access (sub-millisecond)
- Small capacity (default: 1000 entries)
- Per-instance (not shared across instances)
- LRU eviction policy
- Default TTL: 60 seconds

**Use Cases**:
- Frequently accessed configuration data
- Session data
- Rate limiting counters
- Price oracle data

**Configuration**:
```env
L1_CACHE_MAX_SIZE=1000
L1_CACHE_DEFAULT_TTL=60
```

### L2 Cache (Redis)

**Implementation**: `L2CacheService` using `ioredis`

**Characteristics**:
- Fast access (millisecond range)
- Large capacity (limited by Redis memory)
- Distributed (shared across instances)
- Supports clustering for high availability
- Default TTL: 3600 seconds (1 hour)
- Pub/sub for cache invalidation

**Use Cases**:
- User sessions (distributed)
- Payment data
- Merchant configurations
- Exchange rates
- Blockchain data

**Configuration**:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
L2_CACHE_DEFAULT_TTL=3600
REDIS_CLUSTER_ENABLED=false
REDIS_CLUSTER_NODES=localhost:6379
```

### L3 Cache (CDN)

**Implementation**: `L3CacheService` with provider abstraction

**Characteristics**:
- Slower than L1/L2 but still fast (edge locations)
- Very large capacity
- Global distribution
- Long TTL (default: 86400 seconds - 24 hours)
- API-based invalidation

**Supported Providers**:
- Cloudflare
- AWS CloudFront
- Custom CDN

**Use Cases**:
- Static assets
- Semi-static content
- Public API responses
- Marketing content

**Configuration**:
```env
L3_CACHE_ENABLED=false
L3_CACHE_PROVIDER=custom
L3_CACHE_DEFAULT_TTL=86400
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_API_KEY=
AWS_CLOUDFRONT_DISTRIBUTION_ID=
CUSTOM_CDN_INVALIDATION_URL=
```

## Cache Invalidation Strategies

### Time-Based (TTL)

Each cache entry has a Time-To-Live (TTL) that automatically expires the entry after a specified duration.

```typescript
await cacheService.set('key', value, 3600); // Expires in 1 hour
```

### Event-Based

Cache entries are invalidated in real-time when data changes using Redis pub/sub.

```typescript
await invalidationService.invalidate('key');
```

### Tag-Based

Group related cache entries by tags for bulk invalidation.

```typescript
await cacheService.set('merchant:123:config', config, 3600, ['merchant:123']);
await invalidationService.invalidateByTag('merchant:123');
```

## Cache Key Strategy

### Key Format

Cache keys follow a consistent format: `{prefix}:{version}:{resource}:{identifier}`

```typescript
// Examples
lumina:v1:merchant:123:config
lumina:v1:payment:abc123
lumina:v1:exchange:BTC:USD
```

### Key Generation

Use the `CacheKeyStrategy` service for consistent key generation:

```typescript
const key = keyStrategy.generateMerchantKey('123', 'config');
const key = keyStrategy.generatePaymentKey('abc123');
const key = keyStrategy.generateExchangeRateKey('BTC', 'USD');
```

### Configuration

```env
CACHE_KEY_PREFIX=lumina
CACHE_KEY_VERSION=v1
```

## Cache Warming

Cache warming preloads critical data during low traffic periods to ensure cache is ready for peak loads.

### Configuration

```env
CACHE_WARMUP_ENABLED=true
CACHE_WARMUP_PATTERNS=merchant:config:*,payment:methods:*,exchange:rates:*
CACHE_WARMUP_SCHEDULE=0 * * * *
CACHE_WARMUP_MAX_CONCURRENT=10
```

### Manual Trigger

```typescript
await warmupService.warmupCriticalData();
await warmupService.warmupKeys(['key1', 'key2', 'key3']);
```

## Predictive Preloading

The system analyzes access patterns and predicts which data will be accessed next, preloading it before actual requests.

### Configuration

```env
PREDICTIVE_CACHE_ENABLED=true
PREDICTIVE_CACHE_ANALYSIS_INTERVAL=300000
PREDICTIVE_CACHE_PRELOAD_THRESHOLD=60000
```

### Manual Trigger

```typescript
await predictiveService.analyzePatterns();
await predictiveService.preload('key');
```

## Cache Stampede Protection

Prevents multiple simultaneous requests from fetching the same uncached data using distributed locks.

### Implementation

```typescript
const value = await cacheService.get('key', async () => {
  // This function is only called once per key
  return await database.fetch(key);
});
```

## Monitoring and Metrics

### Prometheus Metrics

The caching system exports the following Prometheus metrics:

- `cache_l1_size`: Current L1 cache size
- `cache_l2_size`: Current L2 cache size
- `cache_l1_hits_total`: Total L1 cache hits
- `cache_l1_misses_total`: Total L1 cache misses
- `cache_l2_hits_total`: Total L2 cache hits
- `cache_l2_misses_total`: Total L2 cache misses
- `cache_l3_hits_total`: Total L3 cache hits
- `cache_l3_misses_total`: Total L3 cache misses
- `cache_hit_rate`: Overall cache hit rate
- `cache_latency_seconds`: Cache operation latency (by layer)
- `cache_evictions_total`: Total cache evictions

### API Endpoints

```typescript
GET  /api/cache/stats          // Get cache statistics
GET  /api/cache/metrics        // Get cache metrics
GET  /api/cache/keys           // Get cache keys
GET  /api/cache/:key           // Get value by key
POST /api/cache/:key           // Set value
DELETE /api/cache/:key         // Delete key
POST /api/cache/invalidate/tag/:tag  // Invalidate by tag
POST /api/cache/warmup         // Trigger cache warmup
POST /api/cache/preload        // Preload specific key
GET  /api/cache/health         // Health check
```

## Best Practices

### 1. Choose Appropriate TTL

- **Hot data**: Short TTL (30-60 seconds) - L1
- **Warm data**: Medium TTL (5-15 minutes) - L2
- **Cold data**: Long TTL (1-24 hours) - L3

### 2. Use Tags for Related Data

```typescript
// Good: Tag related data
await cacheService.set('merchant:123:config', config, 3600, ['merchant:123']);
await cacheService.set('merchant:123:rates', rates, 3600, ['merchant:123']);

// Invalidate all merchant data at once
await invalidationService.invalidateByTag('merchant:123');
```

### 3. Handle Cache Misses Gracefully

```typescript
const value = await cacheService.get('key');
if (value === null) {
  // Fetch from database
  const dbValue = await database.get('key');
  await cacheService.set('key', dbValue);
  return dbValue;
}
return value;
```

### 4. Monitor Cache Hit Rates

Aim for:
- L1 hit rate: > 80%
- Overall hit rate: > 70%

### 5. Use Cache Stampede Protection

For expensive operations, always use stampede protection:

```typescript
const result = await cacheService.get('expensive-key', async () => {
  return await expensiveOperation();
});
```

### 6. Warm Critical Data

Configure cache warming for:
- Merchant configurations
- Payment methods
- Exchange rates
- Frequently accessed static data

### 7. Use Consistent Key Naming

Follow the key strategy pattern:
- Use lowercase
- Use colons as separators
- Include resource type and identifier
- Add version prefix for cache busting

### 8. Test Cache Behavior

Write tests for:
- Cache hits and misses
- TTL expiration
- Tag-based invalidation
- Multi-layer coordination
- Stampede protection

## Troubleshooting

### Low Cache Hit Rate

**Possible Causes**:
- TTL too short
- Cache size too small
- Poor key distribution
- Not warming critical data

**Solutions**:
- Increase TTL for frequently accessed data
- Increase cache size
- Review key patterns
- Configure cache warming

### High Memory Usage

**Possible Causes**:
- Cache size too large
- TTL too long
- Memory leaks

**Solutions**:
- Reduce cache size
- Decrease TTL
- Monitor eviction rates
- Check for memory leaks

### Cache Stampede

**Possible Causes**:
- Not using stampede protection
- High traffic on uncached keys

**Solutions**:
- Enable stampede protection
- Warm critical data
- Use predictive preloading

## Performance Considerations

### Latency by Layer

- L1 (In-Memory): < 1ms
- L2 (Redis): 1-5ms
- L3 (CDN): 50-200ms
- Database: 100-500ms+

### Capacity Planning

- L1: 1000-10000 entries per instance
- L2: 1-10GB per Redis instance
- L3: Unlimited (CDN)

### Scaling

- L1: Scales horizontally (per instance)
- L2: Scale using Redis Cluster
- L3: Scales automatically (CDN)

## Security Considerations

1. **Never cache sensitive data** without encryption
2. **Use Redis authentication** in production
3. **Enable TLS** for Redis connections
4. **Restrict cache API endpoints** to internal services
5. **Validate cache keys** to prevent injection attacks

## Migration Guide

### From Simple In-Memory Cache

```typescript
// Before
private cache = new Map();

// After
constructor(private cacheService: CacheService) {}

async getData(key: string) {
  return await this.cacheService.get(key);
}
```

### From Redis-Only Cache

```typescript
// Before
await redis.set(key, value, 'EX', ttl);

// After
await this.cacheService.set(key, value, ttl);
// Automatically handles L1, L2, L3
```

## References

- [Redis Documentation](https://redis.io/documentation)
- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [LRU Cache](https://github.com/isaacs/node-lru-cache)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
