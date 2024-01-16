import { IsNotEmpty, IsNumber } from 'class-validator';

export class CenterDto {
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @IsNotEmpty()
  id: string;

  constructor(latitude: number, longitude: number, id: string) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.id = id;
  }
}
