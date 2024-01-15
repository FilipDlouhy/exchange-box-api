import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { MessagePattern } from '@nestjs/microservices';
import { userMessagePatterns } from '@app/tcp';
import { CreateUserDto } from '@app/dtos/userDtos/create.user.dto';
import { UserDto } from '@app/dtos/userDtos/user.dto';
import { UpdateUserDto } from '@app/dtos/userDtos/update.user.dto';
import { ToggleFriendDto } from '@app/dtos/userDtos/toggle.friend.dto';
import { CreateFriendshipDto } from '@app/dtos/userDtos/create.friend.ship.dto';
import { UploadUserImageDto } from '@app/dtos/userDtos/upload.user.image.dto';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern(userMessagePatterns.createUser)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createUser(createUserDto: CreateUserDto): Promise<UserDto> {
    return await this.userService.createUser(createUserDto);
  }

  @MessagePattern(userMessagePatterns.getUser)
  async getUser({ id }: { id: number }): Promise<UserDto> {
    return await this.userService.getUser(id);
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
    return await this.userService.updateUser(UpdateUserDto);
  }

  @MessagePattern(userMessagePatterns.getUsers)
  async getUsers(): Promise<UserDto[]> {
    return await this.userService.getUsers();
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
    return await this.userService.addFriend(toggleFriendDto);
  }

  @MessagePattern(userMessagePatterns.deleteUser)
  async deleteUser({ id }: { id: number }): Promise<boolean> {
    return await this.userService.deleteUser(id);
  }

  @MessagePattern(userMessagePatterns.removeFriend)
  async removeFriend({ id }: { id: number }): Promise<boolean> {
    return await this.userService.removeFriend(id);
  }

  @MessagePattern(userMessagePatterns.checkIfFriends)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async checkIfFriends(
    createFriendshipDto: CreateFriendshipDto,
  ): Promise<boolean> {
    return await this.userService.checkIfFriends(
      createFriendshipDto.user_id,
      createFriendshipDto.friend_id,
    );
  }

  @MessagePattern(userMessagePatterns.getUserWithFriend)
  async getUserWithFriend(
    createFriendshipDto: CreateFriendshipDto,
  ): Promise<{ user: UserDto; friend: UserDto }> {
    return await this.userService.getUserWithFriend(
      createFriendshipDto.user_id,
      createFriendshipDto.friend_id,
    );
  }

  @MessagePattern(userMessagePatterns.uploadUserImage)
  async uploadUserImage(uploadUserImageDto: UploadUserImageDto) {
    return this.userService.uploadUserImage(uploadUserImageDto, false);
  }

  @MessagePattern(userMessagePatterns.updateUserImage)
  async updateUserImage(uploadUserImageDto: UploadUserImageDto) {
    return this.userService.uploadUserImage(uploadUserImageDto, true);
  }

  @MessagePattern(userMessagePatterns.getUserImage)
  async getUserImage({ id }: { id: number }): Promise<string> {
    return this.userService.getUserImage(id);
  }

  @MessagePattern(userMessagePatterns.deleteUserImage)
  async deleteUserImage({ id }: { id: number }) {
    return this.userService.deleteUserImage(id);
  }
}
