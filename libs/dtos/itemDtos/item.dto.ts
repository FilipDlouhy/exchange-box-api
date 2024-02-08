import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ItemDto {
  @IsInt()
  @IsOptional()
  lengthInCm?: number;

  @IsInt()
  @IsOptional()
  widthInCm?: number;

  @IsInt()
  @IsOptional()
  heightInCm?: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  userId: number;

  @IsInt()
  friendId: number;

  @IsInt()
  weightInGrams: number;

  @IsInt()
  id: number;

  @IsString()
  @IsOptional()
  imageURL?: string;

  constructor(
    name: string,
    userId: number,
    friendId: number,
    weightInGrams: number,
    id: number,
    lengthInCm?: number,
    widthInCm?: number,
    heightInCm?: number,
    imageURL?: string,
  ) {
    this.name = name;
    this.userId = userId;
    this.friendId = friendId;
    this.weightInGrams = weightInGrams;
    this.id = id;
    this.lengthInCm = lengthInCm;
    this.widthInCm = widthInCm;
    this.heightInCm = heightInCm;
    this.imageURL = imageURL;
  }
}
