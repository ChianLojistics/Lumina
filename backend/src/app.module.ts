import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentModule } from './payment/payment.module';
import { ApiGatewayModule } from './api-gateway/api-gateway.module';
import { BlockchainListenerModule } from './blockchain-listener/blockchain-listener.module';
import { NotificationServiceModule } from './notification-service/notification-service.module';
import { ConversionEngineModule } from './conversion-engine/conversion-engine.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { RampModule } from './ramp-service/ramp-service.module';
import { CryptoModule } from './crypto/crypto.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { DistributedLedgerModule } from './distributed-ledger/distributed-ledger.module';
import { ZKPModule } from './zkp/zkp.module';
import { FraudDetectionModule } from './fraud-detection/fraud-detection.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MetricsService } from './common/metrics/metrics.service';
import { TypeOrmMetricsLogger } from './common/metrics/typeorm-metrics.logger';
import { DbPoolMetricsService } from './common/metrics/db-pool-metrics.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    ScheduleModule.forRoot(),
    CacheModule,
    TypeOrmModule.forRootAsync({
      imports: [MetricsModule],
      inject: [MetricsService],
      useFactory: (metricsService: MetricsService) => ({
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT) || 5432,
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'lumina',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: true,
        // Low threshold so logQuerySlow (the only logger hook that receives
        // execution time) fires for effectively every query, feeding db_query_duration_seconds.
        maxQueryExecutionTime: 1,
        logger: new TypeOrmMetricsLogger(metricsService),
      }),
    }),
    AuthModule,
    RampModule,
    CryptoModule,
    DistributedLedgerModule,
    ZKPModule,
    FraudDetectionModule,
    RateLimitModule,
    AnalyticsModule,
    PaymentModule,
    ApiGatewayModule,
    BlockchainListenerModule,
    NotificationServiceModule,
    ConversionEngineModule,
  ],
  providers: [DbPoolMetricsService],
})
export class AppModule {}
