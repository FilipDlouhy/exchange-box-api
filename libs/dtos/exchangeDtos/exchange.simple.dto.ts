import {
  IsInt,
  IsNotEmpty,
  IsDate,
  IsOptional,
  IsString,
} from 'class-validator';

export class ExchangeSimpleDto {
  @IsNotEmpty()
  @IsInt()
  public creatorId: number;

  @IsNotEmpty()
  @IsInt()
  public pickUpPersonId: number;

  @IsNotEmpty()
  @IsInt()
  public numberOfItems: number;

  @IsNotEmpty()
  @IsString()
  public friendImgUrl: string;

  @IsNotEmpty()
  @IsString()
  public friendName: string;

  @IsNotEmpty()
  @IsString()
  public exchangeNBame: string;

  @IsNotEmpty()
  @IsInt()
  public id: number;

  @IsOptional()
  @IsDate()
  public pickUpDate: Date | null;

  constructor(
    creatorId: number,
    pickUpPersonId: number,
    numberOfItems: number,
    id: number,
    pickUpDate: Date | null = null,
    friendImgUrl: string,
    friendName: string,
    exchangeNBame: string,
  ) {
    this.creatorId = creatorId;
    this.pickUpPersonId = pickUpPersonId;
    this.numberOfItems = numberOfItems;
    this.id = id;
    this.friendImgUrl = friendImgUrl;
    this.friendName = friendName;
    this.exchangeNBame = exchangeNBame;
    this.pickUpDate = pickUpDate;
  }
}
