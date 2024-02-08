import {
  IsInt,
  IsArray,
  IsNotEmpty,
  ArrayNotEmpty,
  Min,
} from 'class-validator';

export class UpdateExchangeDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  pickUpPersonId: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  id: number;

  @IsNotEmpty()
  boxSize: string;

  @IsArray()
  @ArrayNotEmpty()
  itemIds: number[];

  constructor() {
    this.pickUpPersonId = 0;
    this.id = 0;
    this.boxSize = '';
    this.itemIds = [];
  }
}
