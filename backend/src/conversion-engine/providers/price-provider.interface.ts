import { ConversionAsset } from '../asset.enum';

export interface PriceProvider {
  readonly name: string;
  getPriceUsd(asset: ConversionAsset): Promise<number>;
}
