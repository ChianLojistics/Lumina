import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZKPProof, ProofType } from '../entities/zkp-proof.entity';
import { Nullifier } from '../entities/nullifier.entity';
import { ZKProof, PaymentDetails, SettlementDetails, IdentityDetails } from '../interfaces/zkp-proof.interface';

@Injectable()
export class ZKPProofService {
  private readonly logger = new Logger(ZKPProofService.name);
  
  constructor(
    @InjectRepository(ZKPProof)
    private readonly zkpProofRepository: Repository<ZKPProof>,
    @InjectRepository(Nullifier)
    private readonly nullifierRepository: Repository<Nullifier>,
  ) {}

  async generatePaymentProof(payment: PaymentDetails): Promise<ZKProof> {
    const startTime = Date.now();
    
    this.logger.log(`Generating payment proof for transaction: ${payment.paymentHash}`);
    
    try {
      // Generate witness from payment details
      const witness = await this.generatePaymentWitness(payment);
      
      // Generate proof using snarkjs (placeholder - will use actual snarkjs when dependencies are installed)
      const proof = await this.generateGroth16Proof(witness, 'payment_verification');
      
      // Calculate nullifier
      const nullifierHash = await this.calculateNullifier(
        payment.senderPrivateKey,
        payment.amount,
        payment.timestamp
      );
      
      // Check if nullifier already exists (prevent double-spending)
      const existingNullifier = await this.nullifierRepository.findOne({
        where: { nullifierHash }
      });
      
      if (existingNullifier) {
        throw new Error('Nullifier already exists - potential double-spending attempt');
      }
      
      // Save proof to database
      const proofEntity = this.zkpProofRepository.create({
        transactionId: payment.paymentHash,
        proofType: ProofType.PAYMENT,
        proofData: Buffer.from(JSON.stringify(proof.proof)),
        publicInputs: proof.publicSignals,
        verificationKey: 'payment_verification_key',
        nullifierHash,
        proofSize: JSON.stringify(proof).length,
        generationTimeMs: Date.now() - startTime,
        cached: false,
      });
      
      await this.zkpProofRepository.save(proofEntity);
      
      // Save nullifier
      const nullifierEntity = this.nullifierRepository.create({
        nullifierHash,
        transactionId: payment.paymentHash,
        proofType: ProofType.PAYMENT,
        usedAt: new Date(),
        spent: false,
      });
      
      await this.nullifierRepository.save(nullifierEntity);
      
      this.logger.log(`Payment proof generated successfully in ${Date.now() - startTime}ms`);
      
      return proof;
    } catch (error) {
      this.logger.error(`Failed to generate payment proof: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async generateSettlementProof(settlement: SettlementDetails): Promise<ZKProof> {
    const startTime = Date.now();
    
    this.logger.log(`Generating settlement proof for payment: ${settlement.paymentHash}`);
    
    try {
      const witness = await this.generateSettlementWitness(settlement);
      const proof = await this.generateGroth16Proof(witness, 'settlement_verification');
      
      const nullifierHash = await this.calculateSettlementNullifier(
        settlement.merchantPrivateKey,
        settlement.paymentHash,
        settlement.settlementTimestamp
      );
      
      const proofEntity = this.zkpProofRepository.create({
        transactionId: settlement.paymentHash,
        proofType: ProofType.SETTLEMENT,
        proofData: Buffer.from(JSON.stringify(proof.proof)),
        publicInputs: proof.publicSignals,
        verificationKey: 'settlement_verification_key',
        nullifierHash,
        proofSize: JSON.stringify(proof).length,
        generationTimeMs: Date.now() - startTime,
        cached: false,
      });
      
      await this.zkpProofRepository.save(proofEntity);
      
      const nullifierEntity = this.nullifierRepository.create({
        nullifierHash,
        transactionId: settlement.paymentHash,
        proofType: ProofType.SETTLEMENT,
        usedAt: new Date(),
        spent: false,
      });
      
      await this.nullifierRepository.save(nullifierEntity);
      
      this.logger.log(`Settlement proof generated successfully in ${Date.now() - startTime}ms`);
      
      return proof;
    } catch (error) {
      this.logger.error(`Failed to generate settlement proof: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async generateIdentityProof(identity: IdentityDetails): Promise<ZKProof> {
    const startTime = Date.now();
    
    this.logger.log(`Generating identity proof`);
    
    try {
      const witness = await this.generateIdentityWitness(identity);
      const proof = await this.generateGroth16Proof(witness, 'identity_verification');
      
      const nullifierHash = await this.calculateIdentityNullifier(
        identity.identityPrivateKey,
        identity.identityCommitment
      );
      
      const proofEntity = this.zkpProofRepository.create({
        transactionId: identity.identityCommitment,
        proofType: ProofType.IDENTITY,
        proofData: Buffer.from(JSON.stringify(proof.proof)),
        publicInputs: proof.publicSignals,
        verificationKey: 'identity_verification_key',
        nullifierHash,
        proofSize: JSON.stringify(proof).length,
        generationTimeMs: Date.now() - startTime,
        cached: false,
      });
      
      await this.zkpProofRepository.save(proofEntity);
      
      this.logger.log(`Identity proof generated successfully in ${Date.now() - startTime}ms`);
      
      return proof;
    } catch (error) {
      this.logger.error(`Failed to generate identity proof: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getProofById(id: string): Promise<ZKPProof> {
    return this.zkpProofRepository.findOne({ where: { id } });
  }

  async getProofsByTransaction(transactionId: string): Promise<ZKPProof[]> {
    return this.zkpProofRepository.find({ 
      where: { transactionId },
      order: { createdAt: 'DESC' }
    });
  }

  async isNullifierUsed(nullifierHash: string): Promise<boolean> {
    const nullifier = await this.nullifierRepository.findOne({
      where: { nullifierHash }
    });
    return !!nullifier && nullifier.spent;
  }

  async markNullifierSpent(nullifierHash: string): Promise<void> {
    await this.nullifierRepository.update(
      { nullifierHash },
      { spent: true }
    );
  }

  // Private helper methods

  private async generatePaymentWitness(payment: PaymentDetails): Promise<any> {
    // This will generate the witness for the payment circuit
    // Placeholder implementation - will use actual circom witness generation
    return {
      sender_private_key: payment.senderPrivateKey,
      recipient_private_key: payment.recipientPrivateKey,
      amount: payment.amount,
      timestamp: payment.timestamp,
      nonce: payment.nonce,
      payment_hash: payment.paymentHash,
      merkle_root: payment.merkleRoot,
      expected_amount: payment.amount,
      min_timestamp: Math.floor(Date.now() / 1000) - 86400, // 24 hours ago
      max_timestamp: Math.floor(Date.now() / 1000) + 3600, // 1 hour in future
    };
  }

  private async generateSettlementWitness(settlement: SettlementDetails): Promise<any> {
    return {
      merchant_private_key: settlement.merchantPrivateKey,
      payment_hash: settlement.paymentHash,
      settlement_amount: settlement.settlementAmount,
      settlement_timestamp: settlement.settlementTimestamp,
      merchant_public_key: settlement.merchantPublicKey,
      expected_settlement_amount: settlement.expectedSettlementAmount,
      merkle_root: settlement.merkleRoot,
    };
  }

  private async generateIdentityWitness(identity: IdentityDetails): Promise<any> {
    return {
      identity_private_key: identity.identityPrivateKey,
      identity_commitment: identity.identityCommitment,
      age: identity.age,
      country_code: identity.countryCode,
      min_age: identity.minAge,
      allowed_countries: identity.allowedCountries,
    };
  }

  private async generateGroth16Proof(witness: any, circuitName: string): Promise<ZKProof> {
    // Placeholder for actual snarkjs proof generation
    // When dependencies are installed, this will use:
    // const snarkjs = require('snarkjs');
    // const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    //   witness,
    //   `./circuits/${circuitName}.wasm`,
    //   `./circuits/${circuitName}_0001.zkey`
    // );
    
    // Mock implementation for now
    return {
      proof: {
        pi_a: ['0', '0'],
        pi_b: [['0', '0'], ['0', '0']],
        pi_c: ['0', '0'],
        protocol: 'groth16',
      },
      publicSignals: [
        witness.payment_hash || witness.identity_commitment,
        witness.merkle_root || '0',
      ],
      proofType: 'groth16',
    };
  }

  private async calculateNullifier(
    senderPrivateKey: string,
    amount: number,
    timestamp: number
  ): Promise<string> {
    // Placeholder for actual SHA256 calculation
    // Will use @noble/hashes when implemented
    const data = `${senderPrivateKey}${amount}${timestamp}`;
    return Buffer.from(data).toString('hex').substring(0, 64);
  }

  private async calculateSettlementNullifier(
    merchantPrivateKey: string,
    paymentHash: string,
    settlementTimestamp: number
  ): Promise<string> {
    const data = `${merchantPrivateKey}${paymentHash}${settlementTimestamp}`;
    return Buffer.from(data).toString('hex').substring(0, 64);
  }

  private async calculateIdentityNullifier(
    identityPrivateKey: string,
    identityCommitment: string
  ): Promise<string> {
    const data = `${identityPrivateKey}${identityCommitment}`;
    return Buffer.from(data).toString('hex').substring(0, 64);
  }
}
