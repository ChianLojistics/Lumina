# Ramp Service

The Ramp Service handles fiat on-ramp (card/bank → crypto) and off-ramp (crypto → bank) operations for the Lumina platform.

## Features

### On-Ramp (Fiat → Crypto)
- **Payment Methods**: Card, Bank Transfer (ACH), SEPA
- **Providers**: Stripe, MoonPay, Banxa
- **KYC Verification**: Required before on-ramp operations
- **Fee Structure**: 
  - Card: 3.9%
  - Bank Transfer: 1.5%
- **Limits**: $10 - $10,000 per transaction

### Off-Ramp (Crypto → Bank)
- **Bank Withdrawals**: Multi-currency support
- **Withdrawal Limits**:
  - Daily: $5,000 per bank account
  - Monthly: $50,000 per bank account
- **AML Screening**: Automatic for transactions > $1,000
- **Fee Structure**: 1.5% for bank transfers
- **Limits**: $10 - $50,000 per transaction

### KYC/AML Compliance
- **KYC Providers**: Stripe Identity, SumSub, ComplyAdvantage
- **Verification Levels**: Pending, In Progress, Approved, Rejected, Failed, Expired
- **AML Screening**: Risk-based screening for high-value transactions
- **GDPR Compliant**: User data handling per privacy requirements

## API Endpoints

### On-Ramp Operations
- `POST /api/ramp/onramp/initiate` - Start a new on-ramp operation
- `GET /api/ramp/onramp/status/:operationId` - Get on-ramp operation status

### Off-Ramp Operations
- `POST /api/ramp/offramp/initiate` - Start a new off-ramp operation
- `GET /api/ramp/offramp/status/:operationId` - Get off-ramp operation status

### Webhooks
- `POST /api/ramp/webhook` - Handle payment provider webhooks

### Bank Accounts
- `POST /api/ramp/bank-account` - Add a new bank account

### KYC
- `POST /api/ramp/kyc/initiate` - Start KYC verification
- `GET /api/ramp/kyc/status/:userId` - Get KYC status

## Environment Variables

Required environment variables:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_ACCOUNT_ID=acct_...

# MoonPay
MOONPAY_API_KEY=pk_test_...
MOONPAY_WEBHOOK_SECRET=...

# Banxa
BANXA_API_KEY=...
BANXA_WEBHOOK_SECRET=...
```

## Database Entities

### RampOperation
- Tracks all on-ramp and off-ramp operations
- Stores transaction status, fees, exchange rates
- Links to KYC records and bank accounts

### BankAccount
- User bank account information
- Verification status and withdrawal limits
- Daily/monthly withdrawal tracking

### KycRecord
- KYC verification records
- Provider integration data
- Document verification status

## Security & Compliance

- **PCI DSS**: Card payment processing via Stripe
- **KYC Verification**: Mandatory before ramp operations
- **AML Screening**: Automatic for high-value transactions
- **GDPR**: User data handling and privacy
- **Webhook Signature Verification**: All provider webhooks verified

## Usage Example

### On-Ramp
```typescript
const onRamp = await rampService.initiateOnRamp({
  user_id: 'user_123',
  fiat_amount: 100,
  fiat_currency: 'USD',
  target_asset: CryptoAsset.USDC,
  payment_method: PaymentMethod.CARD,
  wallet_address: '0x...',
  kyc_reference_id: 'kyc_abc'
});
```

### Off-Ramp
```typescript
const offRamp = await rampService.initiateOffRamp({
  user_id: 'user_123',
  crypto_amount: 50,
  crypto_asset: CryptoAsset.USDC,
  bank_account_id: 'bank_xyz',
  target_currency: 'USD'
});
```

## Error Handling

The service throws specific exceptions for:
- Invalid amounts (outside limits)
- KYC not approved
- Bank account not verified
- Withdrawal limits exceeded
- Payment provider failures
- AML screening flags

## Future Enhancements

- Real-time exchange rate API integration
- Additional payment providers
- Enhanced AML screening with more providers
- Support for more cryptocurrencies
- Instant off-ramp for verified users
- Recurring withdrawal setup
