import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Merchant } from './entities/merchant.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const merchant = await this.merchantRepository.findOne({
      where: { stellar_address: createPaymentDto.merchant_address },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      status: PaymentStatus.PENDING,
      payment_id: this.generatePaymentId(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    return this.paymentRepository.save(payment);
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
      throw new NotFoundException('Payment not found');
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
