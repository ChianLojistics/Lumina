import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceOracleService } from './price-oracle.service';
import { ConversionAsset } from './asset.enum';
import { Conversion, ConversionStatus } from './entities/conversion.entity';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentException } from '../common/exceptions';

const RETRY_BASE_DELAY_MS = 60 * 1000;
const RETRY_MAX_DELAY_MS = 60 * 60 * 1000;

export interface ConversionRate {
  rate: number;
  source: string;
}

export interface ConvertedAmount extends ConversionRate {
  convertedAmount: number;
}

export interface ConversionFeeEstimate extends ConversionRate {
  feeAmount: number;
  feeBps: number;
  grossConvertedAmount: number;
  netConvertedAmount: number;
}

@Injectable()
export class ConversionEngineService {
  private readonly logger = new Logger(ConversionEngineService.name);
  private readonly feeBps: number;

  constructor(
    private readonly priceOracle: PriceOracleService,
    @InjectRepository(Conversion)
    private conversionRepository: Repository<Conversion>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {
    this.feeBps = parseInt(process.env.CONVERSION_FEE_BPS || '', 10) || 50;
  }

  async getConversionRate(
    fromAsset: ConversionAsset,
    toAsset: ConversionAsset,
  ): Promise<ConversionRate> {
    if (fromAsset === toAsset) {
      return { rate: 1, source: 'identity' };
    }

    const [fromQuote, toQuote] = await Promise.all([
      this.priceOracle.getPriceUsd(fromAsset),
      this.priceOracle.getPriceUsd(toAsset),
    ]);

    return {
      rate: fromQuote.price / toQuote.price,
      source: `${fromQuote.source}/${toQuote.source}`,
    };
  }

  async convertAmount(
    amount: number,
    fromAsset: ConversionAsset,
    toAsset: ConversionAsset,
  ): Promise<ConvertedAmount> {
    const { rate, source } = await this.getConversionRate(fromAsset, toAsset);
    return { convertedAmount: amount * rate, rate, source };
  }

  async estimateFee(
    fromAsset: ConversionAsset,
    toAsset: ConversionAsset,
    amount: number,
  ): Promise<ConversionFeeEstimate> {
    const { convertedAmount, rate, source } = await this.convertAmount(amount, fromAsset, toAsset);
    const feeAmount = (amount * this.feeBps) / 10_000;
    const netConvertedAmount = (amount - feeAmount) * rate;

    return {
      feeAmount,
      feeBps: this.feeBps,
      rate,
      source,
      grossConvertedAmount: convertedAmount,
      netConvertedAmount,
    };
  }

  async executeConversion(
    paymentId: string,
    fromAsset: ConversionAsset,
    toAsset: ConversionAsset,
  ): Promise<Conversion> {
    const payment = await this.paymentRepository.findOne({ where: { payment_id: paymentId } });

    if (!payment) {
      throw PaymentException.notFound(paymentId);
    }

    const conversion = await this.conversionRepository.save(
      this.conversionRepository.create({
        payment_id: paymentId,
        from_asset: fromAsset,
        to_asset: toAsset,
        amount: payment.amount,
        status: ConversionStatus.PENDING,
      }),
    );

    return this.attemptConversion(conversion, payment);
  }

  async getConversionStatus(paymentId: string): Promise<Conversion[]> {
    return this.conversionRepository.find({
      where: { payment_id: paymentId },
      order: { created_at: 'DESC' },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedConversions(): Promise<void> {
    const pending = await this.conversionRepository.find({
      where: {
        status: ConversionStatus.RETRYING,
        next_retry_at: LessThanOrEqual(new Date()),
      },
    });

    for (const conversion of pending) {
      const payment = await this.paymentRepository.findOne({
        where: { payment_id: conversion.payment_id },
      });

      if (!payment) {
        continue;
      }

      await this.attemptConversion(conversion, payment);
    }
  }

  private async attemptConversion(conversion: Conversion, payment: Payment): Promise<Conversion> {
    conversion.attempts += 1;

    try {
      const { feeAmount, netConvertedAmount, rate, source } = await this.estimateFee(
        conversion.from_asset as ConversionAsset,
        conversion.to_asset as ConversionAsset,
        Number(conversion.amount),
      );

      conversion.converted_amount = netConvertedAmount;
      conversion.rate = rate;
      conversion.fee_amount = feeAmount;
      conversion.price_source = source;
      conversion.status = ConversionStatus.COMPLETED;
      conversion.next_retry_at = null;
      conversion.error_message = null;

      await this.paymentRepository.update(payment.id, {
        converted_amount: netConvertedAmount,
        conversion_rate: rate,
        conversion_fee: feeAmount,
        converted_at: new Date(),
      });
    } catch (error: any) {
      this.scheduleRetry(conversion, error.message);
    }

    return this.conversionRepository.save(conversion);
  }

  private scheduleRetry(conversion: Conversion, errorMessage: string): void {
    conversion.error_message = errorMessage;

    if (conversion.attempts >= conversion.max_attempts) {
      conversion.status = ConversionStatus.FAILED;
      conversion.next_retry_at = null;
      this.logger.warn(`Conversion ${conversion.id} exhausted retries: ${errorMessage}`);
      return;
    }

    const delay = Math.min(
      RETRY_BASE_DELAY_MS * 2 ** (conversion.attempts - 1),
      RETRY_MAX_DELAY_MS,
    );
    conversion.status = ConversionStatus.RETRYING;
    conversion.next_retry_at = new Date(Date.now() + delay);
  }
}
