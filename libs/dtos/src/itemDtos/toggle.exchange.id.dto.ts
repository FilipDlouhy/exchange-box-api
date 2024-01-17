import { ArrayNotEmpty, IsInt, IsNotEmpty } from 'class-validator';

export class ToggleExchangeToItemDto {
  @ArrayNotEmpty()
  @IsInt({ each: true })
  itemIds: number[] = [];

  @IsInt()
  @IsNotEmpty()
  exchangeId: number = 0;

  constructor(itemIds: number[], exchangeId: number) {
    this.itemIds = itemIds;
    this.exchangeId = exchangeId;
  }
}
