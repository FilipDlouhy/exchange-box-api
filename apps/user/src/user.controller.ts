import { Controller } from '@nestjs/common';
import { UserService } from './user.service';
import { MessagePattern } from '@nestjs/microservices';
import { userMessagePatterns } from '@app/tcp';
import { CreateUserDto } from '@app/dtos/userDtos/create.user.dto';
import { UserDto } from '@app/dtos/userDtos/user.dto';
import { UpdateUserDto } from '@app/dtos/userDtos/update.user.dto';
import { ToggleFriendDto } from '@app/dtos/userDtos/toggle.friend.dto';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern(userMessagePatterns.createUser)
  async createUser(createUserDto: CreateUserDto): Promise<UserDto> {
    return this.userService.createUser(createUserDto);
  }

  @MessagePattern(userMessagePatterns.getUser)
  async getUser({ id }: { id: number }): Promise<UserDto> {
    return this.userService.getUser(id);
  }

  @MessagePattern(userMessagePatterns.updateUser)
  async updateUser(UpdateUserDto: UpdateUserDto): Promise<UserDto> {
    return this.userService.updateUser(UpdateUserDto);
  }

  @MessagePattern(userMessagePatterns.getUsers)
  async getUsers(): Promise<UserDto[]> {
    return this.userService.getUsers();
  }

  @MessagePattern(userMessagePatterns.addFriend)
  async addFriend(toggleFriendDto: ToggleFriendDto) {
    return this.userService.addFriend(toggleFriendDto);
  }

  @MessagePattern(userMessagePatterns.deleteUser)
  async deleteUser({ id }: { id: number }): Promise<boolean> {
    return this.userService.deleteUser(id);
  }

  @MessagePattern(userMessagePatterns.removeFriend)
  async removeFriend({ id }: { id: number }): Promise<boolean> {
    return this.userService.removeFriend(id);
  }
}
