# Zero-Knowledge Proof (ZKP) System Documentation

## Overview

The Lumina ZKP system provides privacy-preserving payment verification and audit capabilities using zero-knowledge proofs. This enables merchants and auditors to verify payment validity, settlement, and compliance without revealing sensitive transaction details.

## Architecture

### System Components

1. **ZKP Circuits** (Circom)
   - Payment verification circuit
   - Settlement verification circuit
   - Identity verification circuit
   - Merkle inclusion proofs

2. **Backend Services** (NestJS)
   - ZKP proof generation service
   - ZKP verification service
   - Privacy audit service
   - Cache management service

3. **Smart Contracts** (Soroban)
   - ZKP proof storage and verification
   - Nullifier management
   - Verification key registration

4. **Database Schema** (PostgreSQL)
   - ZKP proofs storage
   - Nullifier tracking
   - Audit proof records

## Technology Stack

### ZKP System
- **Circom**: Circuit design language
- **snarkjs**: JavaScript library for zk-SNARKs
- **Groth16**: Proof system for small proofs and fast verification
- **rapidsnark**: Accelerated proving (GPU support)

### Backend
- **NestJS**: Framework
- **TypeORM**: ORM
- **Redis**: Caching layer
- **PostgreSQL**: Database

### Blockchain
- **Soroban**: Stellar smart contract platform

## Installation

### Prerequisites

```bash
# Install circom
npm install -g circom

# Install snarkjs
npm install snarkjs

# Install circomlib (circuit library)
npm install circomlib
```

### Backend Dependencies

```bash
cd backend
npm install snarkjs circomlib merkletreejs cache-manager cache-manager-redis-store
```

### Circuit Compilation

```bash
cd zkp-circuits

# Compile payment verification circuit
circom payment_verification.circom --r1cs --wasm --sym --c

# Generate powers of tau
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v

# Generate proving and verification keys
snarkjs groth16 setup payment_verification.r1cs pot14_final.ptau payment_verification_0000.zkey
snarkjs zkey contribute payment_verification_0000.zkey payment_verification_final.zkey --name="1st Contributor" -v
snarkjs zkey export verificationkey payment_verification_final.zkey payment_verification_verification_key.json
```

## API Endpoints

### Payment Proof Endpoints

#### Generate Payment Proof
```http
POST /api/zkp/proofs/payment
Content-Type: application/json
Authorization: Bearer <token>

{
  "senderPrivateKey": "string",
  "recipientPrivateKey": "string",
  "amount": number,
  "timestamp": number,
  "nonce": "string",
  "paymentHash": "string",
  "merkleRoot": "string"
}
```

#### Verify Payment Proof
```http
POST /api/zkp/proofs/verify
Content-Type: application/json
Authorization: Bearer <token>

{
  "proof": object,
  "publicSignals": array,
  "proofType": "string"
}
```

#### Get Proofs by Transaction
```http
GET /api/zkp/proofs/transaction/:transactionId
Authorization: Bearer <token>
```

### Audit Endpoints

#### Generate Audit Proof
```http
POST /api/zkp/audit/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "merchantId": "string",
  "dateRange": {
    "startDate": "ISO8601 date",
    "endDate": "ISO8601 date"
  },
  "revealFields": ["string"]
}
```

#### Generate Compliance Report
```http
POST /api/zkp/audit/compliance
Content-Type: application/json
Authorization: Bearer <token>

{
  "merchantId": "string",
  "dateRange": {
    "startDate": "ISO8601 date",
    "endDate": "ISO8601 date"
  }
}
```

### Nullifier Endpoints

#### Check Nullifier Status
```http
GET /api/zkp/nullifiers/:nullifierHash
Authorization: Bearer <token>
```

#### Mark Nullifier as Spent
```http
POST /api/zkp/nullifiers/:nullifierHash/mark-spent
Authorization: Bearer <token>
```

## Circuit Design

### Payment Verification Circuit

The payment verification circuit validates:

1. **Sender Ownership**: Verifies the sender owns the private key
2. **Amount Validity**: Ensures amount is positive and matches expected
3. **Timestamp Validity**: Validates timestamp is within acceptable range
4. **Merkle Inclusion**: Confirms transaction is in the merkle tree
5. **Nullifier Generation**: Creates unique nullifier to prevent double-spending

### Circuit Inputs

#### Private Inputs
- `sender_private_key`: Sender's private key
- `recipient_private_key`: Recipient's private key
- `amount`: Transaction amount
- `timestamp`: Transaction timestamp
- `nonce`: Random nonce for uniqueness

#### Public Inputs
- `payment_hash`: Hash of payment details
- `merkle_root`: Root of transaction merkle tree
- `nullifier`: Generated nullifier
- `expected_amount`: Expected transaction amount
- `min_timestamp`: Minimum valid timestamp
- `max_timestamp`: Maximum valid timestamp

