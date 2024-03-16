import {
  IsInt,
  IsNotEmpty,
  ArrayNotEmpty,
  IsString,
  IsNumber,
  IsDate,
} from 'class-validator';

export class CreateUpdateExchangeDto {
  @IsNotEmpty()
  @IsInt()
  public creatorId: number;

  @IsNotEmpty()
  @IsInt()
  public pickUpPersonId: number;

  @IsString()
  @IsNotEmpty()
  public boxSize: string;

  @IsString()
  @IsNotEmpty()
  public name: string;

  @IsString({ each: true })
  @ArrayNotEmpty()
  public itemIds: number[];

  @IsNumber()
  @IsNotEmpty()
  public centerId: number;

  @IsDate()
  @IsNotEmpty()
  public pickUpDate: Date;
}
