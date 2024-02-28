import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUpdateItemIntDto {
  @IsNumber()
  @IsNotEmpty()
  length: number = 0;

  @IsNumber()
  @IsNotEmpty()
  width: number = 0;

  @IsNumber()
  @IsNotEmpty()
  height: number = 0;

  @IsString()
  @IsNotEmpty()
  name: string = '';

  @IsNumber()
  @IsNotEmpty()
  userId: number = 0;

  @IsNumber()
  @IsNotEmpty()
  friendId: number = 0;

  @IsNumber()
  @IsNotEmpty()
  weight: number = 0;

  @IsNumber()
  id?: number = 0;

  images?: any;
}
