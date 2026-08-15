export interface CryptoAlgorithm {
  name: string;
  type: 'key-exchange' | 'signature' | 'encryption';
  strength: number; // bits
  quantumResistant: boolean;
  performance: number; // operations per second (approximate)
  keySize: number; // bytes
  signatureSize?: number; // bytes for signatures
  status: 'active' | 'deprecated' | 'experimental';
}

export interface CryptoPolicy {
  keyExchange: CryptoAlgorithm[];
  signature: CryptoAlgorithm[];
  encryption: CryptoAlgorithm[];
  minStrength: number;
  requireQuantumResistant: boolean;
  allowHybrid: boolean;
  fallbackToClassical: boolean;
}

export interface AlgorithmSelectionOptions {
  quantumResistant?: boolean;
  hybrid?: boolean;
  minStrength?: number;
  prioritizePerformance?: boolean;
}

export interface CryptoMetrics {
  algorithm: string;
  operation: 'keygen' | 'sign' | 'verify' | 'encrypt' | 'decrypt' | 'key-exchange';
  duration: number;
  keySize?: number;
  dataSize?: number;
  timestamp: Date;
}
