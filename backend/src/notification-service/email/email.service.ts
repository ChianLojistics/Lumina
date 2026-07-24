import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Merchant } from '../../payment/entities/merchant.entity';
import { EmailTemplate } from './email-template.enum';
import { buildEmailContent } from './templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  async sendEmail(
    merchantId: string,
    template: EmailTemplate,
    data: Record<string, any> = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const merchant = await this.merchantRepository.findOne({ where: { id: merchantId } });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (!merchant.email) {
      throw new BadRequestException('Merchant has no email address on file');
    }

    const { subject, html } = buildEmailContent(template, data);

    try {
      return await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'notifications@lumina.dev',
        to: merchant.email,
        subject,
        html,
      });
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${merchant.email}: ${error.message}`);
      throw error;
    }
  }
}
