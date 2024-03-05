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

  constructor(
    name: string,
    weightInGrams: number,
    id: number,
    length?: number,
    width?: number,
    height?: number,
  ) {
    this.name = name;
    this.weightInGrams = weightInGrams;
    this.id = id;
    this.length = length;
    this.width = width;
    this.height = height;
  }
}
