import { IsString, IsNumber, IsNotEmpty, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class WriteEntryDto {
  @IsString()
  @IsNotEmpty()
  service: string;

  @IsString()
  @IsNotEmpty()
  operation: string;

  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ValidateNested()
  @Type(() => Object)
  data: Record<string, any>;

  @IsOptional()
  @IsString()
  consistencyLevel?: 'strong' | 'eventual';
}
