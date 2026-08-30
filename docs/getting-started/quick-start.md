# Quick Start Guide

Get up and running with the Lumina Payment API in minutes.

## Prerequisites

- Node.js 18+ or equivalent runtime
- A Lumina account (register at the dashboard)
- cURL or an HTTP client (Postman, Insomnia)

## 1. Get Your API Keys

After registering, generate an API key from the dashboard or via the API:

```bash
curl -X POST https://api.lumina.io/api/auth/api-keys \
  -H "Authorization: Bearer <YOUR_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-integration"}'
```

## 2. Authenticate

```bash
curl -X POST https://api.lumina.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "password": "your-password"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "you@example.com" }
}
```

## 3. Create Your First Payment

```bash
curl -X POST https://api.lumina.io/api/payments \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_address": "GAXHWJ7...",
    "amount": 10.50,
    "currency": "USD"
  }'
```

## 4. Explore the API

- **Interactive docs**: Visit `/api/docs` on your running instance
- **Full reference**: See [API Reference](../api-reference/api-reference.md)
- **Error handling**: See [Error Handling Guide](../guides/handling-errors.md)

## Next Steps

- [Authentication Guide](./authentication.md)
- [Webhook Setup](../guides/webhooks.md)
- [SDK Installation](../sdks/typescript.md)
