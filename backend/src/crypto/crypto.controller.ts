import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PQKeyManagementService } from './services/pq-key-management.service';
import { HybridKeyExchangeService } from './services/hybrid-key-exchange.service';
import { PQSignatureService } from './services/pq-signature.service';
import { QuantumEncryptionService } from './services/quantum-encryption.service';
import { CryptoAgilityService } from './services/crypto-agility.service';
import { GenerateKeypairDto } from './dto/generate-keypair.dto';
import { SignDto, VerifyDto } from './dto/sign.dto';
import { EncryptDto, DecryptDto } from './dto/encrypt.dto';
import { KeyExchangeDto, EncapsulateDto, DecapsulateDto } from './dto/key-exchange.dto';
import { PQCAlgorithm } from './interfaces/hybrid-key-exchange.interface';

@Controller('crypto')
@UseGuards(JwtAuthGuard)
export class CryptoController {
  constructor(
    private readonly keyManagementService: PQKeyManagementService,
    private readonly hybridKeyExchangeService: HybridKeyExchangeService,
    private readonly pqSignatureService: PQSignatureService,
    private readonly quantumEncryptionService: QuantumEncryptionService,
    private readonly cryptoAgilityService: CryptoAgilityService,
  ) {}

  @Post('keypairs/generate')
  async generateKeyPair(
    @Body() dto: GenerateKeypairDto,
    @Request() req,
  ) {
    const keyPair = await this.keyManagementService.generateKey({
      algorithm: dto.algorithm,
      keyType: dto.keyType,
      userId: req.user?.id,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    return {
      id: keyPair.id,
      publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
      algorithm: keyPair.metadata.algorithm,
      keyType: keyPair.metadata.keyType,
      strength: keyPair.metadata.strength,
      createdAt: keyPair.metadata.createdAt,
      expiresAt: keyPair.metadata.expiresAt,
      status: keyPair.metadata.status,
    };
  }

  @Get('keypairs')
  async listKeyPairs(@Request() req) {
    const keys = await this.keyManagementService.listKeys(req.user?.id);

    return keys.map((key) => ({
      id: key.id,
      publicKey: Buffer.from(key.publicKey).toString('base64'),
      algorithm: key.metadata.algorithm,
      keyType: key.metadata.keyType,
      strength: key.metadata.strength,
      createdAt: key.metadata.createdAt,
      expiresAt: key.metadata.expiresAt,
      status: key.metadata.status,
      version: key.metadata.version,
    }));
  }

  @Get('keypairs/:id')
  async getKeyPair(@Param('id') id: string) {
    const key = await this.keyManagementService.getKey(id);

    if (!key) {
      return { error: 'Key not found' };
    }

    return {
      id: key.id,
      publicKey: Buffer.from(key.publicKey).toString('base64'),
      algorithm: key.metadata.algorithm,
      keyType: key.metadata.keyType,
      strength: key.metadata.strength,
      createdAt: key.metadata.createdAt,
      expiresAt: key.metadata.expiresAt,
      status: key.metadata.status,
      version: key.metadata.version,
      parentId: key.metadata.parentId,
    };
  }

  @Post('keypairs/:id/rotate')
  async rotateKeyPair(@Param('id') id: string) {
    const result = await this.keyManagementService.rotateKey(id);

    return result;
  }

  @Post('keypairs/:id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeKeyPair(@Param('id') id: string) {
    await this.keyManagementService.revokeKey(id);

    return { message: 'Key revoked successfully' };
  }

  @Post('sign')
  async sign(@Body() dto: SignDto, @Request() req) {
    const message = new TextEncoder().encode(dto.message);
    const privateKey = await this.keyManagementService.getPrivateKey(dto.keyId);

    if (!privateKey) {
      return { error: 'Private key not found' };
    }

    if (dto.useHybrid && dto.classicalKeyId) {
      const classicalPrivateKey = await this.keyManagementService.getPrivateKey(dto.classicalKeyId);
      if (!classicalPrivateKey) {
        return { error: 'Classical private key not found' };
      }

      const classicalKey = {
        privateKey: classicalPrivateKey,
        publicKey: (await this.keyManagementService.getKey(dto.classicalKeyId))?.publicKey || new Uint8Array(0),
      };

      const pqKey = {
        privateKey,
        publicKey: (await this.keyManagementService.getKey(dto.keyId))?.publicKey || new Uint8Array(0),
      };

      const signature = await this.pqSignatureService.hybridSign(message, classicalKey, pqKey);

      return {
        classicalSignature: Buffer.from(signature.classical).toString('base64'),
        postQuantumSignature: Buffer.from(signature.postQuantum).toString('base64'),
        algorithm: 'Hybrid-Ed25519-ML-DSA-65',
      };
    } else {
      const signature = await this.pqSignatureService.sign(message, privateKey);

      return {
        signature: Buffer.from(signature.signature).toString('base64'),
        algorithm: signature.algorithm,
      };
    }
  }

  @Post('verify')
  async verify(@Body() dto: VerifyDto) {
    const message = new TextEncoder().encode(dto.message);
    const key = await this.keyManagementService.getKey(dto.keyId);

    if (!key) {
      return { error: 'Key not found' };
    }

    if (dto.useHybrid && dto.classicalKeyId) {
      const classicalKey = await this.keyManagementService.getKey(dto.classicalKeyId);
      if (!classicalKey) {
        return { error: 'Classical key not found' };
      }

      const signature = {
        classical: Buffer.from(dto.signature, 'base64'),
        postQuantum: Buffer.from(dto.signature, 'base64'),
      };

      const result = await this.pqSignatureService.hybridVerify(
        message,
        signature,
        {
          privateKey: new Uint8Array(0),
          publicKey: classicalKey.publicKey,
        },
        {
          privateKey: new Uint8Array(0),
          publicKey: key.publicKey,
        },
      );

      return result;
    } else {
      const signature = Buffer.from(dto.signature, 'base64');
      const isValid = await this.pqSignatureService.verify(message, signature, key.publicKey);

      return { valid: isValid };
    }
  }

  @Post('encrypt')
  async encrypt(@Body() dto: EncryptDto) {
    const plaintext = new TextEncoder().encode(dto.plaintext);
    let key: Uint8Array;

    if (dto.keyId) {
      const privateKey = await this.keyManagementService.getPrivateKey(dto.keyId);
      if (!privateKey) {
        return { error: 'Key not found' };
      }
      key = privateKey;
    } else {
      key = this.quantumEncryptionService.generateRandomKey();
    }

    const result = await this.quantumEncryptionService.encrypt(
      plaintext,
      key,
      dto.algorithm,
    );

    return {
      ciphertext: Buffer.from(result.encryptedData.ciphertext).toString('base64'),
      nonce: Buffer.from(result.encryptedData.nonce).toString('base64'),
      algorithm: result.encryptedData.algorithm,
      keyId: dto.keyId,
    };
  }

  @Post('decrypt')
  async decrypt(@Body() dto: DecryptDto) {
    const encryptedData = {
      ciphertext: Buffer.from(dto.ciphertext, 'base64'),
      nonce: Buffer.from(dto.nonce, 'base64'),
      algorithm: dto.algorithm,
    };

    let key: Uint8Array;

    if (dto.keyId) {
      const privateKey = await this.keyManagementService.getPrivateKey(dto.keyId);
      if (!privateKey) {
        return { error: 'Key not found' };
      }
      key = privateKey;
    } else {
      return { error: 'Key ID required for decryption' };
    }

    const result = await this.quantumEncryptionService.decrypt(encryptedData, key);

    return {
      plaintext: new TextDecoder().decode(result.plaintext),
      algorithm: result.algorithm,
    };
  }

  @Post('keyexchange')
  async keyExchange(@Body() dto: KeyExchangeDto) {
    const peerKey = await this.keyManagementService.getKey(dto.peerPublicKeyId);

    if (!peerKey) {
      return { error: 'Peer public key not found' };
    }

    const myKeyPair = await this.hybridKeyExchangeService.generateKeyPair();
    const sharedSecret = await this.hybridKeyExchangeService.deriveSharedSecret(
      {
        classical: myKeyPair.classical.privateKey,
        postQuantum: myKeyPair.postQuantum.privateKey,
      },
      {
        classical: peerKey.publicKey,
        postQuantum: peerKey.publicKey,
      },
    );

    return {
      myPublicKey: {
        classical: Buffer.from(myKeyPair.classical.publicKey).toString('base64'),
        postQuantum: Buffer.from(myKeyPair.postQuantum.publicKey).toString('base64'),
      },
      sharedSecret: Buffer.from(sharedSecret.combined).toString('base64'),
      algorithm: 'Hybrid-X25519-ML-KEM-1024',
    };
  }

  @Post('encapsulate')
  async encapsulate(@Body() dto: EncapsulateDto) {
    const peerKey = await this.keyManagementService.getKey(dto.peerPublicKeyId);

    if (!peerKey) {
      return { error: 'Peer public key not found' };
    }

    const result = await this.hybridKeyExchangeService.encapsulate({
      classical: peerKey.publicKey,
      postQuantum: peerKey.publicKey,
    });

    return {
      ciphertext: Buffer.from(result.ciphertext).toString('base64'),
      sharedSecret: Buffer.from(result.sharedSecret).toString('base64'),
      algorithm: 'ML-KEM-1024',
    };
  }

  @Post('decapsulate')
  async decapsulate(@Body() dto: DecapsulateDto) {
    const privateKey = await this.keyManagementService.getPrivateKey(dto.privateKeyId);

    if (!privateKey) {
      return { error: 'Private key not found' };
    }

    const result = await this.hybridKeyExchangeService.decapsulate(
      {
        classical: privateKey,
        postQuantum: privateKey,
      },
      Buffer.from(dto.ciphertext, 'base64'),
    );

    return {
      sharedSecret: Buffer.from(result.combined).toString('base64'),
      algorithm: 'ML-KEM-1024',
    };
  }

  @Get('algorithms')
  async getAlgorithms() {
    return {
      keyExchange: this.hybridKeyExchangeService.getSupportedAlgorithms(),
      encryption: this.quantumEncryptionService.getSupportedAlgorithms(),
      keyDerivation: this.quantumEncryptionService.getSupportedKeyDerivationAlgorithms(),
    };
  }

  @Get('policy')
  async getPolicy() {
    return this.cryptoAgilityService.getPolicy();
  }

  @Post('policy')
  async updatePolicy(@Body() policy: any) {
    this.cryptoAgilityService.updatePolicy(policy);
    return { message: 'Policy updated successfully' };
  }

  @Get('statistics')
  async getStatistics() {
    return await this.keyManagementService.getKeyStatistics();
  }

  @Get('metrics')
  async getMetrics(@Request() req) {
    const algorithm = req.query.algorithm as string;
    const operation = req.query.operation as string;

    return this.cryptoAgilityService.getMetrics(algorithm, operation);
  }

  @Get('recommendations')
  async getRecommendations(@Request() req) {
    const type = req.query.type as 'key-exchange' | 'signature' | 'encryption';

    if (!type || !['key-exchange', 'signature', 'encryption'].includes(type)) {
      return { error: 'Invalid type parameter' };
    }

    return this.cryptoAgilityService.getAlgorithmRecommendations(type);
  }
}
