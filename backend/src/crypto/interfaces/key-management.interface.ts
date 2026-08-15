export interface PQKeyMetadata {
  id: string;
  algorithm: string;
  strength: number;
  keyType: 'key-exchange' | 'signature' | 'encryption';
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'deprecated' | 'revoked';
  userId?: string;
  keyId?: string;
  hsmId?: string;
  version: number;
  parentId?: string; // For key rotation tracking
}

export interface StoredKeyPair {
  id: string;
  publicKey: Uint8Array;
  metadata: PQKeyMetadata;
  // Private key is stored separately (HSM or encrypted storage)
}

export interface KeyRotationResult {
  oldKeyId: string;
  newKeyId: string;
  rotatedAt: Date;
}

export interface KeyGenerationOptions {
  algorithm: string;
  strength?: number;
  expiresAt?: Date;
  userId?: string;
  keyType: 'key-exchange' | 'signature' | 'encryption';
}
