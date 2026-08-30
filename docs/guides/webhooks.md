# Webhooks

Webhooks allow you to receive real-time notifications when events occur in your Lumina account.

## Overview

Instead of polling the API, register a webhook URL and Lumina will POST event payloads to your endpoint.

## Register a Webhook

```bash
POST /api/webhooks
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "url": "https://your-server.com/webhooks/lumina",
  "events": ["payment.completed", "payment.failed"],
  "secret": "whsec_your_signing_secret"
}
```

## Available Events

| Event | Description |
|-------|-------------|
| `payment.completed` | Payment successfully processed |
| `payment.failed` | Payment processing failed |
| `payment.created` | Payment initiated |
| `webhook.test` | Test event for verifying endpoint |

## Webhook Payload

```json
{
  "id": "evt_abc123",
  "type": "payment.completed",
  "created_at": "2026-08-27T10:00:00Z",
  "data": {
    "id": "pay_xyz789",
    "amount": 100.50,
    "currency": "USD",
    "status": "completed",
    "merchant_address": "GAXHWJ7..."
  }
}
```

## Verifying Webhook Signatures

Each webhook includes an `X-Lumina-Signature` header:

```
X-Lumina-Signature: sha256=<hex-digest>
```

Verify the signature using your webhook secret:

```typescript
import { createHmac } from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${expected}` === signature;
}
```

## Webhook Management

### List Webhooks
```bash
GET /api/webhooks
```

### Get Webhook Details
```bash
GET /api/webhooks/:id
```

### Update Webhook
```bash
PUT /api/webhooks/:id
{
  "url": "https://new-url.com/webhooks",
  "events": ["payment.completed"]
}
```

### Delete Webhook
```bash
DELETE /api/webhooks/:id
```

### Test Webhook
```bash
POST /api/webhooks/:id/test
```

### Pause/Resume Webhook
```bash
POST /api/webhooks/:id/pause
POST /api/webhooks/:id/resume
```

### View Delivery History
```bash
GET /api/webhooks/:id/deliveries
```

## Retry Policy

Failed webhook deliveries are retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | 1 minute |
| 2 | 5 minutes |
| 3 | 30 minutes |
| 4 | 2 hours |
| 5 | 8 hours |

After 5 failed attempts, the event is moved to the Dead Letter Queue (DLQ).

## Dead Letter Queue

View and retry failed events:

```bash
GET /api/webhooks/dlq
POST /api/webhooks/dlq/:id/retry
```

## Best Practices

1. **Respond quickly** — return 200 within 5 seconds
2. **Process asynchronously** — queue events for background processing
3. **Verify signatures** — always validate the `X-Lumina-Signature` header
4. **Use HTTPS** — webhook URLs must use HTTPS in production
5. **Handle idempotency** — process each event exactly once using the event `id`
6. **Monitor the DLQ** — check for failed deliveries regularly
