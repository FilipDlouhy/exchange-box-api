import {
  IsInt,
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExchangeItemDto } from '../itemDtos/exchange.item.dto';

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
  @Type(() => ExchangeItemDto)
  public items: ExchangeItemDto[];

  @IsNotEmpty()
  @IsInt()
  public id: number;

  constructor(
    creatorId: number,
    pickUpPersonId: number,
    boxSize: string,
    items: ExchangeItemDto[],
    id: number,
  ) {
    this.creatorId = creatorId;
    this.pickUpPersonId = pickUpPersonId;
    this.boxSize = boxSize;
    this.items = items;
    this.id = id;
  }
}
