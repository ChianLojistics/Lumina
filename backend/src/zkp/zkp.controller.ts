import { Controller, Post, Get, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { ZKPProofService } from './services/zkp-proof.service';
import { ZKPVerificationService } from './services/zkp-verification.service';
import { PrivacyAuditService } from './services/privacy-audit.service';
import { 
  PaymentDetails, 
  SettlementDetails, 
  IdentityDetails, 
  AuditProofRequest,
  AuditProof 
} from './interfaces/zkp-proof.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('api/zkp')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ZKPController {
  private readonly logger = new Logger(ZKPController.name);

  constructor(
    private readonly zkpProofService: ZKPProofService,
    private readonly zkpVerificationService: ZKPVerificationService,
    private readonly privacyAuditService: PrivacyAuditService,
  ) {}

  // Payment Proof Endpoints

  @Post('proofs/payment')
  @Roles(Role.MERCHANT, Role.ADMIN)
  async generatePaymentProof(@Body() payment: PaymentDetails) {
    this.logger.log(`POST /api/zkp/proofs/payment - Generating payment proof`);
    const proof = await this.zkpProofService.generatePaymentProof(payment);
    return {
      success: true,
      data: proof,
      message: 'Payment proof generated successfully',
    };
  }

  @Post('proofs/settlement')
  @Roles(Role.MERCHANT, Role.ADMIN)
  async generateSettlementProof(@Body() settlement: SettlementDetails) {
    this.logger.log(`POST /api/zkp/proofs/settlement - Generating settlement proof`);
    const proof = await this.zkpProofService.generateSettlementProof(settlement);
    return {
      success: true,
      data: proof,
      message: 'Settlement proof generated successfully',
    };
  }

  @Post('proofs/identity')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  async generateIdentityProof(@Body() identity: IdentityDetails) {
    this.logger.log(`POST /api/zkp/proofs/identity - Generating identity proof`);
    const proof = await this.zkpProofService.generateIdentityProof(identity);
    return {
      success: true,
      data: proof,
      message: 'Identity proof generated successfully',
    };
  }

  @Post('proofs/verify')
  @Roles(Role.ADMIN, Role.MERCHANT)
  async verifyProof(@Body() proof: any) {
    this.logger.log(`POST /api/zkp/proofs/verify - Verifying proof`);
    const isValid = await this.zkpVerificationService.verifyPaymentProof(proof);
    return {
      success: true,
      data: { isValid },
      message: isValid ? 'Proof verified successfully' : 'Proof verification failed',
    };
  }

  @Get('proofs/transaction/:transactionId')
  @Roles(Role.ADMIN, Role.MERCHANT)
  async getProofsByTransaction(@Param('transactionId') transactionId: string) {
    this.logger.log(`GET /api/zkp/proofs/transaction/${transactionId}`);
    const proofs = await this.zkpProofService.getProofsByTransaction(transactionId);
    return {
      success: true,
      data: proofs,
      message: `Found ${proofs.length} proofs for transaction`,
    };
  }

  @Get('proofs/:id')
  @Roles(Role.ADMIN, Role.MERCHANT)
  async getProofById(@Param('id') id: string) {
    this.logger.log(`GET /api/zkp/proofs/${id}`);
    const proof = await this.zkpProofService.getProofById(id);
    return {
      success: true,
      data: proof,
      message: 'Proof retrieved successfully',
    };
  }

  // Nullifier Endpoints

  @Get('nullifiers/:nullifierHash')
  @Roles(Role.ADMIN, Role.MERCHANT)
  async checkNullifier(@Param('nullifierHash') nullifierHash: string) {
    this.logger.log(`GET /api/zkp/nullifiers/${nullifierHash}`);
    const isUsed = await this.zkpProofService.isNullifierUsed(nullifierHash);
    return {
      success: true,
      data: { isUsed, nullifierHash },
      message: isUsed ? 'Nullifier has been used' : 'Nullifier is available',
    };
  }

  @Post('nullifiers/:nullifierHash/mark-spent')
  @Roles(Role.ADMIN)
  async markNullifierSpent(@Param('nullifierHash') nullifierHash: string) {
    this.logger.log(`POST /api/zkp/nullifiers/${nullifierHash}/mark-spent`);
    await this.zkpProofService.markNullifierSpent(nullifierHash);
    return {
      success: true,
      message: 'Nullifier marked as spent',
    };
  }

  // Audit Endpoints

  @Post('audit/generate')
  @Roles(Role.ADMIN, Role.MERCHANT)
  async generateAuditProof(@Body() request: AuditProofRequest) {
    this.logger.log(`POST /api/zkp/audit/generate - Generating audit proof`);
    const auditProof = await this.privacyAuditService.generateAuditProof(request);
    return {
      success: true,
      data: auditProof,
      message: 'Audit proof generated successfully',
    };
  }

  @Post('audit/verify')
  @Roles(Role.ADMIN, Role.MERCHANT)
  async verifyAuditProof(@Body() auditProof: AuditProof) {
    this.logger.log(`POST /api/zkp/audit/verify - Verifying audit proof`);
    const isValid = await this.privacyAuditService.verifyAuditProof(auditProof);
    return {
      success: true,
      data: { isValid },
      message: isValid ? 'Audit proof verified successfully' : 'Audit proof verification failed',
    };
  }

  @Get('audit/merchant/:merchantId')
  @Roles(Role.ADMIN, Role.MERCHANT)
  async getMerchantAuditProofs(@Param('merchantId') merchantId: string) {
    this.logger.log(`GET /api/zkp/audit/merchant/${merchantId}`);
    const proofs = await this.privacyAuditService.getAuditProofsByMerchant(merchantId);
    return {
      success: true,
      data: proofs,
      message: `Found ${proofs.length} audit proofs for merchant`,
    };
  }

  @Get('audit/:id')
  @Roles(Role.ADMIN, Role.MERCHANT)
  async getAuditProofById(@Param('id') id: string) {
    this.logger.log(`GET /api/zkp/audit/${id}`);
    const proof = await this.privacyAuditService.getAuditProofById(id);
    return {
      success: true,
      data: proof,
      message: 'Audit proof retrieved successfully',
    };
  }

  @Post('audit/compliance')
  @Roles(Role.ADMIN)
  async generateComplianceReport(@Body() request: {
    merchantId: string;
    dateRange: { startDate: Date; endDate: Date };
  }) {
    this.logger.log(`POST /api/zkp/audit/compliance - Generating compliance report`);
    const report = await this.privacyAuditService.generateComplianceReport(
      request.merchantId,
      request.dateRange
    );
    return {
      success: true,
      data: report,
      message: 'Compliance report generated successfully',
    };
  }

  @Post('audit/selective-disclosure')
  @Roles(Role.CUSTOMER, Role.MERCHANT, Role.ADMIN)
  async generateSelectiveDisclosure(@Body() request: {
    transactionId: string;
    revealFields: string[];
  }) {
    this.logger.log(`POST /api/zkp/audit/selective-disclosure - Generating selective disclosure`);
    const proof = await this.privacyAuditService.generateSelectiveDisclosureProof(
      request.transactionId,
      request.revealFields
    );
    return {
      success: true,
      data: proof,
      message: 'Selective disclosure proof generated successfully',
    };
  }

  // Verification Key Endpoints

  @Post('keys/verification')
  @Roles(Role.ADMIN)
  async getVerificationKey(@Body() request: { circuitName: string }) {
    this.logger.log(`POST /api/zkp/keys/verification - Getting verification key`);
    // Placeholder for verification key retrieval
    return {
      success: true,
      data: {
        circuitName: request.circuitName,
        verificationKey: 'mock_verification_key',
      },
      message: 'Verification key retrieved successfully',
    };
  }

  // Statistics and Monitoring

  @Get('stats')
  @Roles(Role.ADMIN)
  async getVerificationStats() {
    this.logger.log(`GET /api/zkp/stats - Getting verification statistics`);
    const stats = await this.zkpVerificationService.getVerificationStats();
    return {
      success: true,
      data: stats,
      message: 'Statistics retrieved successfully',
    };
  }

  @Post('proofs/batch-verify')
  @Roles(Role.ADMIN)
  async batchVerifyProofs(@Body() request: { proofs: any[] }) {
    this.logger.log(`POST /api/zkp/proofs/batch-verify - Batch verifying proofs`);
    const results = await this.zkpVerificationService.batchVerifyProofs(request.proofs);
    return {
      success: true,
      data: {
        results,
        total: results.length,
        valid: results.filter(Boolean).length,
        invalid: results.filter(r => !Boolean(r)).length,
      },
      message: 'Batch verification completed',
    };
  }
}
