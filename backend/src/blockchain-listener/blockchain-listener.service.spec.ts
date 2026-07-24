jest.mock('@stellar/stellar-sdk', () => {
  const actual = jest.requireActual('@stellar/stellar-sdk');
  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      Server: jest.fn(),
    },
  };
});

import { rpc } from '@stellar/stellar-sdk';
import { BlockchainListenerService } from './blockchain-listener.service';
import { Payment, PaymentCurrency, PaymentStatus } from '../payment/entities/payment.entity';
import { NotificationEvent } from '../notification-service/events/notification-event.enum';

function buildPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-uuid',
    payment_id: 'pay_1',
    merchant_address: 'merchant-address-1',
    amount: 10,
    currency: PaymentCurrency.USDC,
    status: PaymentStatus.PENDING,
    transaction_hash: 'tx-hash-1',
    stellar_contract_id: null,
    converted_amount: null,
    conversion_rate: null,
    conversion_fee: null,
    converted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    expires_at: new Date(Date.now() + 60_000),
    ...overrides,
  } as Payment;
}

describe('BlockchainListenerService', () => {
  let service: BlockchainListenerService;
  let paymentRepository: { find: jest.Mock; update: jest.Mock };
  let merchantRepository: { findOne: jest.Mock };
  let paymentService: { updateStatus: jest.Mock };
  let notificationService: { sendWebhook: jest.Mock };
  let getTransaction: jest.Mock;
  let getNetwork: jest.Mock;

  beforeEach(() => {
    paymentRepository = { find: jest.fn().mockResolvedValue([]), update: jest.fn() };
    merchantRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'merchant-uuid', stellar_address: 'merchant-address-1' }),
    };
    paymentService = { updateStatus: jest.fn().mockResolvedValue(undefined) };
    notificationService = { sendWebhook: jest.fn().mockResolvedValue(undefined) };

    getTransaction = jest.fn();
    getNetwork = jest.fn().mockResolvedValue({ passphrase: 'Test SDF Network ; September 2015' });

    (rpc.Server as unknown as jest.Mock).mockImplementation(() => ({
      getTransaction,
      getNetwork,
    }));

    service = new BlockchainListenerService(
      paymentRepository as any,
      merchantRepository as any,
      paymentService as any,
      notificationService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('monitorTransactions', () => {
    it('expires payments whose expires_at is in the past', async () => {
      const expiredPayment = buildPayment({ expires_at: new Date(Date.now() - 1000) });
      paymentRepository.find.mockResolvedValue([expiredPayment]);

      await service.monitorTransactions();

      expect(paymentRepository.update).toHaveBeenCalledWith(expiredPayment.id, {
        status: PaymentStatus.EXPIRED,
      });
      expect(getTransaction).not.toHaveBeenCalled();
    });

    it('skips payments that have no transaction_hash yet', async () => {
      const payment = buildPayment({ transaction_hash: null });
      paymentRepository.find.mockResolvedValue([payment]);

      await service.monitorTransactions();

      expect(getTransaction).not.toHaveBeenCalled();
      expect(paymentService.updateStatus).not.toHaveBeenCalled();
    });

    it('batches payments that share the same transaction hash into a single RPC call', async () => {
      const paymentA = buildPayment({ payment_id: 'pay_a', transaction_hash: 'shared-hash' });
      const paymentB = buildPayment({ payment_id: 'pay_b', transaction_hash: 'shared-hash' });
      paymentRepository.find.mockResolvedValue([paymentA, paymentB]);
      getTransaction.mockResolvedValue({ status: rpc.Api.GetTransactionStatus.SUCCESS });

      await service.monitorTransactions();

      expect(getTransaction).toHaveBeenCalledTimes(1);
      expect(paymentService.updateStatus).toHaveBeenCalledWith(
        'pay_a',
        PaymentStatus.CONFIRMED,
        'shared-hash',
      );
      expect(paymentService.updateStatus).toHaveBeenCalledWith(
        'pay_b',
        PaymentStatus.CONFIRMED,
        'shared-hash',
      );
    });

    it('confirms a payment and sends a webhook when the transaction succeeds', async () => {
      const payment = buildPayment();
      paymentRepository.find.mockResolvedValue([payment]);
      getTransaction.mockResolvedValue({ status: rpc.Api.GetTransactionStatus.SUCCESS });

      await service.monitorTransactions();

      expect(paymentService.updateStatus).toHaveBeenCalledWith(
        payment.payment_id,
        PaymentStatus.CONFIRMED,
        payment.transaction_hash,
      );
      expect(notificationService.sendWebhook).toHaveBeenCalledWith(
        NotificationEvent.PAYMENT_CONFIRMED,
        'merchant-uuid',
        expect.objectContaining({ payment_id: payment.payment_id }),
      );
    });

    it('marks a payment failed and sends a webhook when the transaction fails on-chain', async () => {
      const payment = buildPayment();
      paymentRepository.find.mockResolvedValue([payment]);
      getTransaction.mockResolvedValue({ status: rpc.Api.GetTransactionStatus.FAILED });

      await service.monitorTransactions();

      expect(paymentService.updateStatus).toHaveBeenCalledWith(
        payment.payment_id,
        PaymentStatus.FAILED,
        payment.transaction_hash,
      );
      expect(notificationService.sendWebhook).toHaveBeenCalledWith(
        NotificationEvent.PAYMENT_FAILED,
        'merchant-uuid',
        expect.objectContaining({ payment_id: payment.payment_id }),
      );
    });

    it('leaves the payment untouched while the transaction is still not found', async () => {
      const payment = buildPayment();
      paymentRepository.find.mockResolvedValue([payment]);
      getTransaction.mockResolvedValue({ status: rpc.Api.GetTransactionStatus.NOT_FOUND });

      await service.monitorTransactions();

      expect(paymentService.updateStatus).not.toHaveBeenCalled();
      expect(notificationService.sendWebhook).not.toHaveBeenCalled();
    });

    it('skips the webhook when no merchant matches the payment address', async () => {
      const payment = buildPayment();
      paymentRepository.find.mockResolvedValue([payment]);
      getTransaction.mockResolvedValue({ status: rpc.Api.GetTransactionStatus.SUCCESS });
      merchantRepository.findOne.mockResolvedValue(null);

      await service.monitorTransactions();

      expect(paymentService.updateStatus).toHaveBeenCalled();
      expect(notificationService.sendWebhook).not.toHaveBeenCalled();
    });

    it('does not run overlapping poll cycles', async () => {
      paymentRepository.find.mockResolvedValue([]);

      const first = service.monitorTransactions();
      const second = service.monitorTransactions();

      await Promise.all([first, second]);

      expect(paymentRepository.find).toHaveBeenCalledTimes(1);
    });

    it('opens the circuit breaker after repeated RPC failures and stops querying', async () => {
      const originalMaxRetry = process.env.MAX_RETRY_ATTEMPTS;
      process.env.MAX_RETRY_ATTEMPTS = '1';

      const noRetryService = new BlockchainListenerService(
        paymentRepository as any,
        merchantRepository as any,
        paymentService as any,
        notificationService as any,
      );

      process.env.MAX_RETRY_ATTEMPTS = originalMaxRetry;

      getTransaction.mockRejectedValue(new Error('RPC unavailable'));

      // Circuit breaker default failure threshold is 5.
      for (let i = 0; i < 5; i++) {
        paymentRepository.find.mockResolvedValue([
          buildPayment({ payment_id: `pay_${i}`, transaction_hash: `hash_${i}` }),
        ]);
        await noRetryService.monitorTransactions();
      }

      expect(getTransaction).toHaveBeenCalledTimes(5);
      getTransaction.mockClear();

      paymentRepository.find.mockResolvedValue([
        buildPayment({ payment_id: 'pay_after_trip', transaction_hash: 'hash_after_trip' }),
      ]);
      await noRetryService.monitorTransactions();

      expect(getTransaction).not.toHaveBeenCalled();
    });
  });

  describe('startListener', () => {
    it('logs a warning when the RPC network passphrase does not match configuration', async () => {
      getNetwork.mockResolvedValue({ passphrase: 'Public Global Stellar Network ; September 2015' });
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();

      await service.startListener();

      expect(warnSpy).toHaveBeenCalled();
    });

    it('logs an error if the RPC server cannot be reached', async () => {
      getNetwork.mockRejectedValue(new Error('connection refused'));
      const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();

      await service.startListener();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect to Stellar RPC'),
      );
    });
  });
});
