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
  public creator_id: number;

  @IsNotEmpty()
  @IsInt()
  public pick_up_person_id: number;

  @IsNotEmpty()
  @IsString()
  public box_size: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeItemDto)
  public items: ExchangeItemDto[];

  @IsNotEmpty()
  @IsInt()
  public id: number;

  constructor(
    creator_id: number,
    pick_up_person_id: number,
    box_size: string,
    items: ExchangeItemDto[],
    id: number,
  ) {
    this.creator_id = creator_id;
    this.pick_up_person_id = pick_up_person_id;
    this.box_size = box_size;
    this.items = items;
    this.id = id;
  }
}
