import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/database/entities/user.entity';
import { CacheModule } from '@nestjs/cache-manager';
@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
    CacheModule.register(),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
