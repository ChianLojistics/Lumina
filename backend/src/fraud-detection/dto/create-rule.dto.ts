import { IsString, IsBoolean, IsEnum, IsArray, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { RulePriority } from '../entities/fraud-rule.entity';
import { Condition, Action, ConditionOperator, ConditionType, LogicalOperator, ActionType } from '../interfaces/rule.interfaces';

class ConditionDto implements Condition {
  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsEnum(ConditionOperator)
  operator?: ConditionOperator;

  @IsOptional()
  value?: any;

  @IsOptional()
  @IsEnum(ConditionType)
  type?: ConditionType;

  @IsOptional()
  @IsString()
  window?: string;

  @IsOptional()
  @IsEnum(LogicalOperator)
  logicalOperator?: LogicalOperator;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];
}

class ActionDto implements Action {
  @IsEnum(ActionType)
  type!: ActionType;

  @IsOptional()
  @IsObject()
  params?: Record<string, any>;
}

export class CreateRuleDto {
  @IsOptional()
  @IsString()
  merchant_id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions!: ConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions!: ActionDto[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsEnum(RulePriority)
  @IsOptional()
  priority?: RulePriority;
}
