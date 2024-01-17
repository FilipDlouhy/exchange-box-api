import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class DeleteExchangeFromFrontDto {
  @IsNotEmpty()
  @IsInt()
  public id: number;

  @IsNotEmpty()
  public boxSize: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  public centerId: number;

  constructor() {
    this.id = 0;
    this.centerId = 0;
    this.boxSize = '';
  }
}
