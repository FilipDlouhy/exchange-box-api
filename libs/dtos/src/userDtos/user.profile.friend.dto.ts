import { IsInt, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UserProfileFriendDto {
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

  @IsInt()
  @IsNotEmpty()
  friendStatus: number;

  constructor(
    name: string,
    email: string,
    id: number,
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
    this.friendStatus = friendStatus;
  }
}
