export interface PQKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface PQSignature {
  signature: Uint8Array;
  algorithm: string;
}

export interface HybridSignature {
  classical: Uint8Array;
  postQuantum: Uint8Array;
}

export interface ClassicalKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface SignatureVerificationResult {
  valid: boolean;
  classicalValid: boolean;
  postQuantumValid: boolean;
}
