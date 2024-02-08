import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean, // Add IsBoolean decorator
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserProfileFriendDto } from './user.profile.friend.dto';
import { UserProfileItemDto } from './user.profile.item.dto';

export class UserProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  telephone: string | undefined;

  @IsString()
  @IsNotEmpty()
  address: string | undefined;

  @IsInt()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsOptional()
  imageURL: string | undefined;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserProfileFriendDto)
  userFriends: UserProfileFriendDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserProfileItemDto)
  userItems: UserProfileItemDto[];

  @IsInt()
  @IsNotEmpty()
  friendStatus: number;

  constructor(
    name: string,
    email: string,
    id: number,
    userItems: UserProfileItemDto[],
    userFriends: UserProfileFriendDto[],
    imageURL?: string,
    address?: string,
    telephone?: string,
    friendStatus?: number,
  ) {
    this.name = name;
    this.email = email;
    this.id = id;
    this.imageURL = imageURL;
    this.address = address;
    this.telephone = telephone;
    this.userItems = userItems;
    this.userFriends = userFriends;
    this.friendStatus = friendStatus;
  }
}
