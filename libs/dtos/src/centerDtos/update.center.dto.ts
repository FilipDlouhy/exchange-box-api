import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateCenterDto {
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @IsNotEmpty()
  @IsNumber()
  id: number;
}
