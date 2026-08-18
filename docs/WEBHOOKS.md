# Lumina Webhook Architecture & Integration Guide

Lumina provides an enterprise-grade webhook delivery system built with guaranteed at-least-once delivery semantics, intelligent exponential backoff retries, rule-based event filtering, Dead Letter Queue (DLQ) support, and HMAC-SHA256 signature verification.

---

## 1. Webhook Endpoints & REST API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/webhooks` | Register a new webhook subscription |
| `GET` | `/api/webhooks` | List registered webhooks for a merchant |
| `GET` | `/api/webhooks/stats` | Retrieve real-time delivery statistics & success rate |
| `GET` | `/api/webhooks/dlq` | List entries in the Dead Letter Queue |
| `POST` | `/api/webhooks/dlq/:id/retry` | Manually trigger a retry for a DLQ item |
| `POST` | `/api/webhooks/test` | Trigger a synthetic test ping to an endpoint |
| `GET` | `/api/webhooks/:id` | Get configuration details for a specific webhook |
| `PUT` | `/api/webhooks/:id` | Update webhook subscription (url, events, filters) |
| `DELETE` | `/api/webhooks/:id` | Delete a webhook subscription |
| `POST` | `/api/webhooks/:id/pause` | Pause delivery to a webhook subscription |
| `POST` | `/api/webhooks/:id/resume` | Resume delivery to a paused webhook |
| `POST` | `/api/webhooks/:id/replay` | Replay all past failed/DLQ deliveries |
| `GET` | `/api/webhooks/:id/deliveries` | Get detailed delivery logs for a webhook |

---

## 2. Webhook Signature Verification (HMAC-SHA256)

Every webhook payload delivered by Lumina includes two security headers:
- `x-lumina-signature`: The HMAC-SHA256 signature calculated over `${timestamp}.${payload}`.
- `x-lumina-timestamp`: Unix timestamp (in seconds or milliseconds) when the webhook was generated.

To prevent replay attacks, signatures are valid for a maximum window of 5 minutes (300 seconds).

### Code Examples

#### Node.js / TypeScript
```typescript
import crypto from 'crypto';

function verifyLuminaSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string,
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);

  // Reject if timestamp is older than 5 minutes
  if (Math.abs(now - ts) > 300) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

#### Python
```python
import hmac
import hashlib
import time

def verify_lumina_signature(raw_body: str, signature: str, timestamp: str, secret: str) -> bool:
    now = int(time.time())
    ts = int(timestamp)

    if abs(now - ts) > 300:
        return False

    payload_to_sign = f"{timestamp}.{raw_body}".encode('utf-8')
    expected = hmac.new(secret.encode('utf-8'), payload_to_sign, hashlib.sha256).hexdigest()

    return hmac.compare_digest(signature, expected)
```

#### Go
```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"strconv"
	"time"
)

func VerifyLuminaSignature(rawBody, signature, timestamp, secret string) bool {
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return false
	}

	if math.Abs(float64(time.Now().Unix()-ts)) > 300 {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(fmt.Sprintf("%s.%s", timestamp, rawBody)))
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}
```

---

## 3. Intelligent Retry & Backoff Policy

Lumina uses an exponential backoff schedule for transient errors (HTTP `408`, `429`, `500`, `502`, `503`, `504` or connection timeouts).

- **Initial Delay**: 1 second
- **Backoff Multiplier**: 2x
- **Max Delay**: 5 minutes (300,000 ms)
- **Max Attempts**: 5 attempts

| Attempt | Delay before attempt |
|---|---|
| Attempt 1 | Immediate |
| Attempt 2 | 1 second |
| Attempt 3 | 2 seconds |
| Attempt 4 | 4 seconds |
| Attempt 5 | 8 seconds |

If a webhook returns a non-retryable status (e.g. `400 Bad Request`, `401 Unauthorized`, `404 Not Found`) or exhausts 5 attempts, delivery is marked as `DLQ` and moved to the Dead Letter Queue.

---

## 4. Dead Letter Queue (DLQ) & Manual Replay

When webhooks fail permanently, they are preserved in the Dead Letter Queue.
Merchants can inspect failure reasons in the Lumina Dashboard or via `GET /api/webhooks/dlq`, fix their target server, and trigger a manual retry via `POST /api/webhooks/dlq/:id/retry`.

---

## 5. Event Filtering Rules

Subscriptions support rule-based event filters:
```json
{
  "events": ["payment.created", "payment.confirmed"],
  "filters": {
    "amount": { "min": 50, "max": 10000 },
    "currency": ["USDC", "XLM"],
    "status": ["confirmed"]
  }
}
```
Webhooks will only be delivered if all configured filter criteria match the event payload.
