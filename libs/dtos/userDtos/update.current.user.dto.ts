import { IsNumber, IsString, IsOptional } from 'class-validator';

export class UpdateCurrentUserDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsOptional()
  images?: Array<Express.Multer.File>;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  telephone?: string | null;

  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @IsOptional()
  @IsNumber()
  latitude?: number | null;
}
