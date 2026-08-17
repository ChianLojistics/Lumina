# Fraud Detection Rules Engine

A real-time fraud detection rules engine that allows merchants and admins to define custom fraud detection rules without code changes.

## Features

- **Configurable Rules Engine**: Define custom fraud detection rules using a flexible DSL
- **Real-time Rule Evaluation**: Evaluate transactions against rules in real-time
- **Dynamic Rule Updates**: Update rules without service restarts
- **Complex Rule Composition**: Support for AND/OR/NOT logical operators
- **Merchant-specific Rule Sets**: Define rules per merchant or global rules
- **Rule Versioning and Rollback**: Track rule changes and rollback to previous versions
- **Performance-optimized Evaluation**: Redis caching for fast rule evaluation
- **Rule Testing Framework**: Test rules against sample data before deployment
- **Rule Analytics**: Monitor rule performance and effectiveness

## Architecture

### Components

1. **Rules Engine Service** (`rules-engine.service.ts`)
   - Core rule evaluation logic
   - Redis caching for performance
   - Real-time rule evaluation

2. **Rule Management Service** (`rule-management.service.ts`)
   - CRUD operations for rules
   - Rule versioning and rollback
   - Dynamic rule reloading

3. **Rule Testing Service** (`rule-testing.service.ts`)
   - Rule validation
   - Test rule against sample data
   - Accuracy metrics

4. **Fraud Detection Service** (`fraud-detection.service.ts`)
   - Transaction evaluation
   - Analytics aggregation
   - Integration point for other services

## Rule DSL

### Rule Structure

```typescript
{
  "id": "rule_001",
  "name": "High Value Transaction Alert",
  "description": "Alert on transactions over $10,000",
  "enabled": true,
  "priority": "HIGH",
  "conditions": [...],
  "actions": [...]
}
```

### Condition Operators

- `EQ` - Equal to
- `NE` - Not equal to
- `GT` - Greater than
- `LT` - Less than
- `GTE` - Greater than or equal to
- `LTE` - Less than or equal to
- `IN` - Value in array
- `NOT_IN` - Value not in array
- `CONTAINS` - String contains
- `STARTS_WITH` - String starts with
- `ENDS_WITH` - String ends with
- `REGEX` - Regular expression match

### Logical Operators

- `AND` - All conditions must match
- `OR` - At least one condition must match
- `NOT` - Condition must not match

### Action Types

- `ALERT` - Send an alert
- `BLOCK` - Block the transaction
- `REQUIRE_2FA` - Require two-factor authentication
- `FLAG` - Flag for review
- `LIMIT` - Limit transaction amount
- `CHALLENGE` - Present a challenge

### Priority Levels

- `LOW` - Informational
- `MEDIUM` - Requires attention
- `HIGH` - Serious concern
- `CRITICAL` - Immediate action required

## API Endpoints

### Rule Management

- `GET /api/fraud-detection/rules` - List all rules
- `GET /api/fraud-detection/rules/:id` - Get specific rule
- `POST /api/fraud-detection/rules` - Create new rule
- `PUT /api/fraud-detection/rules/:id` - Update rule
- `DELETE /api/fraud-detection/rules/:id` - Delete rule
- `POST /api/fraud-detection/rules/:id/toggle` - Enable/disable rule

### Rule Testing

- `POST /api/fraud-detection/rules/:id/test` - Test rule against sample data
- `POST /api/fraud-detection/validate` - Validate rule configuration

### Rule Versioning

- `GET /api/fraud-detection/rules/:id/versions` - Get rule version history
- `POST /api/fraud-detection/rules/:id/rollback/:version` - Rollback to previous version

### Rule Management

- `POST /api/fraud-detection/rules/reload` - Reload rules from database

### Analytics

- `GET /api/fraud-detection/analytics` - Get rule analytics
- `GET /api/fraud-detection/analytics?ruleId=:id` - Get specific rule analytics
- `GET /api/fraud-detection/analytics?merchantId=:id` - Get merchant analytics

### Transaction Evaluation

- `POST /api/fraud-detection/evaluate` - Evaluate transaction against rules

## Example Rules

### High Value Transaction Alert

```json
{
  "name": "High Value Transaction Alert",
  "description": "Alert on transactions over $10,000",
  "enabled": true,
  "priority": "HIGH",
  "conditions": [
    {
      "field": "amount",
      "operator": "GT",
      "value": 10000
    }
  ],
  "actions": [
    {
      "type": "ALERT",
      "params": {
        "severity": "HIGH",
        "message": "High value transaction detected"
      }
    }
  ]
}
```

