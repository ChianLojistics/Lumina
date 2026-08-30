# Changelog

All notable changes to the Lumina Payment API are documented here.

## [1.1.0] - 2026-08-27

### Added
- **Swagger/OpenAPI documentation** at `/api/docs`
  - Interactive API testing via Swagger UI
  - Bearer JWT authentication support in docs
  - Per-endpoint summaries and descriptions
  - Request/response examples on all major endpoints
- **OpenAPI JSON spec** at `/api/docs-json`
  - Machine-readable API specification
  - Code generation support (TypeScript, Python, Java)
- **Developer portal documentation**
  - Quick start guide
  - Authentication guide
  - Error handling guide
  - API reference (auto-generated from OpenAPI spec)
- **OpenAPI export script** (`scripts/export-openapi.ts`)
  - Export spec to JSON and Markdown

### Changed
- All controllers now include Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`)
- DTOs include `@ApiProperty` decorators for schema documentation

## [1.0.0] - 2026-08-01

### Added
- Initial API release
- Payment processing (create, list, get)
- Authentication (register, login, refresh, logout)
- Webhook management
- Crypto operations (key generation, signing, encryption)
- Zero-knowledge proof verification
- Fraud detection rules
- Multi-tenant support
- Rate limiting
- Distributed ledger operations
