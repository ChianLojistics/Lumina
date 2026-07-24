import { IsEnum, IsNumberString } from 'class-validator';
import { ConversionAsset } from '../asset.enum';

export class EstimateConversionDto {
  @IsNumberString()
  amount: string;

  @IsEnum(ConversionAsset)
  from: ConversionAsset;

  @IsEnum(ConversionAsset)
  to: ConversionAsset;
}
