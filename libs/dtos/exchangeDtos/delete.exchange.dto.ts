import { IsInt, IsNotEmpty, ArrayNotEmpty } from 'class-validator';

export class DeleteExchangeDto {
  @IsNotEmpty()
  @IsInt()
  public id: number;

  @ArrayNotEmpty()
  public itemIds: number[];

  constructor() {
    this.id = 0;
    this.itemIds = [];
  }
}
