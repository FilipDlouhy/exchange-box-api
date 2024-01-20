import { IsInt, IsNotEmpty, Min, IsArray } from 'class-validator';

export class DeleteExchangeFromFrontDto {
  @IsNotEmpty()
  @IsInt()
  public id: number;

  @IsNotEmpty()
  public boxSize: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  public frontId: number;

  @IsNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  public itemIds: number[];

  constructor() {
    this.id = 0;
    this.frontId = 0;
    this.boxSize = '';
    this.itemIds = [];
  }
}
