# Notification Service

Handles webhook delivery and transactional email for payment events.

## Events

- `payment.created`
- `payment.confirmed`
- `payment.failed`
- `escrow.created`
- `subscription.billed`

## API

- `POST /api/notifications/webhooks/register` — register a webhook (`merchant_id`, `url`, `events[]`). Returns the webhook including a `secret` used to sign deliveries.
- `DELETE /api/notifications/webhooks/:id` — remove a webhook.
- `GET /api/notifications/webhooks/:id/deliveries` — list delivery attempts and their status for a webhook.
- `POST /api/notifications/email/send` — send a transactional email (`merchant_id`, `template`, `data`).

## Webhook delivery

Each delivery is POSTed as JSON: `{ "event": string, "data": object }`, with headers:

- `x-lumina-signature` — `HMAC-SHA256(secret, "{timestamp}.{body}")`, hex encoded
- `x-lumina-timestamp` — millisecond epoch used in the signature, guards against replay

Verify a delivery by recomputing the HMAC with your webhook's `secret` and comparing it to the `x-lumina-signature` header.

Failed deliveries (non-2xx response or network error) are retried with exponential backoff (1 minute base, capped at 1 hour) up to 5 attempts before being marked `failed`.
