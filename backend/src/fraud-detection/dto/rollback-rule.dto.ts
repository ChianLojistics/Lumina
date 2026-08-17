import { IsNumber } from 'class-validator';

export class RollbackRuleDto {
  @IsNumber()
  version!: number;
}
