import { IsInt } from 'class-validator';

export class ItemSizeDto {
  @IsInt()
  length: number;

  @IsInt()
  width: number;

  @IsInt()
  height: number;

  @IsInt()
  itemId: number;

  constructor(length: number, width: number, height: number, itemId: number) {
    this.length = length;
    this.width = width;
    this.height = height;
    this.itemId = itemId;
  }
}
