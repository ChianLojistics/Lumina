export interface ClassicalKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface PostQuantumKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface HybridKeyPair {
  classical: ClassicalKeyPair;
  postQuantum: PostQuantumKeyPair;
}

export interface HybridPrivateKey {
  classical: Uint8Array;
  postQuantum: Uint8Array;
}

export interface HybridPublicKey {
  classical: Uint8Array;
  postQuantum: Uint8Array;
}

export interface HybridSharedSecret {
  classical: Uint8Array;
  postQuantum: Uint8Array;
  combined: Uint8Array;
}

export interface KeyEncapsulationResult {
  ciphertext: Uint8Array;
  sharedSecret: Uint8Array;
}

export enum PQCAlgorithm {
  ML_KEM_512 = 'ML-KEM-512',
  ML_KEM_768 = 'ML-KEM-768',
  ML_KEM_1024 = 'ML-KEM-1024',
  ML_DSA_44 = 'ML-DSA-44',
  ML_DSA_65 = 'ML-DSA-65',
  ML_DSA_87 = 'ML-DSA-87',
  X25519 = 'X25519',
  ED25519 = 'ED25519',
}
