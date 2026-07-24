import { retryWithBackoff } from './retry.util';

describe('retryWithBackoff', () => {
  it('returns the result on the first successful attempt', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    const result = await retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 1 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries after a failure and eventually succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce('ok');

    const result = await retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 1 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error once all attempts are exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));

    await expect(retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toThrow(
      'always fails',
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('fails an attempt that exceeds the timeout', async () => {
    const fn = jest.fn().mockImplementation(() => new Promise(() => {}));

    await expect(
      retryWithBackoff(fn, { maxAttempts: 1, baseDelayMs: 1, timeoutMs: 10 }),
    ).rejects.toThrow('Operation timed out after 10ms');
  });
});
