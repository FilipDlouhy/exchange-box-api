import { IsInt } from 'class-validator';

export class CreateFriendshipDto {
  @IsInt()
  user_id: number;

  @IsInt()
  friend_id: number;
}
