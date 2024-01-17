import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddBoxToExchangeDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  exchangeId: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  frontId: number;

  @IsNotEmpty()
  boxSize: string;

  @IsNotEmpty()
  pickUpDate: Date;

  constructor(
    exchangeId: number,
    frontId: number,
    pickUpDate: Date,
    boxSize: string,
  ) {
    this.exchangeId = exchangeId;
    this.frontId = frontId;
    this.pickUpDate = pickUpDate;
    this.boxSize = boxSize;
  }
}