### Velocity Check with Composite Conditions

```json
{
  "name": "Velocity Check - Multiple Cards",
  "description": "Block if more than 3 different cards in 5 minutes",
  "enabled": true,
  "priority": "CRITICAL",
  "conditions": [
    {
      "type": "COMPOSITE",
      "logicalOperator": "AND",
      "conditions": [
        {
          "field": "transaction_count",
          "window": "5m",
          "operator": "GT",
          "value": 3
        },
        {
          "field": "unique_cards",
          "window": "5m",
          "operator": "GT",
          "value": 3
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "BLOCK",
      "params": {
        "reason": "Velocity check failed - multiple cards"
      }
    }
  ]
}
```

## Integration with Payment Service

The fraud detection engine can be integrated with the payment service via HTTP API:

```typescript
// In payment service
async evaluateFraud(payment: Payment, merchantId: string) {
  const response = await this.httpService.post(
    'http://localhost:3000/api/fraud-detection/evaluate',
    { payment, merchantId }
  ).toPromise();

  if (response.data.blocked) {
    // Handle blocked transaction
  }

  if (response.data.flagged) {
    // Handle flagged transaction
  }
}
```

## Database Schema

### fraud_rules
- `id` - UUID primary key
- `merchant_id` - Merchant UUID (nullable for global rules)
- `name` - Rule name
- `description` - Rule description
- `rule_config` - JSONB configuration
- `enabled` - Boolean
- `priority` - Rule priority
- `version` - Current version
- `created_by` - User who created
- `updated_by` - User who last updated
- `created_at` - Timestamp
- `updated_at` - Timestamp

### rule_versions
- `id` - UUID primary key
- `rule_id` - Reference to fraud_rules
- `version` - Version number
- `rule_config` - JSONB configuration
- `created_by` - User who created version
- `change_description` - Description of change
- `created_at` - Timestamp

### rule_evaluations
- `id` - UUID primary key
- `rule_id` - Reference to fraud_rules
- `transaction_id` - Transaction ID
- `merchant_id` - Merchant ID
- `matched` - Boolean if rule matched
- `evaluation_time_ms` - Evaluation time
- `evaluation_context` - JSONB context
- `evaluated_at` - Timestamp

### rule_analytics
- `id` - UUID primary key
- `rule_id` - Reference to fraud_rules
- `merchant_id` - Merchant ID
- `date` - Date
- `total_evaluations` - Total evaluations
- `total_matches` - Total matches
- `match_rate` - Match rate percentage
- `avg_evaluation_time_ms` - Average evaluation time
- `created_at` - Timestamp

## Performance Considerations

- **Redis Caching**: Rules are cached in Redis with 5-minute TTL
- **In-Memory Cache**: Additional in-memory cache for frequently accessed rules
- **Composite Evaluation**: Short-circuit evaluation for composite conditions
- **Analytics Async**: Analytics updates are performed asynchronously
- **Database Indexes**: Proper indexes on frequently queried fields

## Security

- Rule management endpoints are protected with JWT authentication
- Admin-only endpoints require role-based access control
- Rule validation prevents injection attacks
- Audit trail for all rule changes

## Testing

### Unit Tests

Test individual rule conditions and operators:

```typescript
describe('RulesEngine', () => {
  it('should evaluate GT condition correctly', async () => {
    const result = await rulesEngine.evaluateCondition(
      { field: 'amount', operator: 'GT', value: 100 },
      { transaction: { amount: 150 } }
    );
    expect(result).toBe(true);
  });
});
```

### Integration Tests

Test complete rule evaluation:

```typescript
describe('Rule Integration', () => {
  it('should block transaction matching critical rule', async () => {
    const result = await fraudDetectionService.evaluateTransaction(
      { amount: 15000 },
      merchantId
    );
    expect(result.blocked).toBe(true);
  });
});
```

## Monitoring

The system includes built-in metrics for:

- Rule evaluation time
- Rule match rate
- Cache hit/miss ratio
- Database query performance

These metrics can be integrated with Prometheus/Grafana for visualization.

## Future Enhancements

- ML-based rule suggestions
- Real-time rule updates via WebSocket
- Advanced time-window operators
- Geospatial conditions
- Machine learning model integration
- Rule templates and marketplace
