import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Sends transactional auth emails (verification, password reset) directly
 * to a recipient address. Kept separate from
 * `notification-service/email/email.service.ts`, which resolves recipients
 * through the `Merchant` entity — auth users aren't merchants.
 */
@Injectable()
export class AuthMailerService {
  private readonly logger = new Logger(AuthMailerService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const link = `${FRONTEND_URL}/verify-email?token=${token}`;
    await this.send(
      email,
      'Verify your Lumina account',
      `<p>Welcome to Lumina! Please verify your email address by clicking the link below:</p>
       <p><a href="${link}">${link}</a></p>
       <p>This link expires in 24 hours.</p>`,
    );
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${FRONTEND_URL}/reset-password?token=${token}`;
    await this.send(
      email,
      'Reset your Lumina password',
      `<p>We received a request to reset your password. Click the link below to choose a new one:</p>
       <p><a href="${link}">${link}</a></p>
       <p>If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>`,
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'notifications@lumina.dev',
        to,
        subject,
        html,
      });
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
