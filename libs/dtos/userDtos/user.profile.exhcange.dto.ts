import {
  IsInt,
  IsNotEmpty,
  IsDate,
  IsOptional,
  IsString,
} from 'class-validator';

export class UserProfileExhnageDto {
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
  public friendName: string;

  @IsNotEmpty()
  @IsString()
  public exchangeName: string;

  @IsNotEmpty()
  @IsInt()
  public id: number;

  @IsOptional()
  @IsDate()
  public pickUpDate: Date | null;

  @IsNotEmpty()
  @IsString()
  public exchangeState: string;

  constructor(
    creatorId: number,
    pickUpPersonId: number,
    numberOfItems: number,
    id: number,
    pickUpDate: Date | null = null,
    friendName: string,
    exchangeName: string,
    exchangeState: string,
  ) {
    this.creatorId = creatorId;
    this.pickUpPersonId = pickUpPersonId;
    this.numberOfItems = numberOfItems;
    this.id = id;
    this.friendName = friendName;
    this.exchangeName = exchangeName;
    this.pickUpDate = new Date(pickUpDate);
    this.exchangeState = exchangeState;
  }
}
