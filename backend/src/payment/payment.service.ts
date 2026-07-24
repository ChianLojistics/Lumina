import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentCurrency, PaymentStatus } from './entities/payment.entity';
import { Merchant } from './entities/merchant.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConversionEngineService } from '../conversion-engine/conversion-engine.service';
import { ConversionAsset } from '../conversion-engine/asset.enum';
import { PaymentException } from '../common/exceptions';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    private conversionEngineService: ConversionEngineService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const merchant = await this.merchantRepository.findOne({
      where: { stellar_address: createPaymentDto.merchant_address },
    });

    if (!merchant) {
      throw PaymentException.merchantNotFound(createPaymentDto.merchant_address);
    }

    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      status: PaymentStatus.PENDING,
      payment_id: this.generatePaymentId(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    const savedPayment = await this.paymentRepository.save(payment);

    if (savedPayment.currency !== PaymentCurrency.USDC) {
      this.conversionEngineService
        .executeConversion(
          savedPayment.payment_id,
          savedPayment.currency as unknown as ConversionAsset,
          ConversionAsset.USDC,
        )
        .catch((error) =>
          this.logger.error(
            `Conversion failed for payment ${savedPayment.payment_id}: ${error.message}`,
          ),
        );
    }

    return savedPayment;
  }

  async findAll(merchantAddress?: string): Promise<Payment[]> {
    if (merchantAddress) {
      return this.paymentRepository.find({
        where: { merchant_address: merchantAddress },
        order: { created_at: 'DESC' },
      });
    }
    return this.paymentRepository.find({ order: { created_at: 'DESC' } });
  }

  async findOne(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { payment_id: paymentId },
    });

    if (!payment) {
      throw PaymentException.notFound(paymentId);
    }

    return payment;
  }

  async updateStatus(paymentId: string, status: PaymentStatus, transactionHash?: string): Promise<Payment> {
    const payment = await this.findOne(paymentId);
    
    payment.status = status;
    if (transactionHash) {
      payment.transaction_hash = transactionHash;
    }

    return this.paymentRepository.save(payment);
  }

  private generatePaymentId(): string {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
