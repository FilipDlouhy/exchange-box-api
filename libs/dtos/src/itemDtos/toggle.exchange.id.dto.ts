import { ArrayNotEmpty, IsInt, IsNotEmpty } from 'class-validator';

export class ToggleExchangeToItemDto {
  @ArrayNotEmpty()
  @IsInt({ each: true })
  item_ids: number[] = [];

  @IsInt()
  @IsNotEmpty()
  exchange_id: number = 0;

  constructor(item_ids: number[], exchange_id: number) {
    this.item_ids = item_ids;
    this.exchange_id = exchange_id;
  }
}
