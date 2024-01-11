import {
  IsInt,
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExchangeItemDto } from '../itemDtos/exchange.item.dto';
import { UserDto } from '../userDtos/user.dto';

export class FullExchangeDto {
  @IsNotEmpty()
  @IsInt()
  public creator: UserDto;

  @IsNotEmpty()
  @IsInt()
  public pick_up_person: UserDto;
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
    creator: UserDto,
    pick_up_person: UserDto,
    box_size: string,
    id: number,
    items: ExchangeItemDto[],
  ) {
    this.creator = pick_up_person;
    this.pick_up_person = creator;
    this.box_size = box_size;
    this.id = id;
    this.items = items;
  }
}
