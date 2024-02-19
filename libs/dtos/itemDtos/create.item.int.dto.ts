import { IsNotEmpty, IsString } from 'class-validator';

export class CreateItemIntDto {
  @IsString()
  @IsNotEmpty()
  length: number = 0;

  @IsString()
  @IsNotEmpty()
  width: number = 0;

  @IsString()
  @IsNotEmpty()
  height: number = 0;

  @IsString()
  @IsNotEmpty()
  name: string = '';

  @IsString()
  @IsNotEmpty()
  userId: number = 0;

  @IsString()
  @IsNotEmpty()
  friendId: number = 0;

  @IsString()
  @IsNotEmpty()
  weight: number = 0;

  images?: any;
}
