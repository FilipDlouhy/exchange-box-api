import { IsInt } from 'class-validator';

export class ToggleFriendDto {
  @IsInt()
  userId: number;

  @IsInt()
  friendId: number;
}
