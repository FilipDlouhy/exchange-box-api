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
  user_id: number;

  @IsInt()
  friend_id: number;

  @IsInt()
  weightInGrams: number;

  @IsInt()
  id: number;

  @IsString()
  @IsOptional()
  imageURL: string | undefined;

  constructor(itemData: {
    length: number;
    width: number;
    height: number;
    name: string;
    user_id: number;
    friend_id: number;
    weight: number;
    id: number;
    imageURL?: string;
  }) {
    Object.assign(this, itemData);
  }
}
