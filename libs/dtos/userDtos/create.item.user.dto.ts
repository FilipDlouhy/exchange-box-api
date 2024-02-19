import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateItemUserDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  imageUrl: string | null;

  constructor({ id, name, imageUrl }: Partial<CreateItemUserDto>) {
    this.id = id;
    this.name = name;
    this.imageUrl = imageUrl;
  }
}
