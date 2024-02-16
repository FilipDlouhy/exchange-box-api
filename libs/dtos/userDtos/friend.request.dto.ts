import { IsString, IsNumber, IsDate } from 'class-validator';

export class FriendRequestDto {
  @IsString()
  id: string;

  @IsDate()
  createdAt: Date;

  @IsNumber()
  friendId: number;

  @IsNumber()
  userId: number;

  @IsString()
  friendImageUrl: string;

  @IsString()
  userName: string;

  @IsString()
  friendName: string;

  constructor(
    id: string,
    createdAt: Date,
    friendId: number,
    userId: number,
    friendImageUrl: string,
    userName: string,
    friendName: string,
  ) {
    this.id = id;
    this.createdAt = createdAt;
    this.friendId = friendId;
    this.userId = userId;
    this.friendImageUrl = friendImageUrl;
    this.userName = userName;
    this.friendName = friendName;
  }
}