## Privacy Features

### Selective Disclosure

The system supports selective disclosure of transaction details:

```typescript
const revealFields = ['amount', 'timestamp']; // Only reveal these fields
const proof = await privacyAuditService.generateSelectiveDisclosureProof(
  transactionId,
  revealFields
);
```

### Privacy-Preserving Audits

Auditors can verify compliance without seeing sensitive data:

```typescript
const auditProof = await privacyAuditService.generateAuditProof({
  merchantId: 'merchant_123',
  dateRange: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31')
  },
  revealFields: ['totalAmount', 'transactionCount'] // Only aggregate data
});
```

## Performance Optimization

### Caching Strategy

1. **Proof Caching**: Generated proofs are cached for 1 hour
2. **Verification Key Caching**: Verification keys cached for 24 hours
3. **Witness Caching**: Computed witnesses cached for 30 minutes

### Batch Operations

```typescript
// Batch proof generation
const proofs = await zkpProofService.generatePaymentProofsBatch(payments);

// Batch verification
const results = await zkpVerificationService.batchVerifyProofs(proofs);
```

### GPU Acceleration

For production deployments, use rapidsnark for GPU-accelerated proving:

```bash
# Use rapidsnark for faster proving
rapidsnark -p payment_verification_final.zkey -i input.json -o proof.json
```

## Security Considerations

### Trusted Setup

The Groth16 proof system requires a trusted setup ceremony. Follow these guidelines:

1. **Multi-Party Ceremony**: Involve multiple participants
2. **Secure Destruction**: Ensure toxic waste is properly destroyed
3. **Transparency**: Document all ceremony steps
4. **Verification**: Allow community verification of parameters

### Nullifier Security

- Nullifiers prevent double-spending without revealing transaction details
- Nullifiers are public but don't reveal underlying data
- Implement nullifier tracking to detect fraud attempts

### Key Management

- Store verification keys securely
- Rotate proving keys periodically
- Use hardware security modules (HSMs) for key storage

## Testing

### Unit Tests

```bash
cd backend
npm test -- zkp
```

### Integration Tests

```bash
npm test -- zkp --e2e
```

### Performance Benchmarks

```bash
npm run benchmark:zkp
```

## Deployment

### Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=lumina

# ZKP Configuration
ZKP_CIRCUIT_PATH=./zkp-circuits
ZKP_PROVING_KEY_PATH=./keys/proving
ZKP_VERIFICATION_KEY_PATH=./keys/verification
```

### Docker Deployment

```bash
# Build and start services
docker-compose up -d

# Run migrations
docker-compose exec backend npm run migration:run

# Generate initial verification keys
docker-compose exec backend npm run zkp:setup
```

## Monitoring

### Metrics

The system exposes the following metrics:

- `zkp_proof_generation_duration_seconds`: Proof generation time
- `zkp_proof_verification_duration_seconds`: Proof verification time
- `zkp_cache_hit_rate`: Cache hit percentage
- `zkp_nullifier_checks_total`: Total nullifier checks
- `zkp_proof_storage_size_bytes`: Storage used by proofs

### Logging

Enable debug logging for ZKP operations:

```env
LOG_LEVEL=debug
ZKP_LOG_LEVEL=debug
```

## Troubleshooting

### Common Issues

#### Proof Generation Fails

**Problem**: Proof generation fails with "circuit compilation error"

**Solution**: 
- Ensure circom is properly installed
- Check circuit syntax
- Verify all dependencies are installed

#### Verification Fails

**Problem**: Proof verification returns false

**Solution**:
- Verify public inputs match circuit expectations
- Check verification key is correct
- Ensure proof format is valid

#### Cache Issues

**Problem**: Low cache hit rate

**Solution**:
- Increase cache TTL
- Check Redis connectivity
- Monitor cache key patterns

## Future Enhancements

### Planned Features

1. **zk-STARK Integration**: Add support for zk-STARKs
2. **Recursive Proofs**: Implement recursive proof composition
3. **Hardware Acceleration**: FPGA/ASIC acceleration
4. **Cross-Chain Proofs**: Support for multiple blockchains
5. **Advanced Circuits**: More complex verification circuits

### Research Areas

- Post-quantum ZKP systems
- Optimized circuit design
- Distributed proving networks
- Privacy-preserving analytics

## References

- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Documentation](https://github.com/iden3/snarkjs)
- [Groth16 Paper](https://eprint.iacr.org/2016/260)
- [ZKP Research](https://zkp.science/)

## Support

For issues and questions:
- GitHub Issues: [Lumina Repository](https://github.com/0xNinx/Lumina)
- Documentation: [Lumina Docs](https://docs.lumina.io)
- Community: [Lumina Discord](https://discord.gg/lumina)

## License

This ZKP system is part of the Lumina project and is licensed under the MIT License.
