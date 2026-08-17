export interface ZKProof {
  proof: any;
  publicSignals: any[];
  proofType: string;
}

export interface PaymentDetails {
  senderPrivateKey: string;
  recipientPrivateKey: string;
  amount: number;
  timestamp: number;
  nonce: string;
  paymentHash: string;
  merkleRoot: string;
}

export interface SettlementDetails {
  merchantPrivateKey: string;
  paymentHash: string;
  settlementAmount: number;
  settlementTimestamp: number;
  merchantPublicKey: string;
  expectedSettlementAmount: number;
  merkleRoot: string;
}

export interface IdentityDetails {
  identityPrivateKey: string;
  identityCommitment: string;
  age: number;
  countryCode: string;
  minAge: number;
  allowedCountries: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AuditProofRequest {
  merchantId: string;
  dateRange: DateRange;
  revealFields: string[];
}

export interface AuditProof {
  proofType: 'payment' | 'settlement' | 'identity';
  proof: ZKProof;
  publicInputs: any[];
  revealedFields: string[];
  aggregateData: {
    totalTransactions: number;
    totalAmount: number;
    currency: string;
  };
  merkleRoot: string;
}
