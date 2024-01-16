import { IsNotEmpty, IsNumber } from 'class-validator';

export class GetCenterDto {
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}
