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
  frontId: number;
}
