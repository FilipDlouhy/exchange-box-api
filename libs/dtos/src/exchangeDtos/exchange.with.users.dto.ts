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

export class ExchangeWithUserDto {
  @IsNotEmpty()
  @IsInt()
  public creator: UserDto;

  @IsNotEmpty()
  @IsInt()
  public pickUpPerson: UserDto;

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
    creator: UserDto,
    pickUpPerson: UserDto,
    boxSize: string,
    id: number,
  ) {
    this.creator = creator;
    this.pickUpPerson = pickUpPerson;
    this.boxSize = boxSize;
    this.id = id;
  }
}
