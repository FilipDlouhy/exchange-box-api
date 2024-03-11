import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FrontDto } from '../frontDtos/front.dto';

export class CenterDto {
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @IsNotEmpty()
  id: string;

  @ValidateNested()
  @Type(() => FrontDto)
  front: FrontDto;

  constructor(
    latitude: number,
    longitude: number,
    id: string,
    front: FrontDto,
  ) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.id = id;
    this.front = front;
  }
}
