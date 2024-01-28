import { Controller, Inject, UsePipes, ValidationPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { userMessagePatterns } from '@app/tcp';
import { CreateUserDto } from '@app/dtos/userDtos/create.user.dto';
import { UserDto } from '@app/dtos/userDtos/user.dto';
import { UpdateUserDto } from '@app/dtos/userDtos/update.user.dto';
import { ToggleFriendDto } from '@app/dtos/userDtos/toggle.friend.dto';
import { UploadUserImageDto } from '@app/dtos/userDtos/upload.user.image.dto';
import { User } from '@app/database/entities/user.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @MessagePattern(userMessagePatterns.createUser)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createUser(createUserDto: CreateUserDto): Promise<boolean> {
    try {
      return await this.userService.createUser(createUserDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.getUser)
  async getUser({ id }: { id: number }): Promise<UserDto> {
    try {
      const cachedUser: UserDto = await this.cacheManager.get('getUser');
      if (cachedUser) {
        return cachedUser;
      }

      const user = await this.userService.getUser(id);
      await this.cacheManager.set('getUser', user, 18000);

      return user;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.updateUser)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateUser(UpdateUserDto: UpdateUserDto): Promise<UserDto> {
    try {
      return await this.userService.updateUser(UpdateUserDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.getUsers)
  async getUsers(): Promise<UserDto[]> {
    try {
      const cachedUsers: UserDto[] = await this.cacheManager.get('getUsers');

      if (cachedUsers) {
        return cachedUsers;
      }

      const users = await this.userService.getUsers();

      await this.cacheManager.set('getUsers', users, 18000);

      return users;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.addFriend)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async addFriend(toggleFriendDto: ToggleFriendDto) {
    try {
      return await this.userService.addFriend(toggleFriendDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.deleteUser)
  async deleteUser({ id }: { id: number }): Promise<boolean> {
    try {
      return await this.userService.deleteUser(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.removeFriend)
  async removeFriend({
    userId,
    friendId,
  }: {
    userId: number;
    friendId: number;
  }): Promise<boolean> {
    try {
      return await this.userService.removeFriend(userId, friendId);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.checkIfFriends)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async checkIfFriends(toggleFriendDto: ToggleFriendDto): Promise<boolean> {
    try {
      return await this.userService.checkIfFriends(
        toggleFriendDto.userId,
        toggleFriendDto.friendId,
      );
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.getUserWithFriend)
  async getUserWithFriend(
    toggleFriendDto: ToggleFriendDto,
  ): Promise<{ user: User; friend: User }> {
    try {
      return await this.userService.getUserWithFriend(
        toggleFriendDto.userId,
        toggleFriendDto.friendId,
      );
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.uploadUserImage)
  async uploadUserImage(
    uploadUserImageDto: UploadUserImageDto,
  ): Promise<boolean> {
    try {
      return this.userService.uploadUserImage(uploadUserImageDto, false);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.updateUserImage)
  async updateUserImage(uploadUserImageDto: UploadUserImageDto) {
    try {
      return this.userService.uploadUserImage(uploadUserImageDto, true);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.getUserImage)
  async getUserImage({ id }: { id: number }): Promise<string> {
    try {
      const cacheKey = `userImage:${id}`;
      const cachedImage: string = await this.cacheManager.get(cacheKey);

      if (cachedImage) {
        return cachedImage;
      }

      const userImage = await this.userService.getUserImage(id);
      await this.cacheManager.set(cacheKey, userImage, 18000);

      return userImage;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.deleteUserImage)
  async deleteUserImage({ id }: { id: number }) {
    try {
      return this.userService.deleteUserImage(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.getUserForItemUpdate)
  async getUserForItemUpdate({ friendId }: { friendId: number }) {
    try {
      return this.userService.getUserForItemUpdate(friendId);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.getUserByEmail)
  async getUserByEmail({ userEmail }: { userEmail: string }): Promise<User> {
    try {
      return this.userService.getUserByEmail(userEmail);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(userMessagePatterns.getFriends)
  async getFriends({ id }: { id: number }): Promise<UserDto[]> {
    try {
      return this.userService.getFriends(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }
}
