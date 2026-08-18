import { WebhookSignatureService } from './webhook-signature.service';

describe('WebhookSignatureService', () => {
  let service: WebhookSignatureService;
  const secret = 'test-secret-key-123';

  beforeEach(() => {
    service = new WebhookSignatureService();
  });

  it('generates a valid signature and verifies it successfully', () => {
    const payload = { event: 'payment.confirmed', amount: 500 };
    const { signature, timestamp } = service.generateSignature(payload, secret);

    expect(signature).toBeDefined();
    expect(signature).toHaveLength(64);

    const isValid = service.verifySignature(payload, signature, secret, timestamp);
    expect(isValid).toBe(true);
  });

  it('fails verification if payload is tampered', () => {
    const payload = { event: 'payment.confirmed', amount: 500 };
    const { signature, timestamp } = service.generateSignature(payload, secret);

    const tamperedPayload = { event: 'payment.confirmed', amount: 9999 };
    const isValid = service.verifySignature(tamperedPayload, signature, secret, timestamp);
    expect(isValid).toBe(false);
  });

  it('fails verification if timestamp is older than 5 minutes', () => {
    const payload = { event: 'payment.confirmed', amount: 500 };
    const oldTimestamp = Math.floor(Date.now() / 1000) - 301;
    const { signature } = service.generateSignature(payload, secret, oldTimestamp);

    const isValid = service.verifySignature(payload, signature, secret, oldTimestamp);
    expect(isValid).toBe(false);
  });

  it('fails verification if secret is incorrect', () => {
    const payload = { event: 'payment.confirmed', amount: 500 };
    const { signature, timestamp } = service.generateSignature(payload, secret);

    const isValid = service.verifySignature(payload, signature, 'wrong-secret', timestamp);
    expect(isValid).toBe(false);
  });
});
