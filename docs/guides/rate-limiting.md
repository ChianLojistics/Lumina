# Rate Limiting

Lumina API enforces rate limits to protect service stability and ensure fair usage.

## Default Limits

| Tier | Requests/min | Burst | Window |
|------|-------------|-------|--------|
| Free | 60 | 10 | 60s |
| Pro | 600 | 100 | 60s |
| Enterprise | 6,000 | 1,000 | 60s |

## Authentication Endpoints

These endpoints have stricter limits to prevent brute-force attacks:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/register` | 5 | 60s |
| `POST /api/auth/login` | 10 | 60s |
| `POST /api/auth/forgot-password` | 5 | 60s |

## Response Headers

Every API response includes rate limit headers:

```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 599
X-RateLimit-Reset: 1693000060
```

## Rate Limit Exceeded

When you exceed the limit, the API returns:

```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Try again in 30 seconds.",
  "error": "Too Many Requests"
}
```

With the header:
```
Retry-After: 30
```

## Best Practices

1. **Cache responses** — use the `Cache-Control` headers when available
2. **Use webhooks** — instead of polling, subscribe to events
3. **Implement exponential backoff** — when receiving 429 responses
4. **Monitor remaining quota** — check `X-RateLimit-Remaining` headers
5. **Use idempotency keys** — for payment creation to avoid duplicate requests

## Managing Your Limits

View your current rate limit status:

```bash
curl -I https://api.lumina.io/api/payments \
  -H "Authorization: Bearer <TOKEN>"
```

The response headers show your current quota.

## Custom Limits

Enterprise customers can request custom rate limits by contacting support.
