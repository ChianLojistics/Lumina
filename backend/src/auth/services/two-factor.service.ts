import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';

const APP_NAME = process.env.TWO_FACTOR_APP_NAME || 'Lumina';

export interface TwoFactorSecret {
  secret: string;
  otpauth_url: string;
}

@Injectable()
export class TwoFactorService {
  generateSecret(email: string): TwoFactorSecret {
    const { base32, otpauth_url } = speakeasy.generateSecret({
      name: `${APP_NAME} (${email})`,
      issuer: APP_NAME,
      length: 20,
    });

    return { secret: base32, otpauth_url };
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }
}
