import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class ItemSimpleDto {
  @IsInt()
  length: number;

  @IsInt()
  width: number;

  @IsInt()
  height: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  weightInGrams: number;

  @IsInt()
  id: number;

  @IsString()
  imageUrl?: string;

  constructor(
    name: string,
    weightInGrams: number,
    id: number,
    length?: number,
    width?: number,
    height?: number,
    imageUrl?: string,
  ) {
    this.name = name;
    this.weightInGrams = weightInGrams;
    this.id = id;
    this.length = length;
    this.width = width;
    this.height = height;
    this.imageUrl = imageUrl;
  }
}
