import {
  IsInt,
  IsArray,
  IsNotEmpty,
  ArrayNotEmpty,
  Min,
} from 'class-validator';

export class CreateExchangeDto {
  @IsNotEmpty()
  @IsInt()
  public creatorId: number;

  @IsNotEmpty()
  @IsInt()
  public pickUpPersonId: number;

  @IsNotEmpty()
  public boxSize: string;

  @ArrayNotEmpty()
  public itemIds: number[];

  constructor() {
    this.creatorId = 0;
    this.pickUpPersonId = 0;
    this.boxSize = '';
    this.itemIds = [];
  }
}
