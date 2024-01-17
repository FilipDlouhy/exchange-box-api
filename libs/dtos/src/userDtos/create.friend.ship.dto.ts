import { IsInt } from 'class-validator';

export class CreateFriendshipDto {
  @IsInt()
  userId: number;

  @IsInt()
  friendId: number;
}
