import {
  IsInt,
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsDate,
  IsOptional,
} from 'class-validator';
import { Item } from '@app/database/entities/item.entity';

export class ExchangeDto {
  @IsNotEmpty()
  @IsInt()
  public creatorId: number;

  @IsNotEmpty()
  @IsInt()
  public pickUpPersonId: number;

  @IsNotEmpty()
  @IsString()
  public boxSize: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  public items: Item[];

  @IsNotEmpty()
  @IsInt()
  public id: number;

  @IsOptional()
  @IsDate()
  public pickUpDate: Date | null;

  constructor(
    creatorId: number,
    pickUpPersonId: number,
    boxSize: string,
    items: Item[],
    id: number,
    pickUpDate: Date | null = null,
  ) {
    this.creatorId = creatorId;
    this.pickUpPersonId = pickUpPersonId;
    this.boxSize = boxSize;
    this.items = items;
    this.id = id;
    this.pickUpDate = pickUpDate;
  }
}
