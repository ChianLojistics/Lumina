# Quantum-Resistant Cryptography Implementation

This module provides comprehensive post-quantum cryptographic (PQC) capabilities for the Lumina platform, implementing NIST-standardized algorithms to protect against quantum computing threats.

## Overview

The PQC implementation follows a hybrid approach, combining classical and post-quantum algorithms to provide security during the transition period while maintaining backward compatibility.

## Features

- **Hybrid Key Exchange**: X25519 + ML-KEM-1024 (Kyber) for quantum-resistant key exchange
- **Post-Quantum Digital Signatures**: ML-DSA-65 (Dilithium) for quantum-resistant signatures
- **Quantum-Safe Encryption**: AES-256-GCM with PQC-derived keys
- **Cryptographic Agility**: Dynamic algorithm selection and migration support
- **Key Management**: Secure key generation, rotation, and lifecycle management
- **Performance Monitoring**: Comprehensive benchmarking and health monitoring
- **Migration Strategy**: Phased migration path with rollback capabilities

## Architecture

### Core Services

#### HybridKeyExchangeService
Implements hybrid key exchange combining classical X25519 with post-quantum ML-KEM-1024.

```typescript
// Generate hybrid key pair
const keyPair = await hybridKeyExchangeService.generateKeyPair();

// Derive shared secret
const sharedSecret = await hybridKeyExchangeService.deriveSharedSecret(
  privateKey,
  peerPublicKey
);
```

#### PQSignatureService
Provides post-quantum digital signatures using ML-DSA-65 with fallback to classical Ed25519.

```typescript
// Generate PQC key pair
const keyPair = await pqSignatureService.generatePQKeypair();

// Sign message
const signature = await pqSignatureService.sign(message, privateKey);

// Verify signature
const isValid = await pqSignatureService.verify(message, signature, publicKey);
```

#### QuantumEncryptionService
Quantum-safe encryption using AES-256-GCM with PQC-derived keys.

```typescript
// Encrypt with PQC-derived key
const encrypted = await quantumEncryptionService.encryptWithPQCKey(
  plaintext,
  pqSharedSecret
);

// Decrypt
const decrypted = await quantumEncryptionService.decryptWithPQCKey(
  encryptedData,
  pqSharedSecret
);
```

#### CryptoAgilityService
Manages cryptographic policies and algorithm selection.

```typescript
// Select algorithm based on policy
const algorithm = cryptoAgilityService.selectAlgorithm('key-exchange', {
  quantumResistant: true,
  minStrength: 192
});

// Update policy
cryptoAgilityService.updatePolicy({
  requireQuantumResistant: true,
  minStrength: 256
});
```

#### PQKeyManagementService
Handles key lifecycle management including generation, rotation, and revocation.

```typescript
// Generate new key
const key = await keyManagementService.generateKey({
  algorithm: PQCAlgorithm.ML_KEM_1024,
  keyType: 'key-exchange',
  userId: 'user-123'
});

// Rotate key
const result = await keyManagementService.rotateKey(keyId);

// Revoke key
await keyManagementService.revokeKey(keyId);
```

#### PQBenchmarkService
Performance benchmarking for PQC algorithms.

```typescript
// Run full benchmark suite
const report = await benchmarkService.runFullBenchmark();

// Compare classical vs post-quantum
const comparison = await benchmarkService.compareWithClassical();
```

#### PQMigrationService
Manages migration from classical to post-quantum cryptography.

```typescript
// Create migration plan
const plan = await migrationService.createMigrationPlan(
  PQCAlgorithm.ML_KEM_1024,
  'user-123'
);

// Execute migration
const result = await migrationService.executeMigrationPlan(plan.id);
```

#### PQMonitoringService
Real-time monitoring and alerting for PQC operations.

```typescript
// Get health status
const health = await monitoringService.runHealthCheck();

// Get performance metrics
const metrics = monitoringService.getPerformanceMetrics('ML-KEM-1024', 'keygen');
```

## Supported Algorithms

