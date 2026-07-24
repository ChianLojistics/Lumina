import * as speakeasy from 'speakeasy';
import { TwoFactorService } from './two-factor.service';

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  beforeEach(() => {
    service = new TwoFactorService();
  });

  describe('generateSecret', () => {
    it('returns a base32 secret and an otpauth url scoped to the user email', () => {
      const result = service.generateSecret('merchant@lumina.dev');

      expect(result.secret).toBeTruthy();
      expect(result.otpauth_url).toContain('merchant%40lumina.dev');
    });
  });

  describe('verifyToken', () => {
    it('accepts a valid TOTP code generated from the same secret', () => {
      const { secret } = service.generateSecret('merchant@lumina.dev');
      const token = speakeasy.totp({ secret, encoding: 'base32' });

      expect(service.verifyToken(secret, token)).toBe(true);
    });

    it('rejects an incorrect code', () => {
      const { secret } = service.generateSecret('merchant@lumina.dev');

      expect(service.verifyToken(secret, '000000')).toBe(false);
    });
  });
});
