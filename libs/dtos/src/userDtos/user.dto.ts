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

  @IsString()
  @IsNotEmpty()
  telephone: string | undefined;

  @IsString()
  @IsNotEmpty()
  address: string | undefined;

  @IsEmail()
  email: string;

  @IsInt()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsOptional()
  imageURL: string | undefined;

  constructor(
    name: string,
    email: string,
    id: number,
    telephone?: string,
    address?: string,
    imageURL?: string,
  ) {
    this.name = name;
    this.email = email;
    this.id = id;
    this.imageURL = imageURL;
    this.telephone = telephone;
    this.address = address;
  }
}
