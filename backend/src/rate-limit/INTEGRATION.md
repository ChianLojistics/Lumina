# Rate Limiting System Integration Guide

## Integration Status

The distributed rate limiting system has been successfully integrated into the Lumina backend application.

## Completed Integration Steps

### 1. Module Registration
- ✅ Added `RateLimitModule` to `AppModule` imports
- ✅ Added `RateLimitModule` to `AuthModule` imports
- ✅ Updated `RateLimitGuard` to use new `RateLimitService`

### 2. Service Migration
- ✅ Replaced old `RateLimiterService` with distributed `RateLimitService`
- ✅ Updated guard to use async/await pattern
- ✅ Enhanced context with user tier and admin status

### 3. Dependency Updates
- ✅ Added `rate-limiter-flexible` to package.json
- ✅ Configured Redis connection settings

## Next Steps for Production Deployment

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Redis
Ensure Redis is running and accessible:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### 3. Database Migration
The rate limit entities will be automatically synchronized by TypeORM. No manual migration needed.

### 4. Create Initial Policies
Create default rate limit policies via the API:

```bash
# Basic tier policy
curl -X POST http://localhost:3000/api/v1/policies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Basic Tier API Limits",
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
  }'
```

### 5. Apply Middleware (Optional)
For global rate limiting, apply the middleware in your module:

```typescript
import { RateLimitMiddleware } from './rate-limit/middleware/rate-limit.middleware';

@Module({
  // ...
})
export class AppModule {
  configure(consumer: MiddlewareBuilder) {
    consumer.apply(RateLimitMiddleware).forRoutes('*');
  }
}
```

### 6. Monitor System Load
Implement system load monitoring for adaptive throttling:

```typescript
// In your monitoring service
setInterval(async () => {
  const load = await getCurrentSystemLoad();
  rateLimitService.updateSystemLoad(load);
}, 60000); // Update every minute
```

## Backward Compatibility

The old `@RateLimit()` decorator and `RateLimitGuard` still work but now use the distributed system:

```typescript
@RateLimit({ limit: 100, windowSeconds: 60 })
async someEndpoint() {
  // This now uses distributed rate limiting
}
```

## Migration from Old System

### Before (Old System)
```typescript
// In-memory per-instance rate limiting
@RateLimit({ limit: 100, windowSeconds: 60 })
async getUsers() { }
```

### After (New System)
```typescript
// Same decorator, but now uses distributed Redis-backed rate limiting
@RateLimit({ limit: 100, windowSeconds: 60 })
async getUsers() { }

// Or use policy-based rate limiting (no decorator needed)
// Policies are automatically matched based on user tier and endpoint
async getUsers() { }
```

## Testing the Integration

### 1. Test Basic Rate Limiting
```bash
# Make multiple requests to test rate limiting
for i in {1..15}; do
  curl http://localhost:3000/api/auth/login
done
```

### 2. Test Policy Management
```bash
# List policies
curl http://localhost:3000/api/v1/policies

# Check status
curl http://localhost:3000/api/rate-limits/status
```

### 3. Test Distributed Coordination
Run multiple instances and verify rate limits are coordinated across instances.

## Monitoring and Observability

### Available Metrics
- Total requests
- Allowed/blocked requests
- Redis availability
- System load
- Active policies

### Access Metrics
```bash
curl http://localhost:3000/api/rate-limits/status
curl http://localhost:3000/api/rate-limits/violations/stats
```

## Troubleshooting

### Redis Connection Issues
If Redis is unavailable, the system automatically falls back to in-memory rate limiting. Check logs for:
```
Redis error: [error message]
Connected to Redis for rate limiting
```

### Policy Not Applied
1. Verify policy is active: `isActive: true`
2. Check scope matches your user tier/endpoint
3. Review policy priority if multiple policies match

### Rate Limits Too Strict
1. Review current policies via API
2. Adjust `requestsPerSecond` and `burstCapacity`
3. Consider system load adjustments

## Performance Considerations

### Redis Performance
- Use Redis clustering for high-throughput scenarios
- Monitor Redis memory usage
- Set appropriate TTLs for rate limit keys

### Algorithm Selection
- **Token Bucket**: General purpose, burst tolerance
- **Sliding Window**: Precise rate limiting
- **Leaky Bucket**: Traffic smoothing

### Memory Usage
- Each rate limit key uses ~100 bytes in Redis
- Monitor memory with many unique users
- Implement cleanup for expired data

## Security Notes

1. **Admin Bypass**: Admin users automatically bypass rate limits
2. **Challenge Mechanisms**: Enable for suspicious patterns
3. **IP-based Limiting**: Automatically applied for unauthenticated requests
4. **Policy Management**: Requires admin role

## Rollback Plan

If issues arise, you can temporarily disable the new system:

1. Remove `RateLimitModule` from imports
2. Restore old `RateLimiterService` in `AuthModule`
3. Revert `RateLimitGuard` to use old service

## Support

For issues or questions:
1. Check the comprehensive README.md
2. Review test files for usage examples
3. Check logs for error messages
4. Monitor metrics via status endpoint
