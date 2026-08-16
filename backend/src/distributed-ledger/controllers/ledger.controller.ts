import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LedgerService } from '../services/ledger.service';
import { ReconciliationService } from '../services/reconciliation.service';
import { WriteEntryDto } from '../dto/write-entry.dto';
import { QueryLedgerDto } from '../dto/query-ledger.dto';
import { ReconcileDto } from '../dto/reconcile.dto';
import { LedgerResponseDto, LedgerHealthResponseDto } from '../dto/ledger-response.dto';

@Controller('api/ledger')
export class LedgerController {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  /**
   * Write entry to distributed ledger
   */
  @Post('write')
  @HttpCode(HttpStatus.CREATED)
  async writeEntry(@Body() dto: WriteEntryDto): Promise<LedgerResponseDto> {
    const entry = await this.ledgerService.writeEntry(dto);
    return new LedgerResponseDto(entry);
  }

  /**
   * Batch write entries to ledger
   */
  @Post('write/batch')
  @HttpCode(HttpStatus.CREATED)
  async batchWriteEntries(@Body() dtos: WriteEntryDto[]): Promise<LedgerResponseDto[]> {
    const entries = await this.ledgerService.batchWriteEntries(dtos);
    return entries.map(entry => new LedgerResponseDto(entry));
  }

  /**
   * Get entry by ID
   */
  @Get(':id')
  async getEntryById(@Param('id') id: string): Promise<LedgerResponseDto> {
    const entry = await this.ledgerService.getEntryById(id);
    return new LedgerResponseDto(entry);
  }

  /**
   * Get all entries for a transaction
   */
  @Get('transactions/:txId')
  async getTransactionEntries(
    @Param('txId') txId: string,
  ): Promise<LedgerResponseDto[]> {
    const entries = await this.ledgerService.getTransactionEntries(txId);
    return entries.map(entry => new LedgerResponseDto(entry));
  }

  /**
   * Query ledger with filters
   */
  @Get('query')
  async queryLedger(@Query() dto: QueryLedgerDto) {
    const result = await this.ledgerService.queryLedger(dto);
    return {
      entries: result.entries.map(entry => new LedgerResponseDto(entry)),
      total: result.total,
    };
  }

  /**
   * Verify entry integrity
   */
  @Get(':id/verify')
  async verifyEntry(@Param('id') id: string): Promise<{ valid: boolean }> {
    const valid = await this.ledgerService.verifyEntry(id);
    return { valid };
  }

  /**
   * Trigger reconciliation
   */
  @Post('reconcile')
  @HttpCode(HttpStatus.ACCEPTED)
  async reconcile(@Body() dto: ReconcileDto) {
    const report = await this.reconciliationService.reconcile(dto);
    return report;
  }

  /**
   * Get reconciliation report by ID
   */
  @Get('reconciliation/:reportId')
  async getReconciliationReport(@Param('reportId') reportId: string) {
    return this.reconciliationService.getReport(reportId);
  }

  /**
   * Get recent reconciliation reports
   */
  @Get('reconciliation/recent')
  async getRecentReports(@Query('limit') limit?: string) {
    return this.reconciliationService.getRecentReports(limit ? parseInt(limit, 10) : 10);
  }

  /**
   * Get ledger health
   */
  @Get('health')
  async getHealth(): Promise<LedgerHealthResponseDto> {
    const health = await this.ledgerService.getHealth();
    return {
      status: health.status,
      nodes: health.nodes,
      leader: health.leader,
      lastCommitIndex: health.lastCommitIndex,
      consensusReached: health.consensusReached,
      storageSize: health.storageSize,
    };
  }

  /**
   * Get ledger statistics
   */
  @Get('statistics')
  async getStatistics() {
    return this.ledgerService.getStatistics();
  }

  /**
   * Get reconciliation statistics
   */
  @Get('reconciliation/statistics')
  async getReconciliationStatistics() {
    return this.reconciliationService.getStatistics();
  }
}
