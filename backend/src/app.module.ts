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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'lumina',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    AuthModule,
    PaymentModule,
    ApiGatewayModule,
    BlockchainListenerModule,
    NotificationServiceModule,
    ConversionEngineModule,
  ],
})
export class AppModule {}
