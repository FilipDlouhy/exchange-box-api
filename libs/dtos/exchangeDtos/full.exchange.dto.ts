import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExchangeUserDto } from './exchange.user.dto';
import { ItemSimpleDto } from '../itemDtos/item.simple.dto';

export class FullExchangeDto {
  @IsNotEmpty()
  id: number;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;

  @IsOptional()
  @IsDate()
  pickUpDate: Date;

  @IsOptional()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsDate()
  timeElapsedSincePickUpDate: Date;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ItemSimpleDto)
  items: ItemSimpleDto[];

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ExchangeUserDto)
  friend: ExchangeUserDto;

  @IsNotEmpty()
  @IsString()
  boxSize: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  exchangeState: string;

  @IsNumber()
  longitude: number;

  @IsNumber()
  latitude: number;

  constructor(
    id: number,
    createdAt: Date,
    updatedAt: Date,
    pickUpDate: Date,
    price: number,
    timeElapsedSincePickUpDate: Date,
    items: ItemSimpleDto[],
    friend: ExchangeUserDto,
    boxSize: string,
    name: string,
    exchangeState: string,
    longitude: number,
    latitude: number,
  ) {
    this.id = id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.pickUpDate = pickUpDate;
    this.price = price;
    this.timeElapsedSincePickUpDate = timeElapsedSincePickUpDate;
    this.items = items;
    this.friend = friend;
    this.boxSize = boxSize;
    this.name = name;
    this.exchangeState = exchangeState;
    this.longitude = longitude;
    this.latitude = latitude;
  }
}