### Key Exchange
- **ML-KEM-1024** (Kyber): NIST FIPS-203 standard, 256-bit security
- **ML-KEM-768**: 192-bit security
- **ML-KEM-512**: 128-bit security
- **X25519**: Classical elliptic curve, 128-bit security

### Digital Signatures
- **ML-DSA-65** (Dilithium): NIST FIPS-204 standard, 192-bit security
- **ML-DSA-87**: 256-bit security
- **ML-DSA-44**: 128-bit security
- **Ed25519**: classical elliptic curve, 128-bit security

### Encryption
- **AES-256-GCM**: Symmetric encryption with PQC-derived keys

## API Endpoints

### Key Management
- `POST /api/crypto/keypairs/generate` - Generate new key pair
- `GET /api/crypto/keypairs` - List key pairs
- `GET /api/crypto/keypairs/:id` - Get key pair details
- `POST /api/crypto/keypairs/:id/rotate` - Rotate key pair
- `POST /api/crypto/keypairs/:id/revoke` - Revoke key pair

### Cryptographic Operations
- `POST /api/crypto/sign` - Sign message
- `POST /api/crypto/verify` - Verify signature
- `POST /api/crypto/encrypt` - Encrypt data
- `POST /api/crypto/decrypt` - Decrypt data
- `POST /api/crypto/keyexchange` - Perform key exchange
- `POST /api/crypto/encapsulate` - Encapsulate shared secret
- `POST /api/crypto/decapsulate` - Decapsulate shared secret

### Configuration and Monitoring
- `GET /api/crypto/algorithms` - List supported algorithms
- `GET /api/crypto/policy` - Get cryptographic policy
- `POST /api/crypto/policy` - Update cryptographic policy
- `GET /api/crypto/statistics` - Get key statistics
- `GET /api/crypto/metrics` - Get performance metrics
- `GET /api/crypto/recommendations` - Get algorithm recommendations

## Database Schema

### pq_crypto_keys
Stores post-quantum cryptographic keys with metadata.

