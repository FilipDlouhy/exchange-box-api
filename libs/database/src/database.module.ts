// common/database.module.ts
import { Module } from '@nestjs/common';
import { databaseConfig } from './typeOrm.config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig)],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
