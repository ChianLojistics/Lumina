import { IsArray, ValidateNested, IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class TestTransactionDto {
  @IsString()
  id!: string;

  @IsObject()
  data!: Record<string, any>;

  @IsBoolean()
  expectedMatch!: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class TestRuleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestTransactionDto)
  testData!: TestTransactionDto[];
}
