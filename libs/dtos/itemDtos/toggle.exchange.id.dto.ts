import { Exchange } from '../../database/src/entities/exchange.entity';
import { ArrayNotEmpty, IsInt, IsNotEmpty } from 'class-validator';

export class ToggleExchangeToItemDto {
  @ArrayNotEmpty()
  @IsInt({ each: true })
  itemIds: number[] = [];

  @IsInt()
  @IsNotEmpty()
  exchange: Exchange;

  constructor(itemIds: number[], exchange: Exchange) {
    this.itemIds = itemIds;
    this.exchange = exchange;
  }
}
