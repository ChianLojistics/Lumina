# Authentication

Lumina uses JWT (JSON Web Token) bearer authentication for all API endpoints.

## Getting a Token

### Register
```bash
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "Jane Doe",
  "role": "merchant"
}
```

### Login
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

Returns:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Refresh Token
```bash
POST /api/auth/refresh
Authorization: Bearer <REFRESH_TOKEN>
```

## Using the Token

Include the access token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Token Lifetime

- **Access token**: Short-lived (configured in backend)
- **Refresh token**: Longer-lived, used to obtain new access tokens

## Two-Factor Authentication

Enable 2FA for additional security:

1. **Setup**: `POST /api/auth/2fa/setup` — returns a QR code
2. **Enable**: `POST /api/auth/2fa/enable` with a TOTP code
3. **Login with 2FA**: Include `totp_code` in the login request

## Error Responses

| Status | Meaning |
|--------|---------|
| 401 | Missing or invalid token |
| 403 | Token valid but insufficient permissions |
| 429 | Rate limit exceeded |

## Interactive Testing

Visit `/api/docs` to test authentication interactively using Swagger UI:
1. Click the **Authorize** button
2. Enter your JWT token
3. All subsequent requests will include the token
