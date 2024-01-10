import { IsInt, IsString, IsNotEmpty } from 'class-validator';

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

  constructor(itemData: {
    length: number;
    width: number;
    height: number;
    name: string;
    user_id: number;
    friend_id: number;
    weight: number;
    id: number;
  }) {
    Object.assign(this, itemData);
  }
}
