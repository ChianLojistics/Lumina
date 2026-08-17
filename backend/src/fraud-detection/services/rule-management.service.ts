import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudRule } from '../entities/fraud-rule.entity';
import { RuleVersion } from '../entities/rule-version.entity';
import { CreateRuleDto } from '../dto/create-rule.dto';
import { UpdateRuleDto } from '../dto/update-rule.dto';
import { RollbackRuleDto } from '../dto/rollback-rule.dto';
import { RuleConfig, RuleVersionInfo } from '../interfaces/rule.interfaces';
import { RulesEngineService } from './rules-engine.service';

@Injectable()
export class RuleManagementService {
  private readonly logger = new Logger(RuleManagementService.name);

  constructor(
    @InjectRepository(FraudRule)
    private fraudRuleRepository: Repository<FraudRule>,
    @InjectRepository(RuleVersion)
    private ruleVersionRepository: Repository<RuleVersion>,
    private rulesEngineService: RulesEngineService,
  ) {}

  async create(createRuleDto: CreateRuleDto, createdBy: string): Promise<FraudRule> {
    const ruleConfig: RuleConfig = {
      conditions: createRuleDto.conditions,
      actions: createRuleDto.actions,
    };

    const rule = this.fraudRuleRepository.create({
      ...createRuleDto,
      rule_config: ruleConfig,
      enabled: createRuleDto.enabled ?? true,
      created_by: createdBy,
    });

    const savedRule = await this.fraudRuleRepository.save(rule);

    // Create initial version
    await this.createVersion(savedRule.id, 1, ruleConfig, createdBy, 'Initial version');

    // Reload rules for the merchant
    if (savedRule.merchant_id) {
      await this.rulesEngineService.reloadRules(savedRule.merchant_id);
    }

    return savedRule;
  }

  async findAll(merchantId?: string): Promise<FraudRule[]> {
    const where = merchantId ? { merchant_id: merchantId } : {};
    return this.fraudRuleRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<FraudRule> {
    const rule = await this.fraudRuleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }
    return rule;
  }

  async update(id: string, updateRuleDto: UpdateRuleDto, updatedBy: string): Promise<FraudRule> {
    const rule = await this.findOne(id);

    // Create new version if rule config changed
    if (updateRuleDto.conditions || updateRuleDto.actions) {
      const newVersion = rule.version + 1;
      const oldConfig: RuleConfig = {
        conditions: rule.rule_config.conditions,
        actions: rule.rule_config.actions,
      };

      await this.createVersion(id, newVersion, oldConfig, updatedBy, 'Pre-update version');
      rule.version = newVersion;
    }

    if (updateRuleDto.conditions || updateRuleDto.actions) {
      rule.rule_config = {
        conditions: updateRuleDto.conditions || rule.rule_config.conditions,
        actions: updateRuleDto.actions || rule.rule_config.actions,
      };
    }

    Object.assign(rule, updateRuleDto);
    rule.updated_by = updatedBy;

    const updatedRule = await this.fraudRuleRepository.save(rule);

    // Reload rules for the merchant
    if (updatedRule.merchant_id) {
      await this.rulesEngineService.reloadRules(updatedRule.merchant_id);
    }

    return updatedRule;
  }

  async remove(id: string): Promise<void> {
    const rule = await this.findOne(id);
    await this.fraudRuleRepository.remove(rule);

    // Reload rules for the merchant
    if (rule.merchant_id) {
      await this.rulesEngineService.reloadRules(rule.merchant_id);
    }
  }

  async toggleEnabled(id: string, updatedBy: string): Promise<FraudRule> {
    const rule = await this.findOne(id);
    rule.enabled = !rule.enabled;
    rule.updated_by = updatedBy;

    const updatedRule = await this.fraudRuleRepository.save(rule);

    // Reload rules for the merchant
    if (updatedRule.merchant_id) {
      await this.rulesEngineService.reloadRules(updatedRule.merchant_id);
    }

    return updatedRule;
  }

  async getVersions(id: string): Promise<RuleVersionInfo[]> {
    const versions = await this.ruleVersionRepository.find({
      where: { rule_id: id },
      order: { version: 'DESC' },
    });

    return versions.map((v) => ({
      version: v.version,
      ruleConfig: v.rule_config as RuleConfig,
      createdBy: v.created_by,
      createdAt: v.created_at,
      changeDescription: v.change_description,
    }));
  }

  async rollback(id: string, rollbackDto: RollbackRuleDto, updatedBy: string): Promise<FraudRule> {
    const rule = await this.findOne(id);
    const targetVersion = await this.ruleVersionRepository.findOne({
      where: { rule_id: id, version: rollbackDto.version },
    });

    if (!targetVersion) {
      throw new NotFoundException(`Version ${rollbackDto.version} not found for rule ${id}`);
    }

    // Create version before rollback
    const newVersion = rule.version + 1;
    const currentConfig: RuleConfig = {
      conditions: rule.rule_config.conditions,
      actions: rule.rule_config.actions,
    };

    await this.createVersion(id, newVersion, currentConfig, updatedBy, 'Pre-rollback version');

    // Rollback to target version
    rule.rule_config = targetVersion.rule_config;
    rule.version = newVersion + 1;
    rule.updated_by = updatedBy;

    const updatedRule = await this.fraudRuleRepository.save(rule);

    // Reload rules for the merchant
    if (updatedRule.merchant_id) {
      await this.rulesEngineService.reloadRules(updatedRule.merchant_id);
    }

    return updatedRule;
  }

  async reloadRules(merchantId?: string): Promise<void> {
    if (merchantId) {
      await this.rulesEngineService.reloadRules(merchantId);
    } else {
      await this.rulesEngineService.reloadAllRules();
    }
  }

  private async createVersion(
    ruleId: string,
    version: number,
    ruleConfig: RuleConfig,
    createdBy: string,
    changeDescription: string,
  ): Promise<RuleVersion> {
    const ruleVersion = this.ruleVersionRepository.create({
      rule_id: ruleId,
      version,
      rule_config: ruleConfig,
      created_by: createdBy,
      change_description: changeDescription,
    });

    return this.ruleVersionRepository.save(ruleVersion);
  }
}
