import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddExchangeToFrontDto {
  @IsNotEmpty()
  pickUpDate: Date;

  @IsNotEmpty()
  size: string;

  @IsInt()
  @Min(1)
  id: number;

  @IsInt()
  @Min(1)
  centerId: number;

  constructor(pickUpDate: Date, id: number, size: string, centerId: number) {
    this.pickUpDate = pickUpDate;
    this.id = id;
    this.size = size;
    this.centerId = centerId;
  }
}
