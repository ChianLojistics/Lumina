import { IsString, IsOptional } from 'class-validator';

export class CompleteOnboardingStepDto {
  @IsString()
  step: string;
}

export class SkipOnboardingStepDto {
  @IsString()
  step: string;
}
