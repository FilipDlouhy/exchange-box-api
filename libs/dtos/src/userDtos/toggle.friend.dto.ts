import { IsInt } from 'class-validator';

export class ToggleFriendDto {
  @IsInt()
  user_id: number;

  @IsInt()
  friend_id: number;
}