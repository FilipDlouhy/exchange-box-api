import {
  IsEmail,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
} from 'class-validator';
import { UserDto } from './user.dto';

export class CurrentUserDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  backgroundImageUrl: string;

  @IsOptional()
  @IsString()
  address: string | null;

  @IsOptional()
  @IsString()
  telephone: string | null;

  @IsOptional()
  @IsNumber()
  longitude: number | null;

  @IsOptional()
  @IsNumber()
  latitude: number | null;

  @IsOptional()
  @IsArray()
  friends: UserDto[];

  @IsOptional()
  @IsArray()
  items: any[];

  @IsOptional()
  @IsArray()
  exchanges: any[];

  constructor(user: Partial<UserDto>) {
    Object.assign(this, user);
  }
}
