# Error Code Reference

Complete reference of all API error codes, their meanings, and resolutions.

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "code": "PAYMENT_001"
}
```

## Authentication Errors

| Code | HTTP Status | Message | Resolution |
|------|-------------|---------|------------|
| AUTH_001 | 401 | Invalid credentials | Check email and password |
| AUTH_002 | 401 | Token expired | Refresh your access token |
| AUTH_003 | 401 | Invalid refresh token | Re-authenticate |
| AUTH_004 | 403 | Insufficient permissions | Check your role and API key scopes |
| AUTH_005 | 409 | Email already registered | Use a different email or login |
| AUTH_006 | 400 | Invalid email format | Provide a valid email address |
| AUTH_007 | 400 | Password too short | Password must be at least 8 characters |
| AUTH_008 | 400 | Invalid TOTP code | Check your authenticator app |
| AUTH_009 | 429 | Too many login attempts | Wait and try again later |
| AUTH_010 | 400 | Invalid verification token | Request a new verification email |

## Payment Errors

| Code | HTTP Status | Message | Resolution |
|------|-------------|---------|------------|
| PAYMENT_001 | 400 | Insufficient funds | Ensure account has sufficient balance |
| PAYMENT_002 | 400 | Invalid currency | Use USD, EUR, GBP, BTC, or ETH |
| PAYMENT_003 | 400 | Invalid merchant address | Verify the Stellar address format |
| PAYMENT_004 | 404 | Payment not found | Check the payment ID |
| PAYMENT_005 | 400 | Amount must be positive | Use an amount greater than 0 |
| PAYMENT_006 | 409 | Duplicate payment | Use an idempotency key |
| PAYMENT_007 | 500 | Payment processing failed | Retry or contact support |
| PAYMENT_008 | 400 | Payment already completed | This payment was already processed |

## Webhook Errors

| Code | HTTP Status | Message | Resolution |
|------|-------------|---------|------------|
| WEBHOOK_001 | 400 | Invalid webhook URL | Use a valid HTTPS URL |
| WEBHOOK_002 | 404 | Webhook not found | Check the webhook ID |
| WEBHOOK_003 | 400 | Invalid event type | Use a supported event type |
| WEBHOOK_004 | 429 | Webhook delivery rate limited | Reduce webhook frequency |

## Crypto Errors

| Code | HTTP Status | Message | Resolution |
|------|-------------|---------|------------|
| CRYPTO_001 | 400 | Invalid key format | Use the correct key encoding |
| CRYPTO_002 | 400 | Signing failed | Verify the key and data |
| CRYPTO_003 | 400 | Decryption failed | Check the key and ciphertext |
| CRYPTO_004 | 404 | Key not found | Generate or import the key first |

## Rate Limit Errors

| Code | HTTP Status | Message | Resolution |
|------|-------------|---------|------------|
| RATE_001 | 429 | Rate limit exceeded | Wait and retry with backoff |
| RATE_002 | 429 | Daily quota exceeded | Upgrade your plan or wait |

## Tenant Errors

| Code | HTTP Status | Message | Resolution |
|------|-------------|---------|------------|
| TENANT_001 | 404 | Tenant not found | Check the tenant ID |
| TENANT_002 | 409 | Tenant already exists | Use a different tenant name |
| TENANT_003 | 400 | Quota exceeded | Upgrade your tenant plan |

## System Errors

| Code | HTTP Status | Message | Resolution |
|------|-------------|---------|------------|
| SYS_001 | 500 | Internal server error | Retry or contact support |
| SYS_002 | 503 | Service temporarily unavailable | Retry after a delay |
| SYS_003 | 500 | Database connection failed | Retry or contact support |
