import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';
import { AuthenticationException } from '../../common/exceptions';

export interface GeneratedApiKey {
  id: string;
  apiKey: string;
  prefix: string;
  permissions: ApiKeyPermission[];
}

const KEY_PREFIX = 'lmn';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async generate(
    merchantId: string,
    permissions: ApiKeyPermission[],
    name?: string,
  ): Promise<GeneratedApiKey> {
    const secret = randomBytes(32).toString('hex');
    const prefix = `${KEY_PREFIX}_${randomBytes(4).toString('hex')}`;
    const apiKey = `${prefix}.${secret}`;

    const entity = await this.apiKeyRepository.save(
      this.apiKeyRepository.create({
        merchant_id: merchantId,
        name,
        key_prefix: prefix,
        key_hash: this.hash(apiKey),
        permissions,
      }),
    );

    return { id: entity.id, apiKey, prefix, permissions };
  }

  /** Validates a raw API key, tracks usage, and returns the owning key record. */
  async validate(rawApiKey: string): Promise<ApiKey> {
    const prefix = rawApiKey.split('.')[0];
    const candidate = await this.apiKeyRepository.findOne({ where: { key_prefix: prefix } });

    if (!candidate || candidate.revoked || candidate.key_hash !== this.hash(rawApiKey)) {
      throw AuthenticationException.apiKeyInvalid();
    }

    if (candidate.expires_at && candidate.expires_at.getTime() < Date.now()) {
      throw AuthenticationException.apiKeyInvalid();
    }

    candidate.usage_count += 1;
    candidate.last_used_at = new Date();
    await this.apiKeyRepository.save(candidate);

    return candidate;
  }

  async revoke(id: string, merchantId: string): Promise<void> {
    await this.apiKeyRepository.update({ id, merchant_id: merchantId }, { revoked: true });
  }

  async listForMerchant(merchantId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { merchant_id: merchantId },
      order: { created_at: 'DESC' },
    });
  }

  private hash(rawApiKey: string): string {
    return createHash('sha256').update(rawApiKey).digest('hex');
  }
}
