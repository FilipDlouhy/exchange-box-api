import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
} from 'class-validator';

export class UserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsOptional()
  imageURL: string | undefined;

  constructor(name: string, email: string, id: number, imageURL?: string) {
    this.name = name;
    this.email = email;
    this.id = id;
    this.imageURL = imageURL;
  }
}
