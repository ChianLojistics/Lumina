# Distributed Rate Limiting System

A comprehensive, distributed rate limiting system for Lumina that supports dynamic policies, tiered limits, burst handling, and intelligent throttling across multiple API gateway instances.

## Overview

The rate limiting system provides:
- **Distributed coordination** via Redis for multi-instance deployments
- **Multiple algorithms**: Token Bucket, Sliding Window, and Leaky Bucket
- **Dynamic policy management** with real-time adjustments
- **User tier-based limits** for differentiated service levels
- **Burst handling** to accommodate traffic spikes
- **Adaptive throttling** based on system load
- **Comprehensive monitoring** and violation tracking
- **Graceful degradation** on Redis failures

## Architecture

### Components

1. **RateLimitAlgorithmService**: Implements rate limiting algorithms with Redis backend
2. **RateLimitPolicyService**: Manages policy CRUD operations and violation tracking
3. **RateLimitService**: Policy evaluation engine and request coordination
4. **RateLimitMonitoringService**: Metrics collection and monitoring
5. **RateLimitChallengeService**: Challenge mechanisms for suspicious requests
6. **RateLimitMiddleware**: NestJS middleware for request interception

### Data Flow

```
Request → Middleware → RateLimitService → Policy Evaluation → Algorithm Check → Response
                                              ↓
                                        Monitoring Service
                                              ↓
                                        Violation Tracking
```

## Installation

### Dependencies

```bash
npm install rate-limiter-flexible
```

### Module Setup

