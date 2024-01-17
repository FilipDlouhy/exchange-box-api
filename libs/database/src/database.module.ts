// common/database.module.ts
import { Module } from '@nestjs/common';
import { databaseConfig } from './database.config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig)],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
