import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserProfileFriendDto } from './user.profile.friend.dto';
import { UserProfileItemDto } from './user.profile.item.dto';
import { UserProfileExhnageDto } from './user.profile.exhcange.dto';

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

  @IsString()
  @IsOptional()
  backgroundImageUrl: string | undefined;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserProfileExhnageDto)
  userExchanges: UserProfileExhnageDto[];

  UserProfileExhnageDto;
  constructor(
    name: string,
    email: string,
    id: number,
    userItems: UserProfileItemDto[],
    userFriends: UserProfileFriendDto[],
    userExchanges: UserProfileExhnageDto[],
    imageURL?: string,
    backgroundImageUrl?: string,
    address?: string,
    telephone?: string,
    friendStatus?: number,
  ) {
    this.name = name;
    this.email = email;
    this.id = id;
    this.imageURL = imageURL;
    this.backgroundImageUrl = backgroundImageUrl;
    this.address = address;
    this.telephone = telephone;
    this.userItems = userItems;
    this.userFriends = userFriends;
    this.friendStatus = friendStatus;
    this.userExchanges = userExchanges;
  }
}
