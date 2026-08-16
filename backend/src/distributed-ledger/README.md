# Distributed Ledger Integration

## Overview

The Distributed Ledger Integration provides an immutable, cross-service payment reconciliation system for Lumina. It ensures data consistency across all microservices, enables comprehensive audit trails, and prevents double-spending or data corruption scenarios.

## Architecture

### Core Components

1. **Ledger Service** (`ledger.service.ts`)
   - Append-only log structure for immutable transaction records
   - Write and read operations with consensus integration
   - Entry verification using signatures and Merkle proofs
   - Query capabilities with filtering and pagination

2. **Raft Consensus Service** (`raft-consensus.service.ts`)
   - Leader election and log replication
   - Fault tolerance with minimum 3 nodes
   - Configurable consistency levels (strong/eventual)
   - Automatic leader failover

3. **Merkle Tree Service** (`merkle-tree.service.ts`)
   - Integrity verification using Merkle trees
   - Proof generation and verification
   - Root hash calculation for data sets
   - Efficient integrity checks

4. **Reconciliation Service** (`reconciliation.service.ts`)
   - Real-time comparison of service states
   - Automatic conflict detection
   - Deterministic conflict resolution
   - Alerting for unresolved conflicts

5. **Conflict Resolution Service** (`conflict-resolution.service.ts`)
   - Severity-based conflict handling
   - Automatic correction for high-severity issues
   - Manual resolution support for admin intervention
   - Resolution statistics tracking

6. **Distributed Lock Service** (`distributed-lock.service.ts`)
   - Redis-based distributed locking
   - Lock acquisition with retry logic
   - Automatic lock extension for long operations
   - Force release capabilities for admin operations

7. **Ledger Health Service** (`ledger-health.service.ts`)
   - Continuous health monitoring
   - Performance metrics tracking
   - Health trend analysis
   - Alert threshold management

8. **Ledger Pruning Service** (`ledger-pruning.service.ts`)
   - Automated archival of old entries
   - Configurable retention policies
   - Batch processing for efficiency
   - Storage estimation and management

9. **Ledger Client Service** (`ledger-client.service.ts`)
   - SDK for microservice integration
   - Retry logic with exponential backoff
   - Idempotency support
   - Async write operations with callbacks

## Data Model

### LedgerEntry

```typescript
interface LedgerEntry {
  id: string;                    // UUID primary key
  entryId: string;               // Unique entry identifier
  timestamp: number;              // Unix timestamp
  service: string;                // Service name (payment, ramp, etc.)
  operation: string;              // Operation type (create, update, delete)
  transactionId: string;          // Transaction identifier
  data: Record<string, any>;      // Operation data
  signature: string;             // Cryptographic signature
  previousHash: string;           // Hash of previous entry
  merkleProof: string;            // Merkle proof for verification
  createdAt: Date;                // Creation timestamp
}
```

### ReconciliationReport

```typescript
interface ReconciliationReport {
  id: string;                     // UUID primary key
  startTime: Date;                // Reconciliation start time
  endTime: Date;                  // Reconciliation end time
  conflictsDetected: number;      // Number of conflicts found
  conflictsResolved: number;      // Number of conflicts resolved
  status: string;                 // Report status (completed, partial)
  report: Record<string, any>;    // Detailed report data
  createdAt: Date;                // Creation timestamp
}
```

## API Endpoints

### Write Operations

- `POST /api/ledger/write` - Write single entry to ledger
- `POST /api/ledger/write/batch` - Write multiple entries in batch

### Read Operations

- `GET /api/ledger/:id` - Get entry by ID
- `GET /api/ledger/transactions/:txId` - Get all entries for transaction
- `GET /api/ledger/query` - Query ledger with filters
- `GET /api/ledger/:id/verify` - Verify entry integrity

### Reconciliation Operations

- `POST /api/ledger/reconcile` - Trigger reconciliation
- `GET /api/ledger/reconciliation/:reportId` - Get reconciliation report
- `GET /api/ledger/reconciliation/recent` - Get recent reports
- `GET /api/ledger/reconciliation/statistics` - Get reconciliation statistics

### Health and Monitoring

- `GET /api/ledger/health` - Get ledger cluster health
- `GET /api/ledger/statistics` - Get ledger statistics

## Microservice Integration

### Using the Ledger Client

```typescript
import { LedgerClientService } from '@lumina/distributed-ledger';

@Injectable()
export class PaymentService {
  constructor(private readonly ledgerClient: LedgerClientService) {}

  async processPayment(paymentData: any) {
    // Write to ledger
    await this.ledgerClient.writeEntry({
      service: 'payment',
      operation: 'create',
      transactionId: paymentData.transactionId,
      data: paymentData,
      consistencyLevel: 'strong',
    });

    // Process payment...
  }
}
```

### Idempotent Writes

```typescript
await this.ledgerClient.writeEntryIdempotent({
  service: 'payment',
  operation: 'create',
  transactionId: paymentData.transactionId,
  data: paymentData,
});
```

### Async Writes with Callbacks