```sql
CREATE TABLE pq_crypto_keys (
  id UUID PRIMARY KEY,
  algorithm VARCHAR(50) NOT NULL,
  strength INTEGER NOT NULL,
  keyType VARCHAR(20) NOT NULL,
  publicKey BYTEA NOT NULL,
  hsmId VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  userId UUID,
  version INTEGER DEFAULT 1,
  parentId UUID,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### crypto_operations
Logs cryptographic operations for monitoring and auditing.

```sql
CREATE TABLE crypto_operations (
  id UUID PRIMARY KEY,
  keyId UUID,
  operationType VARCHAR(50) NOT NULL,
  algorithm VARCHAR(50) NOT NULL,
  quantumResistant BOOLEAN NOT NULL,
  performanceMs INTEGER,
  keySize INTEGER,
  dataSize INTEGER,
  success BOOLEAN DEFAULT TRUE,
  errorMessage TEXT,
  userId UUID,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

## Migration Strategy

### Phase 1: Preparation
1. Enable hybrid mode
2. Generate post-quantum key pairs alongside classical keys
3. Test PQC operations in development environment
4. Establish performance baselines

### Phase 2: Hybrid Operations
1. Enable hybrid cryptographic operations
2. Use both classical and PQC algorithms simultaneously
3. Monitor performance and compatibility
4. Gradually increase PQC usage

### Phase 3: Full Transition
1. Enable quantum resistance requirement
2. Deprecate classical algorithms
3. Complete migration to PQC-only operations
4. Remove classical algorithm support

### Rollback Plan
- Maintain classical keys during transition
- Disable quantum resistance requirement if issues arise
- Re-enable classical algorithms as fallback
- Monitor system stability during rollback

## Security Considerations

### Key Storage
- Private keys are stored securely (HSM recommended)
- Public keys stored in database with metadata
- Key rotation enforced based on policy
- Secure key deletion on revocation

### Algorithm Selection
- Default policy prioritizes security over performance
- Quantum-resistant algorithms preferred when available
- Minimum security strength enforced (128-bit)
- Algorithm agility allows quick updates

### Performance Impact
- PQC operations are 10-100x slower than classical
- Hybrid approach adds minimal overhead
- Performance monitoring detects degradation
- Benchmarking guides optimization efforts

## Configuration

### Environment Variables
```env
# PQC Configuration
PQC_ENABLE_HYBRID_MODE=true
PQC_REQUIRE_QUANTUM_RESISTANT=false
PQC_MIN_STRENGTH=128
PQC_FALLBACK_TO_CLASSICAL=true
PQC_AUTO_MIGRATE_USERS=false

# Key Management
PQC_KEY_TTL_DAYS=365
PQC_ROTATION_CHECK_INTERVAL_HOURS=24
PQC_CLEANUP_INTERVAL_HOURS=168

# Monitoring
PQC_HEALTH_CHECK_INTERVAL_MINUTES=60
PQC_PERFORMANCE_ANALYSIS_INTERVAL_HOURS=1
PQC_ALERT_RETENTION_DAYS=7
```

### Policy Configuration
```typescript
const policy = {
  keyExchange: [
    { name: 'X25519', quantumResistant: false, strength: 128 },
    { name: 'ML-KEM-1024', quantumResistant: true, strength: 256 }
  ],
  signature: [
    { name: 'Ed25519', quantumResistant: false, strength: 128 },
    { name: 'ML-DSA-65', quantumResistant: true, strength: 192 }
  ],
  encryption: [
    { name: 'AES-256-GCM', quantumResistant: false, strength: 256 }
  ],
  minStrength: 128,
  requireQuantumResistant: false,
  allowHybrid: true,
  fallbackToClassical: true
};
```

## Testing

### Unit Tests
Run unit tests for individual services:
```bash
npm test -- crypto/services/hybrid-key-exchange.service.spec.ts
npm test -- crypto/services/pq-signature.service.spec.ts
npm test -- crypto/services/quantum-encryption.service.spec.ts
npm test -- crypto/services/crypto-agility.service.spec.ts
```

### Integration Tests
Test the complete PQC workflow:
```bash
npm test -- crypto/crypto.controller.spec.ts
```

### Performance Tests
Run performance benchmarks:
```bash
npm run test:benchmark
```

## Monitoring

### Health Checks
The system performs automated health checks every minute:
- Key status validation
- Error rate monitoring
- Performance threshold checks
- Migration status verification

### Alerts
Alerts are generated for:
- High error rates (>5%)
- Performance degradation (>25%)
- High latency (P99 > 5s)
- Key expiration warnings
- Migration issues

### Metrics
Collected metrics include:
- Operation latency (p50, p95, p99)
- Throughput (operations/second)
- Error rates
- Key lifecycle events
- Migration progress

## Troubleshooting

### Common Issues

#### High Latency
- Check if PQC algorithms are being used
- Review performance metrics for bottlenecks
- Consider enabling classical fallback
- Optimize algorithm selection

#### Key Generation Failures
- Verify HSM connectivity
- Check algorithm support
- Review system resources
- Check entropy availability

#### Migration Failures
- Review migration plan status
- Check system compatibility
- Verify key availability
- Enable rollback if needed

## Dependencies

- `@noble/post-quantum`: Post-quantum cryptography implementation
- `@noble/curves`: Classical elliptic curve cryptography
- `@noble/hashes`: Cryptographic hash functions
- `@noble/ciphers`: Symmetric encryption algorithms

## References

- [NIST Post-Quantum Cryptography Standardization](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [FIPS-203: Module-Lattice-Based Key-Encapsulation Mechanism](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf)
- [FIPS-204: Module-Lattice-Based Digital Signature Algorithm](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf)
- [CRYSTALS-Kyber Documentation](https://www.pq-crystals.org/kyber/)
- [CRYSTALS-Dilithium Documentation](https://www.pq-crystals.org/dilithium/)

## License

This implementation is part of the Lumina platform and follows the same license terms.
