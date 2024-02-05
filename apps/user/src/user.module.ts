import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/database/entities/user.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { FriendRequest } from '@app/database/entities/friend.request.entity';
import { UserFriendService } from './user.friend.service';
@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([User, FriendRequest]),
    CacheModule.register(),
  ],
  controllers: [UserController],
  providers: [UserService, UserFriendService],
})
export class UserModule {}
