import { IsEmail, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsInt()
  id: number;
}
