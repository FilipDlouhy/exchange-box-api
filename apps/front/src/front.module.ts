import { Module } from '@nestjs/common';
import { FrontController } from './front.controller';
import { FrontService } from './front.service';
import { Front } from '@app/database/entities/front.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Front])],
  controllers: [FrontController],
  providers: [FrontService],
})
export class FrontModule {}
