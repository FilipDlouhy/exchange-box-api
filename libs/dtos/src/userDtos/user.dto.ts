import { IsEmail, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class UserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @IsNotEmpty()
  id: number;

  constructor(name: string, email: string, id: number) {
    this.name = name;
    this.email = email;
    this.id = id;
  }
}
