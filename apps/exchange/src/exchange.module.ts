import { Module } from '@nestjs/common';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exchange } from '@app/database/entities/exchange.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { ExchangeUtilsService } from './exchange.utils.service';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Exchange]),
    CacheModule.register(),
  ],
  controllers: [ExchangeController],
  providers: [ExchangeService, ExchangeUtilsService],
})
export class ExchangeModule {}
