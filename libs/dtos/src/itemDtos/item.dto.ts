import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ItemDto {
  @IsInt()
  lengthInCm: number;

  @IsInt()
  widthInCm: number;

  @IsInt()
  heightInCm: number;

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
  imageURL: string | undefined;

  updatedAt: Date;

  constructor(itemData: {
    length: number;
    width: number;
    height: number;
    name: string;
    userId: number;
    friendId: number;
    weight: number;
    id: number;
    imageURL?: string;
    updatedAt: Date;
  }) {
    Object.assign(this, itemData);
  }
}