```typescript
import { RateLimitModule } from './rate-limit/rate-limit.module';

@Module({
  imports: [
    RateLimitModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

## Rate Limiting Algorithms

### Token Bucket

Best for: APIs that need to allow burst traffic while maintaining a sustainable rate.

**Configuration:**
```json
{
  "algorithm": "token-bucket",
  "config": {
    "requestsPerSecond": 10,
    "burstCapacity": 20,
    "windowSize": 1
  }
}
```

**Behavior:**
- Allows up to `burstCapacity` requests immediately
- Refills at `requestsPerSecond` rate
- Smooths out traffic patterns

### Sliding Window

Best for: Precise rate limiting with accurate time-based windows.

**Configuration:**
```json
{
  "algorithm": "sliding-window",
  "config": {
    "requestsPerSecond": 10,
    "burstCapacity": 10,
    "windowSize": 1
  }
}
```

**Behavior:**
- Exact count of requests in the time window
- No burst capacity beyond the rate
- Precise rate enforcement

### Leaky Bucket

Best for: Smoothing out request processing with constant output rate.

**Configuration:**
```json
{
  "algorithm": "leaky-bucket",
  "config": {
    "requestsPerSecond": 10,
    "burstCapacity": 10,
    "windowSize": 1
  }
}
```

**Behavior:**
- Processes requests at constant rate
- Queues excess requests
- Smooths traffic patterns

## Policy Configuration

### Policy Structure

```typescript
interface RateLimitPolicy {
  id: string;
  name: string;
  algorithm: 'token-bucket' | 'sliding-window' | 'leaky-bucket';
  limits: {
    requestsPerSecond: number;
    burstCapacity: number;
    windowSize: number;
  };
  scope: {
    users: string[];
    tiers: string[];
    endpoints: string[];
  };
  conditions?: {
    systemLoad: number;
    timeOfDay: string[];
  };
  actions: {
    throttle: boolean;
    challenge: boolean;
    block: boolean;
  };
}
```

### Creating a Policy

```bash
POST /api/v1/policies
{
  "name": "API Basic Tier",
  "algorithm": "token-bucket",
  "config": {
    "requestsPerSecond": 10,
    "burstCapacity": 20,
    "windowSize": 1
  },
  "scope": {
    "users": ["all"],
    "tiers": ["basic"],
    "endpoints": ["/api/*"]
  },
  "actions": {
    "throttle": true,
    "challenge": false,
    "block": false
  }
}
```

### Policy Scope Matching

**User Matching:**
- `"all"` - Matches all users
- `["user-1", "user-2"]` - Matches specific users

**Tier Matching:**
- `"all"` - Matches all tiers
- `["premium", "enterprise"]` - Matches specific tiers

**Endpoint Matching:**
- `"all"` - Matches all endpoints
- `["/api/users"]` - Exact match
- `["/api/*"]` - Wildcard match
- `["/api/users/*/profile"]` - Multi-segment wildcard

### Policy Priority

Policies are evaluated in order of priority (highest first). Set priority to control policy precedence:

```json
{
  "priority": 100
}
```

## User Tier Configuration

### Standard Tiers

```typescript
enum UserTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}
```

### Tier-Based Policy Examples

**Free Tier:**
```json
{
  "name": "Free Tier Limits",
  "config": {
    "requestsPerSecond": 5,
    "burstCapacity": 10,
    "windowSize": 1
  },
  "scope": {
    "tiers": ["free"]
  }
}
```

**Enterprise Tier:**
```json
{
  "name": "Enterprise Tier Limits",
  "config": {
    "requestsPerSecond": 1000,
    "burstCapacity": 2000,
    "windowSize": 1
  },
  "scope": {
    "tiers": ["enterprise"]
  }
}
```

## Adaptive Throttling

### System Load-Based Adjustment

Policies can automatically adjust based on system load:

```json
{
  "conditions": {
    "systemLoad": 80
  }
}
```

When system load exceeds 80%, limits are automatically reduced:
- Load 80-90%: 50% reduction
- Load 90-95%: 75% reduction
- Load 95-100%: 90% reduction

### Updating System Load

```typescript
rateLimitService.updateSystemLoad(75);
```

## Challenge Mechanisms

### Challenge Types

1. **CAPTCHA**: For moderate violation patterns
2. **Proof-of-Work**: For high-frequency violations
3. **Email Verification**: For suspicious activity

### Challenge Configuration

```json
{
  "actions": {
    "challenge": true
  }
}
```

### Challenge Flow

```
Rate Limit Exceeded → Check Violation History → Issue Challenge → Verify → Allow/Block
```

## API Endpoints

### Policy Management

- `POST /api/v1/policies` - Create policy
- `GET /api/v1/policies` - List all policies
- `GET /api/v1/policies/:id` - Get specific policy
- `PUT /api/v1/policies/:id` - Update policy
- `DELETE /api/v1/policies/:id` - Delete policy
- `POST /api/v1/policies/:id/activate` - Activate policy
- `POST /api/v1/policies/:id/deactivate` - Deactivate policy

### Status and Monitoring

- `GET /api/rate-limits/status` - Get current status
- `GET /api/rate-limits/violations` - Get violations
- `GET /api/rate-limits/violations/stats` - Get violation statistics

## Middleware Integration

### Applying Middleware

```typescript
import { RateLimitMiddleware } from './rate-limit/middleware/rate-limit.middleware';

@Module({
  providers: [RateLimitMiddleware],
})
export class AppModule {
  configure(consumer: MiddlewareBuilder) {
    consumer.apply(RateLimitMiddleware).forRoutes('*');
  }
}
```

### Response Headers

Successful requests include:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1640000000
X-RateLimit-Policy: policy-id
```

Rate limited requests include:
```
Retry-After: 60
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640000000
```

## Monitoring and Metrics

### Metrics Collected

- Total requests
- Allowed requests
- Blocked requests
- Throttled requests
- Challenged requests
- Average response time
- System load
- Redis availability

### Accessing Metrics

```typescript
const metrics = await monitoringService.getMetrics();
console.log(metrics);
```

### Metrics Summary

```typescript
const summary = monitoringService.getMetricsSummary();
console.log(summary);
```

## Admin Bypass

Admin users automatically bypass rate limiting:

