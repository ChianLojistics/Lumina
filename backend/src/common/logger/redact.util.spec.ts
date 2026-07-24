import { redact } from './redact.util';

describe('redact', () => {
  it('masks sensitive top-level keys', () => {
    const result = redact({ password: 'hunter2', username: 'alice' });

    expect(result).toEqual({ password: '[REDACTED]', username: 'alice' });
  });

  it('masks sensitive keys nested inside objects and arrays', () => {
    const result = redact({
      user: { apiKey: 'sk-123', profile: { authorization: 'Bearer xyz' } },
      items: [{ token: 'abc' }, { name: 'ok' }],
    });

    expect(result).toEqual({
      user: { apiKey: '[REDACTED]', profile: { authorization: '[REDACTED]' } },
      items: [{ token: '[REDACTED]' }, { name: 'ok' }],
    });
  });

  it('leaves non-sensitive values untouched', () => {
    const input = { amount: 10, currency: 'USDC' };

    expect(redact(input)).toEqual(input);
  });

  it('does not choke on circular references', () => {
    const input: Record<string, unknown> = { name: 'alice' };
    input.self = input;

    expect(() => redact(input)).not.toThrow();
  });
});
