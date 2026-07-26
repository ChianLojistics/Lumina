const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|apikey|api_key|authorization|jwt|privatekey|private_key|cardnumber|card_number|cvv|ssn/i;

/**
 * Recursively masks values for keys that look sensitive (passwords, tokens,
 * secrets, etc.) so they never reach log transports/Sentry, regardless of
 * which service produced the log entry.
 */
export function redact<T>(value: T, seen = new WeakSet<object>()): T {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen)) as unknown as T;
  }

  if (value && typeof value === 'object') {
    if (seen.has(value as object)) {
      return value;
    }
    seen.add(value as object);

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(val, seen);
    }
    return result as T;
  }

  return value;
}
