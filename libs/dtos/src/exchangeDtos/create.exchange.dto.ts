import { IsInt, IsNotEmpty, ArrayNotEmpty } from 'class-validator';

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
}
