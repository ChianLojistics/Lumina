import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheKeyStrategy {
  private readonly prefix = process.env.CACHE_KEY_PREFIX || 'lumina';
  private readonly version = process.env.CACHE_KEY_VERSION || 'v1';
  private readonly separator = ':';

  generateKey(...parts: string[]): string {
    const validParts = parts.filter(part => part !== null && part !== undefined && part !== '');
    return [this.prefix, this.version, ...validParts].join(this.separator);
  }

  generateMerchantKey(merchantId: string, resource: string, identifier?: string): string {
    const parts = ['merchant', merchantId, resource];
    if (identifier) {
      parts.push(identifier);
    }
    return this.generateKey(...parts);
  }

  generatePaymentKey(paymentId: string): string {
    return this.generateKey('payment', paymentId);
  }

  generateUserKey(userId: string, resource: string, identifier?: string): string {
    const parts = ['user', userId, resource];
    if (identifier) {
      parts.push(identifier);
    }
    return this.generateKey(...parts);
  }

  generateConfigKey(service: string, configKey: string): string {
    return this.generateKey('config', service, configKey);
  }

  generateRateLimitKey(identifier: string, route: string): string {
    return this.generateKey('ratelimit', identifier, route);
  }

  generateSessionKey(sessionId: string): string {
    return this.generateKey('session', sessionId);
  }

  generatePriceKey(asset: string): string {
    return this.generateKey('price', asset);
  }

  generateExchangeRateKey(from: string, to: string): string {
    return this.generateKey('exchange', from, to);
  }

  generateBlockchainKey(network: string, resource: string, identifier: string): string {
    return this.generateKey('blockchain', network, resource, identifier);
  }

  parseKey(key: string): {
    prefix: string;
    version: string;
    parts: string[];
  } {
    const parts = key.split(this.separator);
    return {
      prefix: parts[0],
      version: parts[1],
      parts: parts.slice(2),
    };
  }

  isValidKey(key: string): boolean {
    return key.startsWith(`${this.prefix}${this.separator}${this.version}${this.separator}`);
  }

  generatePattern(pattern: string): string {
    return this.generateKey(pattern);
  }

  hashKey(key: string): string {
    // Simple hash function for key normalization
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  getTagFromKey(key: string): string[] {
    const parsed = this.parseKey(key);
    const tags: string[] = [];

    if (parsed.parts[0] === 'merchant') {
      tags.push(`merchant:${parsed.parts[1]}`);
    } else if (parsed.parts[0] === 'user') {
      tags.push(`user:${parsed.parts[1]}`);
    } else if (parsed.parts[0] === 'payment') {
      tags.push('payment');
    }

    return tags;
  }

  normalizeKey(key: string): string {
    // Remove any extra separators and normalize
    return key.replace(/:+/g, this.separator).replace(/^:|:$/g, '');
  }
}
