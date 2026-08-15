export interface EncryptedData {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  algorithm: string;
  keyDerivationInfo?: {
    algorithm: string;
    salt?: Uint8Array;
  };
}

export interface EncryptionResult {
  encryptedData: EncryptedData;
  keyId?: string;
}

export interface DecryptionResult {
  plaintext: Uint8Array;
  algorithm: string;
}

export enum EncryptionAlgorithm {
  AES_256_GCM = 'AES-256-GCM',
  AES_256_CBC = 'AES-256-CBC',
  CHACHA20_POLY1305 = 'ChaCha20-Poly1305',
}

export enum KeyDerivationAlgorithm {
  HKDF_SHA256 = 'HKDF-SHA256',
  HKDF_SHA512 = 'HKDF-SHA512',
  PBKDF2 = 'PBKDF2',
}
