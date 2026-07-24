import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversionEngineController } from './conversion-engine.controller';
import { ConversionEngineService } from './conversion-engine.service';
import { PriceOracleService } from './price-oracle.service';
import { ChainlinkProvider } from './providers/chainlink.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';
import { BinanceProvider } from './providers/binance.provider';
import { Conversion } from './entities/conversion.entity';
import { Payment } from '../payment/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversion, Payment])],
  controllers: [ConversionEngineController],
  providers: [
    ConversionEngineService,
    PriceOracleService,
    ChainlinkProvider,
    CoinGeckoProvider,
    BinanceProvider,
  ],
  exports: [ConversionEngineService],
})
export class ConversionEngineModule {}
