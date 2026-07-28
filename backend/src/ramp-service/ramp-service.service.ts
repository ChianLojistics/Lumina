import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RampOperation, RampOperationType, RampOperationStatus, PaymentMethod, CryptoAsset, Provider } from './entities/ramp-operation.entity';
import { BankAccount, BankAccountStatus } from './entities/bank-account.entity';
import { KycRecord, KycStatus } from './entities/kyc-record.entity';
import { InitiateOnRampDto } from './dto/initiate-onramp.dto';
import { InitiateOffRampDto } from './dto/initiate-offramp.dto';
import { WebhookDto } from './dto/webhook.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { InitiateKycDto } from './dto/initiate-kyc.dto';
import { MetricsService } from '../common/metrics/metrics.service';

@Injectable()
export class RampService {
  private readonly logger = new Logger(RampService.name);

  // Provider configuration (should be moved to environment variables)
  private readonly providers = {
    stripe: {
      apiKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    moonpay: {
      apiKey: process.env.MOONPAY_API_KEY,
      webhookSecret: process.env.MOONPAY_WEBHOOK_SECRET,
    },
    banxa: {
      apiKey: process.env.BANXA_API_KEY,
      webhookSecret: process.env.BANXA_WEBHOOK_SECRET,
    },
  };

  // Fee configuration
  private readonly fees = {
    onRamp: {
      card: 0.039, // 3.9%
      bank_transfer: 0.015, // 1.5%
    },
    offRamp: {
      bank_transfer: 0.015, // 1.5%
    },
  };

  // Limits configuration
  private readonly limits = {
    onRamp: {
      min: 10,
      max: 10000,
    },
    offRamp: {
      min: 10,
      max: 50000,
    },
  };

  constructor(
    @InjectRepository(RampOperation)
    private rampOperationRepository: Repository<RampOperation>,
    @InjectRepository(BankAccount)
    private bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(KycRecord)
    private kycRecordRepository: Repository<KycRecord>,
    private metricsService: MetricsService,
  ) {}

  async initiateOnRamp(dto: InitiateOnRampDto): Promise<RampOperation> {
    this.logger.log(`Initiating on-ramp for user ${dto.user_id}`);

    // Validate amount limits
    if (dto.fiat_amount < this.limits.onRamp.min || dto.fiat_amount > this.limits.onRamp.max) {
      throw new BadRequestException(
        `Amount must be between ${this.limits.onRamp.min} and ${this.limits.onRamp.max}`,
      );
    }

    // Check KYC status
    const kycStatus = await this.checkKycStatus(dto.user_id);
    if (kycStatus !== KycStatus.APPROVED) {
      throw new BadRequestException('KYC verification required before on-ramp');
    }

    // Calculate fees and crypto amount
    const feeRate = this.fees.onRamp[dto.payment_method] || this.fees.onRamp.card;
    const fee = dto.fiat_amount * feeRate;
    const netAmount = dto.fiat_amount - fee;

    // Get exchange rate (simplified - should use real rate API)
    const exchangeRate = await this.getExchangeRate(dto.fiat_currency, dto.target_asset);
    const cryptoAmount = netAmount / exchangeRate;

    // Select provider based on payment method
    const provider = this.selectProvider(dto.payment_method);

    // Create ramp operation
    const operation = this.rampOperationRepository.create({
      operation_id: this.generateOperationId(),
      user_id: dto.user_id,
      operation_type: RampOperationType.ON_RAMP,
      status: RampOperationStatus.AWAITING_PAYMENT,
      fiat_amount: dto.fiat_amount,
      fiat_currency: dto.fiat_currency,
      crypto_amount,
      crypto_asset: dto.target_asset,
      payment_method: dto.payment_method,
      provider,
      wallet_address: dto.wallet_address,
      fee,
      exchange_rate: exchangeRateValue,
      kyc_reference_id: dto.kyc_reference_id,
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const savedOperation = await this.rampOperationRepository.save(operation);

    // Initiate payment with provider
    try {
      const providerResponse = await this.initiateProviderPayment(savedOperation, dto);
      savedOperation.provider_transaction_id = providerResponse.transaction_id;
      savedOperation.metadata = providerResponse;
      await this.rampOperationRepository.save(savedOperation);
    } catch (error) {
      this.logger.error(`Provider payment initiation failed: ${error.message}`);
      savedOperation.status = RampOperationStatus.FAILED;
      savedOperation.failure_reason = error.message;
      await this.rampOperationRepository.save(savedOperation);
      throw error;
    }

    return savedOperation;
  }

  async processOnRampWebhook(dto: WebhookDto): Promise<RampOperation> {
    this.logger.log(`Processing on-ramp webhook from ${dto.provider}`);

    // Verify webhook signature
    if (!this.verifyWebhookSignature(dto)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Find operation by provider transaction ID
    const operation = await this.rampOperationRepository.findOne({
      where: { provider_transaction_id: dto.provider_transaction_id },
    });

    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    // Update operation based on webhook data
    operation.webhook_received_at = new Date();
    operation.metadata = { ...operation.metadata, webhook: dto.data };

    switch (dto.event_type) {
      case 'payment.succeeded':
        operation.status = RampOperationStatus.PROCESSING;
        await this.rampOperationRepository.save(operation);
        // Execute crypto transfer
        await this.executeCryptoTransfer(operation);
        break;
      case 'payment.failed':
        operation.status = RampOperationStatus.FAILED;
        operation.failure_reason = dto.data?.reason || 'Payment failed';
        break;
      case 'payment.cancelled':
        operation.status = RampOperationStatus.CANCELLED;
        break;
      default:
        this.logger.warn(`Unknown webhook event type: ${dto.event_type}`);
    }

    if (operation.status === RampOperationStatus.COMPLETED || operation.status === RampOperationStatus.FAILED || operation.status === RampOperationStatus.CANCELLED) {
      operation.completed_at = new Date();
      this.metricsService.recordRampOperation(
        'on_ramp',
        operation.fiat_currency,
        operation.status,
        operation.fiat_amount,
      );
    }

    return this.rampOperationRepository.save(operation);
  }

  async initiateOffRamp(dto: InitiateOffRampDto): Promise<RampOperation> {
    this.logger.log(`Initiating off-ramp for user ${dto.user_id}`);

    // Validate amount limits
    if (dto.crypto_amount < this.limits.offRamp.min || dto.crypto_amount > this.limits.offRamp.max) {
      throw new BadRequestException(
        `Amount must be between ${this.limits.offRamp.min} and ${this.limits.offRamp.max}`,
      );
    }

    // Check KYC status
    const kycStatus = await this.checkKycStatus(dto.user_id);
    if (kycStatus !== KycStatus.APPROVED) {
      throw new BadRequestException('KYC verification required before off-ramp');
    }

    // Get bank account
    const bankAccount = await this.bankAccountRepository.findOne({
      where: { account_id: dto.bank_account_id, user_id: dto.user_id },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (bankAccount.status !== BankAccountStatus.VERIFIED) {
      throw new BadRequestException('Bank account must be verified');
    }

    // Check withdrawal limits
    await this.checkWithdrawalLimits(bankAccount, dto.crypto_amount);

    // Calculate fees and fiat amount
    const feeRate = this.fees.offRamp.bank_transfer;
    const exchangeRateValue = await this.getExchangeRate(dto.target_currency || 'USD', dto.crypto_asset);
    const grossFiatAmount = dto.crypto_amount * exchangeRate;
    const fee = grossFiatAmount * feeRate;
    const netFiatAmount = grossFiatAmount - fee;

    // Create ramp operation
    const operation = this.rampOperationRepository.create({
      operation_id: this.generateOperationId(),
      user_id: dto.user_id,
      operation_type: RampOperationType.OFF_RAMP,
      status: RampOperationStatus.PROCESSING,
      fiat_amount: netFiatAmount,
      fiat_currency: dto.target_currency || 'USD',
      crypto_amount: dto.crypto_amount,
      crypto_asset: dto.crypto_asset,
      bank_account_id: dto.bank_account_id,
      fee,
      exchange_rate: exchangeRateValue,
      kyc_reference_id: dto.kyc_reference_id,
    });

    const savedOperation = await this.rampOperationRepository.save(operation);

    // Execute off-ramp process
    try {
      await this.processOffRamp(savedOperation, bankAccount);
    } catch (error) {
      this.logger.error(`Off-ramp processing failed: ${error.message}`);
      savedOperation.status = RampOperationStatus.FAILED;
      savedOperation.failure_reason = error.message;
      await this.rampOperationRepository.save(savedOperation);
      throw error;
    }

    return savedOperation;
  }

  async processOffRamp(operation: RampOperation, bankAccount: BankAccount): Promise<void> {
    this.logger.log(`Processing off-ramp for operation ${operation.operation_id}`);

    // AML screening for high-value transactions
    if (operation.fiat_amount > 1000) {
      const amlResult = await this.performAmlScreening(operation);
      operation.aml_data = amlResult;
      if (amlResult.risk_level === 'high') {
        throw new BadRequestException('Transaction flagged for AML review');
      }
    }

    // Initiate bank transfer via Stripe
    const stripe = require('stripe')(this.providers.stripe.apiKey);

    try {
      const transfer = await this.metricsService.trackExternalCall('stripe', 'transfers_create', () =>
        stripe.transfers.create({
          amount: Math.round(operation.fiat_amount * 100), // Convert to cents
          currency: operation.fiat_currency.toLowerCase(),
          destination: bankAccount.stripe_bank_account_id,
          metadata: {
            operation_id: operation.operation_id,
            user_id: operation.user_id,
          },
        }),
      );

      operation.provider = Provider.STRIPE;
      operation.provider_transaction_id = transfer.id;
      operation.status = RampOperationStatus.COMPLETED;
      operation.completed_at = new Date();

      // Update bank account withdrawal tracking
      bankAccount.current_daily_withdrawn += operation.fiat_amount;
      bankAccount.current_monthly_withdrawn += operation.fiat_amount;
      bankAccount.last_used_at = new Date();
      await this.bankAccountRepository.save(bankAccount);

      await this.rampOperationRepository.save(operation);
      this.metricsService.recordRampOperation(
        'off_ramp',
        operation.fiat_currency,
        'completed',
        operation.fiat_amount,
      );
    } catch (error) {
      operation.status = RampOperationStatus.FAILED;
      operation.failure_reason = error.message;
      await this.rampOperationRepository.save(operation);
      this.metricsService.recordRampOperation(
        'off_ramp',
        operation.fiat_currency,
        'failed',
        operation.fiat_amount,
      );
      throw error;
    }
  }

  async getOperationStatus(operationId: string): Promise<RampOperation> {
    const operation = await this.rampOperationRepository.findOne({
      where: { operation_id: operationId },
    });

    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    return operation;
  }

  async createBankAccount(dto: CreateBankAccountDto): Promise<BankAccount> {
    this.logger.log(`Creating bank account for user ${dto.user_id}`);

    // Verify bank account via Stripe
    const stripe = require('stripe')(this.providers.stripe.apiKey);

    try {
      const bankAccount = await this.metricsService.trackExternalCall(
        'stripe',
        'accounts_create_external_account',
        () =>
          stripe.accounts.createExternalAccount(process.env.STRIPE_CONNECT_ACCOUNT_ID, {
            external_account: {
              object: 'bank_account',
              country: dto.country,
              currency: dto.currency,
              routing_number: dto.routing_number,
              account_number: dto.account_number,
              account_holder_name: dto.account_holder_name,
              account_holder_type: dto.account_type,
            },
          }),
      );

      const newBankAccount = this.bankAccountRepository.create({
        account_id: this.generateAccountId(),
        user_id: dto.user_id,
        account_holder_name: dto.account_holder_name,
        account_number_last4: dto.account_number.slice(-4),
        routing_number: dto.routing_number,
        bank_name: dto.bank_name,
        country: dto.country,
        currency: dto.currency,
        account_type: dto.account_type,
        stripe_bank_account_id: bankAccount.id,
        status: BankAccountStatus.PENDING,
        daily_withdrawal_limit: 5000,
        monthly_withdrawal_limit: 50000,
      });

      return this.bankAccountRepository.save(newBankAccount);
    } catch (error) {
      this.logger.error(`Bank account creation failed: ${error.message}`);
      throw new BadRequestException('Failed to create bank account');
    }
  }

  async initiateKyc(dto: InitiateKycDto): Promise<KycRecord> {
    this.logger.log(`Initiating KYC for user ${dto.user_id}`);

    const provider = dto.provider || 'stripe_identity';

    const kycRecord = this.kycRecordRepository.create({
      kyc_id: this.generateKycId(),
      user_id: dto.user_id,
      status: KycStatus.IN_PROGRESS,
      provider,
      first_name: dto.first_name,
      last_name: dto.last_name,
      date_of_birth: dto.date_of_birth ? new Date(dto.date_of_birth) : null,
      nationality: dto.nationality,
      country: dto.country,
      document_type: dto.document_type,
      document_number: dto.document_number,
    });

    const savedRecord = await this.kycRecordRepository.save(kycRecord);

    // Initiate KYC with provider
    try {
      const providerResponse = await this.initiateProviderKyc(savedRecord, dto);
      savedRecord.provider_reference_id = providerResponse.reference_id;
      savedRecord.provider_response = providerResponse;
      await this.kycRecordRepository.save(savedRecord);
    } catch (error) {
      this.logger.error(`KYC initiation failed: ${error.message}`);
      savedRecord.status = KycStatus.FAILED;
      await this.kycRecordRepository.save(savedRecord);
      throw error;
    }

    return savedRecord;
  }

  async getKycStatus(userId: string): Promise<KycRecord | null> {
    return this.kycRecordRepository.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  private async checkKycStatus(userId: string): Promise<KycStatus> {
    const kycRecord = await this.getKycStatus(userId);
    return kycRecord?.status || KycStatus.PENDING;
  }

  private selectProvider(paymentMethod: PaymentMethod): Provider {
    switch (paymentMethod) {
      case PaymentMethod.CARD:
        return Provider.STRIPE;
      case PaymentMethod.BANK_TRANSFER:
      case PaymentMethod.ACH:
        return Provider.MOONPAY;
      case PaymentMethod.SEPA:
        return Provider.BANXA;
      default:
        return Provider.STRIPE;
    }
  }

  private async initiateProviderPayment(operation: RampOperation, dto: InitiateOnRampDto): Promise<any> {
    // Simplified provider integration - should be expanded based on actual provider APIs
    switch (operation.provider) {
      case Provider.STRIPE:
        return this.initiateStripePayment(operation, dto);
      case Provider.MOONPAY:
        return this.initiateMoonpayPayment(operation, dto);
      case Provider.BANXA:
        return this.initiateBanxaPayment(operation, dto);
      default:
        throw new BadRequestException('Unsupported payment provider');
    }
  }

  private async initiateStripePayment(operation: RampOperation, dto: InitiateOnRampDto): Promise<any> {
    const stripe = require('stripe')(this.providers.stripe.apiKey);

    const paymentIntent = await this.metricsService.trackExternalCall(
      'stripe',
      'payment_intents_create',
      () =>
        stripe.paymentIntents.create({
          amount: Math.round(operation.fiat_amount * 100),
          currency: operation.fiat_currency.toLowerCase(),
          metadata: {
            operation_id: operation.operation_id,
            user_id: operation.user_id,
            crypto_asset: operation.crypto_asset,
            wallet_address: operation.wallet_address,
          },
        }),
    );

    return {
      transaction_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  private async initiateMoonpayPayment(operation: RampOperation, dto: InitiateOnRampDto): Promise<any> {
    // Simplified MoonPay integration
    return {
      transaction_id: `moonpay_${operation.operation_id}`,
      redirect_url: `https://buy.moonpay.com?apiKey=${this.providers.moonpay.apiKey}`,
    };
  }

  private async initiateBanxaPayment(operation: RampOperation, dto: InitiateOnRampDto): Promise<any> {
    // Simplified Banxa integration
    return {
      transaction_id: `banxa_${operation.operation_id}`,
      redirect_url: `https://banxa.com?apiKey=${this.providers.banxa.apiKey}`,
    };
  }

  private async initiateProviderKyc(kycRecord: KycRecord, dto: InitiateKycDto): Promise<any> {
    // Simplified KYC provider integration
    switch (kycRecord.provider) {
      case 'stripe_identity':
        return this.initiateStripeKyc(kycRecord, dto);
      default:
        throw new BadRequestException('Unsupported KYC provider');
    }
  }

  private async initiateStripeKyc(kycRecord: KycRecord, dto: InitiateKycDto): Promise<any> {
    const stripe = require('stripe')(this.providers.stripe.apiKey);

    const verificationSession = await this.metricsService.trackExternalCall(
      'stripe',
      'identity_verification_sessions_create',
      () =>
        stripe.identity.verificationSessions.create({
          type: 'individual',
          metadata: {
            kyc_id: kycRecord.kyc_id,
            user_id: kycRecord.user_id,
          },
        }),
    );

    return {
      reference_id: verificationSession.id,
      client_secret: verificationSession.client_secret,
      url: verificationSession.url,
    };
  }

  private async executeCryptoTransfer(operation: RampOperation): Promise<void> {
    this.logger.log(`Executing crypto transfer for operation ${operation.operation_id}`);
    
    // This should integrate with the blockchain service to transfer crypto
    // For now, we'll mark as completed
    operation.status = RampOperationStatus.COMPLETED;
    operation.completed_at = new Date();
    await this.rampOperationRepository.save(operation);
  }

  private async performAmlScreening(operation: RampOperation): Promise<any> {
    this.logger.log(`Performing AML screening for operation ${operation.operation_id}`);
    
    // Simplified AML screening - should integrate with actual AML provider
    return {
      risk_level: 'low',
      screened_at: new Date(),
      flags: [],
    };
  }

  private async checkWithdrawalLimits(bankAccount: BankAccount, amount: number): Promise<void> {
    // Reset daily limit if last used was yesterday
    if (bankAccount.last_used_at) {
      const lastUsed = new Date(bankAccount.last_used_at);
      const today = new Date();
      if (lastUsed.getDate() !== today.getDate() || lastUsed.getMonth() !== today.getMonth()) {
        bankAccount.current_daily_withdrawn = 0;
      }
    }

    if (bankAccount.current_daily_withdrawn + amount > bankAccount.daily_withdrawal_limit) {
      throw new BadRequestException('Daily withdrawal limit exceeded');
    }

    if (bankAccount.current_monthly_withdrawn + amount > bankAccount.monthly_withdrawal_limit) {
      throw new BadRequestException('Monthly withdrawal limit exceeded');
    }
  }

  private async getExchangeRate(fromCurrency: string, toAsset: CryptoAsset): Promise<number> {
    // Simplified exchange rate - should use real API
    const rates: Record<string, number> = {
      'USD_USDC': 1,
      'USD_XLM': 0.1,
      'USD_BTC': 0.000015,
      'USD_ETH': 0.0003,
      'EUR_USDC': 1.08,
      'EUR_XLM': 0.108,
      'GBP_USDC': 1.27,
      'GBP_XLM': 0.127,
    };

    const key = `${fromCurrency.toUpperCase()}_${toAsset}`;
    return rates[key] || 1;
  }

  private verifyWebhookSignature(dto: WebhookDto): boolean {
    // Simplified signature verification - should implement proper verification
    const secret = this.providers[dto.provider]?.webhookSecret;
    if (!secret) return false;

    // Implement actual signature verification based on provider's requirements
    return true;
  }

  private generateOperationId(): string {
    return `ramp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAccountId(): string {
    return `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateKycId(): string {
    return `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