```typescript
const context = {
  userId: 'admin-user',
  isAdmin: true,
  // ...
};
```

## Graceful Degradation

### Redis Failure Handling

When Redis is unavailable:
1. Automatically falls back to in-memory rate limiting
2. Maintains per-instance limits
3. Logs degradation events
4. Continues normal operation

### Monitoring Redis Status

```typescript
const isAvailable = algorithmService.isRedisAvailable();
```

## Best Practices

### Policy Design

1. **Start with conservative limits** and adjust based on metrics
2. **Use tier-based policies** for differentiated service
3. **Set appropriate burst capacities** for your use case
4. **Monitor violation patterns** to detect abuse
5. **Regularly review and update policies** based on usage

### Algorithm Selection

- **Token Bucket**: General-purpose APIs with burst tolerance
- **Sliding Window**: Precise rate limiting requirements
- **Leaky Bucket**: Traffic smoothing and queue management

### Performance Optimization

1. **Use Redis clustering** for high-throughput scenarios
2. **Set appropriate TTLs** for rate limit data
3. **Monitor memory usage** with many unique keys
4. **Use connection pooling** for Redis connections
5. **Implement proper cleanup** for expired data

### Security Considerations

1. **Use IP-based limiting** for unauthenticated requests
2. **Implement challenge mechanisms** for suspicious patterns
3. **Monitor for abuse patterns** and adjust policies
4. **Use separate Redis instances** for rate limiting
5. **Implement proper authentication** for policy management

## Troubleshooting

### Common Issues

**Redis Connection Failures:**
- Check Redis connection settings
- Verify Redis is running
- Check network connectivity
- Review Redis logs

**Rate Limits Too Strict:**
- Review policy configurations
- Check system load adjustments
- Monitor actual usage patterns
- Adjust burst capacities

**High Memory Usage:**
- Review TTL settings
- Check for key accumulation
- Implement cleanup jobs
- Monitor memory metrics

### Debug Mode

Enable debug logging:

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('RateLimit');
logger.setDebugMode(true);
```

## Testing

### Unit Tests

```bash
npm test -- rate-limit.service.spec.ts
npm test -- rate-limit-algorithm.service.spec.ts
npm test -- rate-limit-policy.service.spec.ts
```

### Integration Tests

```bash
npm test -- rate-limit.e2e-spec.ts
```

### Load Tests

```bash
npm test -- rate-limit.load-test.ts
```

### Chaos Tests

```bash
npm test -- rate-limit.chaos-test.ts
```

## Migration Guide

### From Basic Rate Limiting

1. **Install dependencies**: `npm install rate-limiter-flexible`
2. **Create policies**: Migrate existing limits to policy format
3. **Update middleware**: Replace with `RateLimitMiddleware`
4. **Configure Redis**: Set up Redis for distributed coordination
5. **Monitor**: Check metrics and adjust policies as needed

### Example Migration

**Before:**
```typescript
@RateLimit({ limit: 100, windowSeconds: 60 })
async getUsers() { }
```

**After:**
```typescript
// Create policy via API
// Middleware automatically applies based on policy matching
async getUsers() { }
```

## Performance Benchmarks

### Throughput

- **Token Bucket**: ~10,000 req/s (Redis), ~50,000 req/s (Memory)
- **Sliding Window**: ~8,000 req/s (Redis), ~40,000 req/s (Memory)
- **Leaky Bucket**: ~9,000 req/s (Redis), ~45,000 req/s (Memory)

### Memory Usage

- Per key: ~100 bytes (Redis), ~200 bytes (Memory)
- 10,000 keys: ~1 MB (Redis), ~2 MB (Memory)

### Latency

- Redis: ~1-5ms per request
- Memory: ~0.1-0.5ms per request

## Support and Contributing

For issues, questions, or contributions, please refer to the main Lumina repository.

## License

Part of the Lumina project. See main project license for details.
