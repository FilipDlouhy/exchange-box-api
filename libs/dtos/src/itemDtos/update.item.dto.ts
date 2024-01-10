import { IsInt, IsString } from 'class-validator';

export class UpdateItemDto {
  @IsInt()
  lengthInCm: number = 0;

  @IsInt()
  widthInCm: number = 0;

  @IsInt()
  heightInCm: number = 0;

  @IsString()
  name: string = '';

  @IsInt()
  friend_id: number = 0;

  @IsInt()
  weightInGrams: number = 0;

  @IsInt()
  id: number = 0;

  constructor() {
    this.lengthInCm = 0;
    this.widthInCm = 0;
    this.heightInCm = 0;
    this.name = '';
    this.friend_id = 0;
    this.weightInGrams = 0;
    this.id = 0;
  }
}
