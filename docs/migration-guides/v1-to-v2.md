# Migration Guide: v1 to v2

This guide helps you migrate from Lumina API v1 to v2.

## Overview

v2 introduces improved error handling, new payment features, and enhanced webhook reliability. Most v1 endpoints remain compatible.

## Breaking Changes

### 1. Error Response Format

**v1:**
```json
{ "error": "Something went wrong" }
```

**v2:**
```json
{
  "statusCode": 400,
  "message": "Detailed error description",
  "error": "Bad Request",
  "code": "PAYMENT_001"
}
```

### 2. Authentication Headers

v2 requires the `Authorization` header on all endpoints (except public ones).

### 3. Webhook Signature Format

v2 uses `sha256` HMAC instead of `sha1`.

## New Features in v2

- Per-operation rate limiting
- Improved webhook delivery with retry backoff
- Enhanced fraud detection rules
- Zero-knowledge proof verification
- Multi-tenant support

## Migration Steps

1. Update your API base URL if using versioned endpoints
2. Update error handling to parse the new error format
3. Update webhook signature verification to use SHA-256
4. Test all endpoints against the v2 staging environment

## Timeline

- v1 will be supported until **2027-03-01**
- After that date, v1 endpoints will return `410 Gone`
