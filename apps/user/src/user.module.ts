import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Center } from '@app/database/entities/center.entity';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Center])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
