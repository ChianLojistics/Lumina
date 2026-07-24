import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiKeyService } from './api-key.service';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';
import { AuthenticationException } from '../../common/exceptions';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let apiKeyRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    apiKeyRepository = {
      create: jest.fn((data) => ({ id: 'key-1', usage_count: 0, revoked: false, ...data })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeyService, { provide: getRepositoryToken(ApiKey), useValue: apiKeyRepository }],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
  });

  describe('generate', () => {
    it('creates a key with a prefix and returns the raw value once', async () => {
      const result = await service.generate('merchant-1', [ApiKeyPermission.READ], 'CI key');

      expect(result.apiKey).toContain(result.prefix);
      expect(apiKeyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant_id: 'merchant-1',
          permissions: [ApiKeyPermission.READ],
          key_prefix: result.prefix,
        }),
      );
    });
  });

  describe('validate', () => {
    it('throws when no key matches the presented prefix', async () => {
      apiKeyRepository.findOne.mockResolvedValue(null);

      await expect(service.validate('lmn_deadbeef.somesecret')).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('throws when the key has been revoked', async () => {
      apiKeyRepository.findOne.mockResolvedValue({ revoked: true, key_hash: 'irrelevant' });

      await expect(service.validate('lmn_deadbeef.somesecret')).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('throws when the key has expired', async () => {
      const generated = await service.generate('merchant-1', [ApiKeyPermission.READ]);
      const stored = apiKeyRepository.save.mock.calls[0][0];
      apiKeyRepository.findOne.mockResolvedValue({
        ...stored,
        expires_at: new Date(Date.now() - 1000),
      });

      await expect(service.validate(generated.apiKey)).rejects.toThrow(AuthenticationException);
    });

    it('accepts a valid key and increments its usage count', async () => {
      const generated = await service.generate('merchant-1', [ApiKeyPermission.READ]);
      const stored = apiKeyRepository.save.mock.calls[0][0];
      apiKeyRepository.findOne.mockResolvedValue({ ...stored });

      const result = await service.validate(generated.apiKey);

      expect(result.usage_count).toBe(1);
      expect(apiKeyRepository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ usage_count: 1 }),
      );
    });
  });

  describe('revoke', () => {
    it('scopes the revocation to the owning merchant', async () => {
      await service.revoke('key-1', 'merchant-1');

      expect(apiKeyRepository.update).toHaveBeenCalledWith(
        { id: 'key-1', merchant_id: 'merchant-1' },
        { revoked: true },
      );
    });
  });
});