```typescript
await this.ledgerClient.writeEntryAsync(
  {
    service: 'payment',
    operation: 'create',
    transactionId: paymentData.transactionId,
    data: paymentData,
  },
  (error, result) => {
    if (error) {
      // Handle error
    } else {
      // Handle success
    }
  },
);
```

## Consensus Mechanism

### Raft Algorithm

The distributed ledger uses the Raft consensus algorithm to ensure data consistency across nodes:

1. **Leader Election**: Nodes elect a leader using randomized timeouts
2. **Log Replication**: Leader replicates log entries to followers
3. **Safety**: Only leader can append entries to the log
4. **Fault Tolerance**: System tolerates (N-1)/2 node failures

### Consistency Levels

- **Strong**: Entry must be replicated to majority before acknowledgment
- **Eventual**: Entry acknowledged immediately, replicated asynchronously

## Integrity Verification

### Signature Verification

Each entry is signed using SHA-256:
```typescript
signature = hash(entryData + previousHash)
```

### Merkle Tree Verification

- Entries are organized in Merkle trees for efficient verification
- Merkle proofs allow verification of individual entries
- Root hash provides overall integrity guarantee

## Reconciliation Process

### Automatic Reconciliation

Reconciliation runs automatically on a schedule (configurable, default: hourly):

1. Collect ledger entries for time range
2. Compare service states
3. Detect conflicts
4. Resolve conflicts automatically
5. Generate reconciliation report

### Conflict Resolution

Conflicts are resolved based on severity:

- **High**: Data corruption, double-spending - automatic correction
- **Medium**: Operation conflicts - use latest operation
- **Low**: Missing operations - informational only

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

# Ledger Configuration
LEDGER_RETENTION_DAYS=90
LEDGER_PRUNE_BATCH_SIZE=1000
LEDGER_ARCHIVE_BEFORE_PRUNE=true
LEDGER_ARCHIVE_PATH=./ledger-archive

# Raft Configuration
RAFT_NODE_ID=node-1
RAFT_NODE_ADDRESS=localhost:5000

# Ledger Client Configuration
LEDGER_SERVICE_URL=http://localhost:4000
```

### Docker Compose

The distributed ledger requires Redis for distributed locking:

```yaml
redis:
  image: redis:7-alpine
  container_name: lumina-redis
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

## Monitoring

### Health Metrics

The ledger service tracks:
- Write latency (p95 target: <100ms)
- Read latency (p95 target: <50ms)
- Error rate (target: <1%)
- Consensus status
- Node count
- Storage usage

### Health Endpoints

- `/api/ledger/health` - Current health status
- `/api/ledger/statistics` - Ledger statistics

### Prometheus Integration

Metrics are exposed through the existing Prometheus integration:
- `ledger_write_duration_seconds`
- `ledger_read_duration_seconds`
- `ledger_entries_total`
- `ledger_reconciliation_duration_seconds`

## Disaster Recovery

### Backup Strategy

1. **Database Backups**: Regular PostgreSQL backups
2. **Ledger Archives**: Automated archival of old entries
3. **Redis Persistence**: Redis AOF for lock state
4. **Configuration Backups**: Version-controlled configuration

### Recovery Procedures

1. Restore PostgreSQL from backup
2. Restore Redis from AOF
3. Verify ledger integrity using Merkle proofs
4. Run reconciliation to detect any inconsistencies
5. Resolve any detected conflicts

## Performance Requirements

- **Write Latency**: <100ms (p95)
- **Read Latency**: <50ms (p95)
- **Throughput**: 10,000+ writes/second
- **Availability**: 99.99%
- **Data Loss**: Zero

## Security Considerations

### Access Control

- Ledger write operations should be authenticated
- Admin operations (force release, manual resolution) require elevated permissions
- Audit trail for all admin operations

### Data Privacy

- Consider implementing zero-knowledge proofs for sensitive data
- Encryption at rest for archived data
- Secure transmission between nodes

## Testing

### Unit Tests

Run unit tests:
```bash
npm test
```

### Integration Tests

Run integration tests:
```bash
npm run test:e2e
```

### Test Coverage

- Consensus logic
- Merkle tree operations
- Ledger operations
- Reconciliation engine
- Conflict resolution
- Distributed locking

## Troubleshooting

### Common Issues

**High write latency**
- Check Redis connection
- Verify consensus status
- Review database performance

**Consensus failures**
- Ensure minimum 3 nodes
- Check network connectivity
- Verify node configuration

**Reconciliation conflicts**
- Review conflict reports
- Check service integration
- Verify data consistency

## Future Enhancements

1. **Zero-Knowledge Proofs**: Privacy-preserving verification
2. **Cross-Chain Support**: Multi-blockchain ledger integration
3. **Real-time Analytics**: Stream processing for immediate insights
4. **Machine Learning**: Predictive conflict detection
5. **GraphQL API**: Alternative query interface

## Support

For issues or questions:
- Check the troubleshooting section
- Review logs in the ledger service
- Consult reconciliation reports
- Contact the infrastructure team
