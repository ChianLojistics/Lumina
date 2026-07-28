import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { rpc } from '@stellar/stellar-sdk';
import { Payment, PaymentStatus } from '../payment/entities/payment.entity';
import { Merchant } from '../payment/entities/merchant.entity';
import { PaymentService } from '../payment/payment.service';
import { NotificationServiceService } from '../notification-service/notification-service.service';
import { NotificationEvent } from '../notification-service/events/notification-event.enum';
import { BlockchainException } from '../common/exceptions';
import { MetricsService } from '../common/metrics/metrics.service';
import { CircuitBreaker } from './circuit-breaker';
import { retryWithBackoff } from './retry.util';

type TransactionCheckResult =
  | { outcome: 'confirmed' }
  | { outcome: 'failed'; reason: string }
  | { outcome: 'pending' };

@Injectable()
export class BlockchainListenerService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainListenerService.name);
  private readonly server: rpc.Server;
  private readonly stellarRpcUrl: string;
  private readonly stellarNetworkPassphrase: string;
  private readonly queryTimeoutMs: number;
  private readonly maxRetryAttempts: number;
  private readonly circuitBreaker: CircuitBreaker;
  private isPolling = false;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    private paymentService: PaymentService,
    private notificationService: NotificationServiceService,
    private metricsService: MetricsService,
  ) {
    this.stellarRpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
    this.stellarNetworkPassphrase =
      process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
    this.queryTimeoutMs = parseInt(process.env.TRANSACTION_QUERY_TIMEOUT || '', 10) || 10_000;
    this.maxRetryAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS || '', 10) || 3;
    this.circuitBreaker = new CircuitBreaker();
    this.server = new rpc.Server(this.stellarRpcUrl, {
      allowHttp: !this.stellarRpcUrl.startsWith('https'),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.startListener();
  }

  async startListener(): Promise<void> {
    this.logger.log(`Connecting to Stellar RPC at ${this.stellarRpcUrl}`);

    try {
      const network = await this.metricsService.trackExternalCall('stellar_rpc', 'get_network', () =>
        retryWithBackoff(() => this.server.getNetwork(), {
          maxAttempts: this.maxRetryAttempts,
          timeoutMs: this.queryTimeoutMs,
        }),
      );

      if (network.passphrase !== this.stellarNetworkPassphrase) {
        this.logger.warn(
          `Configured STELLAR_NETWORK_PASSPHRASE ("${this.stellarNetworkPassphrase}") does not ` +
            `match the RPC server's network ("${network.passphrase}")`,
        );
      }

      this.logger.log(`Connected to Stellar RPC. Network passphrase: ${network.passphrase}`);
    } catch (error: any) {
      this.logger.error(`Failed to connect to Stellar RPC on startup: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorTransactions(): Promise<void> {
    if (this.isPolling) {
      this.logger.warn('Skipping poll cycle: previous cycle is still in progress');
      return;
    }

    this.isPolling = true;

    try {
      const pendingPayments = await this.paymentRepository.find({
        where: { status: PaymentStatus.PENDING },
      });

      if (pendingPayments.length === 0) {
        return;
      }

      this.logger.log(`Checking ${pendingPayments.length} pending payment(s)...`);

      const now = new Date();
      const expired: Payment[] = [];
      const paymentsByHash = new Map<string, Payment[]>();

      for (const payment of pendingPayments) {
        if (payment.expires_at && now > payment.expires_at) {
          expired.push(payment);
          continue;
        }

        if (!payment.transaction_hash) {
          // Customer hasn't submitted an on-chain transaction yet; nothing to query.
          continue;
        }

        const group = paymentsByHash.get(payment.transaction_hash) ?? [];
        group.push(payment);
        paymentsByHash.set(payment.transaction_hash, group);
      }

      await Promise.allSettled(expired.map((payment) => this.expirePayment(payment)));

      // Batch by transaction hash so multiple payments referencing the same
      // transaction only trigger a single RPC query.
      await Promise.allSettled(
        Array.from(paymentsByHash.entries()).map(([hash, payments]) =>
          this.processTransactionHash(hash, payments),
        ),
      );
    } catch (error: any) {
      this.logger.error(`Error monitoring transactions: ${error.message}`, error.stack);
    } finally {
      this.isPolling = false;
    }
  }

  private async expirePayment(payment: Payment): Promise<void> {
    await this.paymentRepository.update(payment.id, { status: PaymentStatus.EXPIRED });
    this.logger.log(`Payment ${payment.payment_id} expired`);
  }

  private async processTransactionHash(hash: string, payments: Payment[]): Promise<void> {
    let result: TransactionCheckResult;

    try {
      result = await this.queryStellarTransaction(hash);
    } catch (error: any) {
      const paymentIds = payments.map((payment) => payment.payment_id).join(', ');
      this.logger.error(
        `Error checking transaction ${hash} for payment(s) ${paymentIds}: ${error.message}`,
      );
      return;
    }

    if (result.outcome === 'pending') {
      return;
    }

    for (const payment of payments) {
      await this.applyTransactionResult(payment, hash, result);
    }
  }

  private async applyTransactionResult(
    payment: Payment,
    transactionHash: string,
    result: Extract<TransactionCheckResult, { outcome: 'confirmed' | 'failed' }>,
  ): Promise<void> {
    try {
      if (result.outcome === 'confirmed') {
        await this.paymentService.updateStatus(
          payment.payment_id,
          PaymentStatus.CONFIRMED,
          transactionHash,
        );
        this.logger.log(`Payment ${payment.payment_id} confirmed via transaction ${transactionHash}`);
        await this.notifyMerchant(payment, NotificationEvent.PAYMENT_CONFIRMED, transactionHash);
      } else {
        await this.paymentService.updateStatus(
          payment.payment_id,
          PaymentStatus.FAILED,
          transactionHash,
        );
        this.logger.log(
          `Payment ${payment.payment_id} failed on-chain (${transactionHash}): ${result.reason}`,
        );
        await this.notifyMerchant(
          payment,
          NotificationEvent.PAYMENT_FAILED,
          transactionHash,
          result.reason,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to update payment ${payment.payment_id} after checking transaction ${transactionHash}: ${error.message}`,
      );
    }
  }

  private async notifyMerchant(
    payment: Payment,
    event: NotificationEvent,
    transactionHash: string,
    reason?: string,
  ): Promise<void> {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: { stellar_address: payment.merchant_address },
      });

      if (!merchant) {
        this.logger.warn(
          `No merchant found for address ${payment.merchant_address}; skipping webhook for payment ${payment.payment_id}`,
        );
        return;
      }

      await this.notificationService.sendWebhook(event, merchant.id, {
        payment_id: payment.payment_id,
        transaction_hash: transactionHash,
        amount: payment.amount,
        currency: payment.currency,
        ...(reason ? { reason } : {}),
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to send webhook for payment ${payment.payment_id}: ${error.message}`,
      );
    }
  }

  private async queryStellarTransaction(transactionHash: string): Promise<TransactionCheckResult> {
    if (!this.circuitBreaker.canAttempt()) {
      this.logger.warn(
        `Circuit breaker open; skipping Stellar RPC query for transaction ${transactionHash}`,
      );
      return { outcome: 'pending' };
    }

    try {
      const response = await this.metricsService.trackExternalCall(
        'stellar_rpc',
        'get_transaction',
        () =>
          retryWithBackoff(() => this.server.getTransaction(transactionHash), {
            maxAttempts: this.maxRetryAttempts,
            timeoutMs: this.queryTimeoutMs,
          }),
      );

      this.circuitBreaker.onSuccess();
      return this.mapTransactionResponse(response);
    } catch (error: any) {
      this.circuitBreaker.onFailure();
      throw BlockchainException.rpcError(error.message);
    }
  }

  private mapTransactionResponse(response: rpc.Api.GetTransactionResponse): TransactionCheckResult {
    switch (response.status) {
      case rpc.Api.GetTransactionStatus.SUCCESS:
        return { outcome: 'confirmed' };
      case rpc.Api.GetTransactionStatus.FAILED:
        return { outcome: 'failed', reason: 'Transaction failed on-chain' };
      case rpc.Api.GetTransactionStatus.NOT_FOUND:
      default:
        return { outcome: 'pending' };
    }
  }
}
