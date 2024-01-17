import { IsNotEmpty, IsNumber } from 'class-validator';
import { FrontDto } from '../frontDtos/front.dto';
import { FrontExchangeDto } from '../frontDtos/front.exchange.dto';

export class CenterWithFrontDto {
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @IsNotEmpty()
  id: string;

  @IsNotEmpty()
  frontId: string;

  front: FrontDto | FrontExchangeDto;

  constructor(
    latitude: number,
    longitude: number,
    id: string,
    frontId: string,
    front: FrontDto | FrontExchangeDto,
  ) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.id = id;
    this.frontId = frontId;
    this.front = front;
  }
}
