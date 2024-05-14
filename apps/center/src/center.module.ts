import { Module } from '@nestjs/common';
import { CenterController } from './center.controller';
import { CenterService } from './center.service';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Center } from '@app/database/entities/center.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { CenterRepository } from './center.repository';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Center]),
    CacheModule.register(),
  ],
  controllers: [CenterController],
  providers: [CenterService, CenterRepository],
})
export class CenterModule {}
