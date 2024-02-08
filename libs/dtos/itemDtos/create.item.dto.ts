import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateItemDto {
  @IsInt()
  @IsNotEmpty()
  lengthInCm: number = 0;

  @IsInt()
  @IsNotEmpty()
  widthInCm: number = 0;

  @IsInt()
  @IsNotEmpty()
  heightInCm: number = 0;

  @IsString()
  @IsNotEmpty()
  name: string = '';

  @IsInt()
  @IsNotEmpty()
  userId: number = 0;

  @IsInt()
  @IsNotEmpty()
  friendId: number = 0;

  @IsInt()
  @IsNotEmpty()
  weightInGrams: number = 0;
}
