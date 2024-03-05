import { IsString, IsNumber } from 'class-validator';

export class FriendSimpleDto {
  @IsNumber()
  friendId: number;

  @IsString()
  friendName: string;

  constructor(friendId: number, friendName: string) {
    this.friendId = friendId;
    this.friendName = friendName;
  }
}
