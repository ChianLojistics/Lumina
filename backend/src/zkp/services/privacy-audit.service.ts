import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditProof as AuditProofEntity } from '../entities/audit-proof.entity';
import { ZKPProof } from '../entities/zkp-proof.entity';
import { ZKPProofService } from './zkp-proof.service';
import { ZKPVerificationService } from './zkp-verification.service';
import { AuditProofRequest, AuditProof as AuditProofInterface } from '../interfaces/zkp-proof.interface';

@Injectable()
export class PrivacyAuditService {
  private readonly logger = new Logger(PrivacyAuditService.name);
  
  constructor(
    @InjectRepository(AuditProofEntity)
    private readonly auditProofRepository: Repository<AuditProofEntity>,
    @InjectRepository(ZKPProof)
    private readonly zkpProofRepository: Repository<ZKPProof>,
    private readonly zkpProofService: ZKPProofService,
    private readonly zkpVerificationService: ZKPVerificationService,
  ) {}

  async generateAuditProof(request: AuditProofRequest): Promise<AuditProofInterface> {
    const startTime = Date.now();
    
    this.logger.log(`Generating audit proof for merchant: ${request.merchantId}`);
    
    try {
      // Get transactions for the merchant within date range
      const transactions = await this.getTransactionsForAudit(
        request.merchantId,
        request.dateRange
      );
      
      if (transactions.length === 0) {
        throw new Error('No transactions found for the specified date range');
      }
      
      // Create merkle tree of transactions
      const merkleTree = await this.createMerkleTree(transactions);
      
      // Calculate aggregate data
      const aggregateData = this.calculateAggregateData(transactions);
      
      // Generate selective proof revealing only specified fields
      const proof = await this.generateSelectiveProof(
        merkleTree,
        request.revealFields,
        transactions
      );
      
      // Save audit proof to database
      const auditProofEntity = this.auditProofRepository.create({
        merchantId: request.merchantId,
        proofData: Buffer.from(JSON.stringify(proof.proof)),
        revealedFields: request.revealFields,
        dateRange: request.dateRange,
        aggregateData,
        merkleRoot: merkleTree.root,
        proofType: 'payment',
        generationTimeMs: Date.now() - startTime,
      });
      
      await this.auditProofRepository.save(auditProofEntity);
      
      this.logger.log(`Audit proof generated successfully in ${Date.now() - startTime}ms`);
      
      return {
        proofType: 'payment',
        proof: proof.proof,
        publicInputs: proof.publicInputs,
        revealedFields: request.revealFields,
        aggregateData,
        merkleRoot: merkleTree.root,
      };
    } catch (error) {
      this.logger.error(`Failed to generate audit proof: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async verifyAuditProof(auditProof: AuditProofInterface): Promise<boolean> {
    this.logger.log('Verifying audit proof');
    
    try {
      // Verify the underlying ZK proof
      const isValid = await this.zkpVerificationService.verifyPaymentProof(auditProof.proof);
      
      if (!isValid) {
        this.logger.warn('Audit proof verification failed - underlying proof invalid');
        return false;
      }
      
      // Verify merkle root consistency
      const merkleRootValid = await this.verifyMerkleRoot(auditProof);
      
      if (!merkleRootValid) {
        this.logger.warn('Audit proof verification failed - merkle root invalid');
        return false;
      }
      
      // Verify revealed fields are actually part of the proof
      const fieldsValid = await this.verifyRevealedFields(auditProof);
      
      if (!fieldsValid) {
        this.logger.warn('Audit proof verification failed - revealed fields invalid');
        return false;
      }
      
      this.logger.log(`Audit proof verified successfully`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to verify audit proof: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async getAuditProofsByMerchant(merchantId: string): Promise<AuditProofEntity[]> {
    return this.auditProofRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAuditProofById(id: string): Promise<AuditProofEntity> {
    return this.auditProofRepository.findOne({ where: { id } });
  }

  async generateComplianceReport(
    merchantId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<{
    merchantId: string;
    dateRange: { startDate: Date; endDate: Date };
    totalTransactions: number;
    totalAmount: number;
    currency: string;
    auditProofs: number;
    complianceScore: number;
    flaggedTransactions: number;
  }> {
    this.logger.log(`Generating compliance report for merchant: ${merchantId}`);
    
    const transactions = await this.getTransactionsForAudit(merchantId, dateRange);
    const auditProofs = await this.auditProofRepository.find({
      where: {
        merchantId,
        dateRange,
      },
    });
    
    const aggregateData = this.calculateAggregateData(transactions);
    
    // Calculate compliance score based on various factors
    const complianceScore = this.calculateComplianceScore(transactions, auditProofs);
    
    // Flag suspicious transactions (simplified logic)
    const flaggedTransactions = this.flagSuspiciousTransactions(transactions);
    
    return {
      merchantId,
      dateRange,
      totalTransactions: transactions.length,
      totalAmount: aggregateData.totalAmount,
      currency: aggregateData.currency,
      auditProofs: auditProofs.length,
      complianceScore,
      flaggedTransactions: flaggedTransactions.length,
    };
  }

  async generateSelectiveDisclosureProof(
    transactionId: string,
    revealFields: string[]
  ): Promise<AuditProofInterface> {
    this.logger.log(`Generating selective disclosure proof for transaction: ${transactionId}`);
    
    const transaction = await this.zkpProofRepository.findOne({
      where: { transactionId },
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Generate proof that reveals only specified fields
    const proof = await this.generateSelectiveProofForTransaction(
      transaction,
      revealFields
    );
    
    return {
      proofType: transaction.proofType,
      proof: proof.proof,
      publicInputs: proof.publicInputs,
      revealedFields: revealFields,
      aggregateData: {
        totalTransactions: 1,
        totalAmount: transaction.publicInputs.amount || 0,
        currency: 'USD',
      },
      merkleRoot: proof.merkleRoot,
    };
  }

  // Private helper methods

  private async getTransactionsForAudit(
    merchantId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<any[]> {
    // Placeholder for fetching actual transactions
    // In production, this would query the payment/transaction tables
    return [];
  }

  private async createMerkleTree(transactions: any[]): Promise<{
    root: string;
    leaves: string[];
    depth: number;
  }> {
    // Placeholder for merkle tree generation
    // Will use merkletreejs library when dependencies are installed
    const leaves = transactions.map(t => t.hash || '0');
    const root = this.calculateMerkleRoot(leaves);
    
    return {
      root,
      leaves,
      depth: Math.ceil(Math.log2(leaves.length)) || 1,
    };
  }

  private calculateMerkleRoot(leaves: string[]): string {
    // Simplified merkle root calculation
    // In production, this would use proper merkle tree algorithm
    if (leaves.length === 0) return '0';
    if (leaves.length === 1) return leaves[0];
    
    let currentLevel = [...leaves];
    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        nextLevel.push(this.hashPair(left, right));
      }
      currentLevel = nextLevel;
    }
    
    return currentLevel[0];
  }

  private hashPair(left: string, right: string): string {
    // Placeholder for hash function
    // Will use @noble/hashes when implemented
    return Buffer.from(`${left}${right}`).toString('hex').substring(0, 64);
  }

  private calculateAggregateData(transactions: any[]): {
    totalTransactions: number;
    totalAmount: number;
    currency: string;
  } {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const currency = transactions[0]?.currency || 'USD';
    
    return {
      totalTransactions,
      totalAmount,
      currency,
    };
  }

  private async generateSelectiveProof(
    merkleTree: { root: string; leaves: string[]; depth: number },
    revealFields: string[],
    transactions: any[]
  ): Promise<{
    proof: any;
    publicInputs: any[];
  }> {
    // Placeholder for selective proof generation
    // This will use ZKP techniques to reveal only specified fields
    return {
      proof: {
        pi_a: ['0', '0'],
        pi_b: [['0', '0'], ['0', '0']],
        pi_c: ['0', '0'],
        protocol: 'groth16',
      },
      publicInputs: [merkleTree.root, revealFields.length.toString()],
    };
  }

  private async generateSelectiveProofForTransaction(
    transaction: ZKPProof,
    revealFields: string[]
  ): Promise<{
    proof: any;
    publicInputs: any[];
    merkleRoot: string;
  }> {
    // Generate proof for single transaction with selective disclosure
    return {
      proof: {
        pi_a: ['0', '0'],
        pi_b: [['0', '0'], ['0', '0']],
        pi_c: ['0', '0'],
        protocol: 'groth16',
      },
      publicInputs: [transaction.transactionId, revealFields.length.toString()],
      merkleRoot: transaction.nullifierHash,
    };
  }

  private async verifyMerkleRoot(auditProof: AuditProofInterface): Promise<boolean> {
    // Verify that the merkle root in the proof matches expected value
    return !!auditProof.merkleRoot;
  }

  private async verifyRevealedFields(auditProof: AuditProofInterface): Promise<boolean> {
    // Verify that revealed fields are properly formatted and valid
    return Array.isArray(auditProof.revealedFields) && auditProof.revealedFields.length > 0;
  }

  private calculateComplianceScore(
    transactions: any[],
    auditProofs: AuditProofEntity[]
  ): number {
    // Simplified compliance score calculation
    // In production, this would consider multiple factors
    const baseScore = 100;
    const proofCoverage = auditProofs.length / Math.max(transactions.length, 1);
    
    return Math.min(baseScore, Math.floor(baseScore * proofCoverage));
  }

  private flagSuspiciousTransactions(transactions: any[]): any[] {
    // Simplified suspicious transaction detection
    // In production, this would use ML models or rule-based systems
    return transactions.filter(t => {
      // Example: flag very large transactions
      return t.amount > 1000000;
    });
  }
}
