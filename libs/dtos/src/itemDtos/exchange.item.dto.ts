import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class ExchangeItemDto {
  @IsInt()
  @IsNotEmpty()
  lengthInCm: number;

  @IsInt()
  @IsNotEmpty()
  widthInCm: number;

  @IsInt()
  @IsNotEmpty()
  heightInCm: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  weightInGrams: number;

  @IsInt()
  @IsNotEmpty()
  id: number;

  constructor(itemData: {
    length: number;
    width: number;
    height: number;
    name: string;
    weight: number;
    id: number;
  }) {
    this.name = itemData.name;
    this.lengthInCm = itemData.length;
    this.widthInCm = itemData.width;
    this.heightInCm = itemData.height;
    this.weightInGrams = itemData.weight;
    this.id = itemData.id;
  }
}
