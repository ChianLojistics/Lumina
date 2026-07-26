import { IsEnum } from 'class-validator';
import { ConversionAsset } from '../asset.enum';

export class GetRateDto {
  @IsEnum(ConversionAsset)
  from: ConversionAsset;

  @IsEnum(ConversionAsset)
  to: ConversionAsset;
}
