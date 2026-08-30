# Error Handling

Lumina API uses standard HTTP status codes and structured error responses.

## Error Response Format

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

## Common Error Codes

| HTTP Status | Error | Description | Resolution |
|-------------|-------|-------------|------------|
| 400 | Bad Request | Invalid input data | Check request body against the schema |
| 401 | Unauthorized | Missing or invalid JWT token | Re-authenticate and include valid token |
| 403 | Forbidden | Insufficient permissions | Check your role and API key scopes |
| 404 | Not Found | Resource does not exist | Verify the resource ID |
| 409 | Conflict | Resource already exists | Use a different identifier |
| 429 | Too Many Requests | Rate limit exceeded | Wait and retry, or check rate limit headers |
| 500 | Internal Server Error | Server-side error | Contact support with the request ID |

## Rate Limiting

When rate limited, the response includes:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1693000000
Retry-After: 30
```

## Payment-Specific Errors

| Code | Message | HTTP Status | Resolution |
|------|---------|-------------|------------|
| PAYMENT_001 | Insufficient funds | 400 | Ensure account has sufficient balance |
| PAYMENT_002 | Invalid currency | 400 | Use USD, EUR, GBP, BTC, or ETH |
| PAYMENT_003 | Invalid merchant address | 400 | Verify the Stellar address format |

## Best Practices

1. **Always check the status code** before parsing the response body
2. **Implement exponential backoff** for 429 and 5xx errors
3. **Log request IDs** from response headers for debugging
4. **Use idempotency keys** for payment creation to prevent duplicates
