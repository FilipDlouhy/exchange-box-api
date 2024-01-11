import {
  IsInt,
  IsArray,
  IsNotEmpty,
  ArrayNotEmpty,
  Min,
} from 'class-validator';

export class DeleteExchangeDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  id: number;

  @IsArray()
  @ArrayNotEmpty()
  item_ids: number[];

  constructor() {
    this.id = 0;
    this.item_ids = [];
  }
}
