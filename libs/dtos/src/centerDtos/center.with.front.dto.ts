import { IsNotEmpty, IsNumber } from 'class-validator';
import { FrontExchangeDto } from '../frontDtos/front.exchange.dto';
import { Front } from '@app/database/entities/front.entity';

export class CenterWithFrontDto {
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @IsNotEmpty()
  id: string;

  front: FrontExchangeDto | Front;

  constructor(
    latitude: number,
    longitude: number,
    id: string,
    front: FrontExchangeDto | Front,
  ) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.id = id;
    this.front = front;
  }
}
