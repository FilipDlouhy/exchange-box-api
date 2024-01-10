import { IsInt } from 'class-validator';

export class ItemSizeDto {
  @IsInt()
  length: number;

  @IsInt()
  width: number;

  @IsInt()
  height: number;

  @IsInt()
  item_id: number;

  constructor(length: number, width: number, height: number, item_id: number) {
    this.length = length;
    this.width = width;
    this.height = height;
    this.item_id = item_id;
  }
}
