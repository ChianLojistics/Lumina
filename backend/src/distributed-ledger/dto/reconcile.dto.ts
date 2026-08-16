import { IsDateString, IsOptional } from 'class-validator';

export class ReconcileDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  services?: string[];
}
