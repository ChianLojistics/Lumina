import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ConversionAsset } from '../asset.enum';

export class ExecuteConversionDto {
  @IsString()
  @IsNotEmpty()
  payment_id: string;

  @IsEnum(ConversionAsset)
  from_asset: ConversionAsset;

  @IsEnum(ConversionAsset)
  to_asset: ConversionAsset;
}
