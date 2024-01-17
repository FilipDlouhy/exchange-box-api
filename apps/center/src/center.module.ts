import { Module } from '@nestjs/common';
import { CenterController } from './center.controller';
import { CenterService } from './center.service';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Center } from '@app/database/entities/center.entity';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Center])],
  controllers: [CenterController],
  providers: [CenterService],
})
export class CenterModule {}
