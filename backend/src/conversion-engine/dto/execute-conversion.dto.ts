import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConversionAsset } from '../asset.enum';

export class ExecuteConversionDto {
  @ApiProperty({ description: 'Payment ID to convert', example: 'pay_xyz789' })
  @IsString()
  @IsNotEmpty()
  payment_id: string;

  @ApiProperty({ description: 'Source asset', enum: ConversionAsset, example: ConversionAsset.XLM })
  @IsEnum(ConversionAsset)
  from_asset: ConversionAsset;

  @ApiProperty({ description: 'Target asset', enum: ConversionAsset, example: ConversionAsset.USDC })
  @IsEnum(ConversionAsset)
  to_asset: ConversionAsset;
}
