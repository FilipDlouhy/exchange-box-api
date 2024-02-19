import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ItemDto {
  @IsInt()
  @IsOptional()
  length?: number;

  @IsInt()
  @IsOptional()
  width?: number;

  @IsInt()
  @IsOptional()
  height?: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

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
    ownerName: string,
    userId: number,
    friendId: number,
    weightInGrams: number,
    id: number,
    length?: number,
    width?: number,
    height?: number,
    imageURL?: string,
  ) {
    this.name = name;
    this.ownerName = ownerName;
    this.userId = userId;
    this.friendId = friendId;
    this.weightInGrams = weightInGrams;
    this.id = id;
    this.length = length;
    this.width = width;
    this.height = height;
    this.imageURL = imageURL;
  }
}
