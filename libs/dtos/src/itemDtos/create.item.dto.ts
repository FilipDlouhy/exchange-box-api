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
  user_id: number = 0;

  @IsInt()
  @IsNotEmpty()
  friend_id: number = 0;

  @IsInt()
  @IsNotEmpty()
  weightInGrams: number = 0;
}
