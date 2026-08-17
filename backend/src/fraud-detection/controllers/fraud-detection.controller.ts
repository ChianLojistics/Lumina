import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FraudDetectionService } from '../services/fraud-detection.service';
import { RuleManagementService } from '../services/rule-management.service';
import { RuleTestingService } from '../services/rule-testing.service';
import { CreateRuleDto } from '../dto/create-rule.dto';
import { UpdateRuleDto } from '../dto/update-rule.dto';
import { TestRuleDto } from '../dto/test-rule.dto';
import { RollbackRuleDto } from '../dto/rollback-rule.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('fraud-detection')
@UseGuards(JwtAuthGuard)
export class FraudDetectionController {
  constructor(
    private fraudDetectionService: FraudDetectionService,
    private ruleManagementService: RuleManagementService,
    private ruleTestingService: RuleTestingService,
  ) {}

  @Post('evaluate')
  async evaluate(@Body() transaction: any, @Request() req) {
    const merchantId = req.user?.merchantId || transaction.merchantId;
    return this.fraudDetectionService.evaluateTransaction(transaction, merchantId);
  }

  @Get('rules')
  async getRules(@Query('merchantId') merchantId?: string) {
    return this.ruleManagementService.findAll(merchantId);
  }

  @Get('rules/:id')
  async getRule(@Param('id') id: string) {
    return this.ruleManagementService.findOne(id);
  }

  @Post('rules')
  @UseGuards(RolesGuard)
  async createRule(@Body() createRuleDto: CreateRuleDto, @Request() req) {
    return this.ruleManagementService.create(createRuleDto, req.user?.id || 'system');
  }

  @Put('rules/:id')
  @UseGuards(RolesGuard)
  async updateRule(
    @Param('id') id: string,
    @Body() updateRuleDto: UpdateRuleDto,
    @Request() req,
  ) {
    return this.ruleManagementService.update(id, updateRuleDto, req.user?.id || 'system');
  }

  @Delete('rules/:id')
  @UseGuards(RolesGuard)
  async deleteRule(@Param('id') id: string) {
    return this.ruleManagementService.remove(id);
  }

  @Post('rules/:id/toggle')
  @UseGuards(RolesGuard)
  async toggleRule(@Param('id') id: string, @Request() req) {
    return this.ruleManagementService.toggleEnabled(id, req.user?.id || 'system');
  }

  @Post('rules/:id/test')
  @UseGuards(RolesGuard)
  async testRule(@Param('id') id: string, @Body() testRuleDto: TestRuleDto) {
    return this.ruleTestingService.testRule(id, testRuleDto);
  }

  @Get('rules/:id/versions')
  async getRuleVersions(@Param('id') id: string) {
    return this.ruleManagementService.getVersions(id);
  }

  @Post('rules/:id/rollback')
  @UseGuards(RolesGuard)
  async rollbackRule(
    @Param('id') id: string,
    @Body() rollbackDto: RollbackRuleDto,
    @Request() req,
  ) {
    return this.ruleManagementService.rollback(id, rollbackDto, req.user?.id || 'system');
  }

  @Post('rules/reload')
  @UseGuards(RolesGuard)
  async reloadRules(@Query('merchantId') merchantId?: string) {
    return this.ruleManagementService.reloadRules(merchantId);
  }

  @Get('analytics')
  async getAnalytics(@Query('ruleId') ruleId?: string, @Query('merchantId') merchantId?: string) {
    if (ruleId) {
      return this.fraudDetectionService.getRuleAnalytics(ruleId);
    }
    if (merchantId) {
      return this.fraudDetectionService.getMerchantAnalytics(merchantId);
    }
    return this.fraudDetectionService.getGlobalAnalytics();
  }

  @Post('validate')
  async validateRule(@Body() ruleConfig: any) {
    return this.ruleTestingService.validateRuleConfig(ruleConfig);
  }
}
