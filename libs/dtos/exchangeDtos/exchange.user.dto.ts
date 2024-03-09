import { IsInt, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ExchangeUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsOptional()
  imageURL: string | undefined;

  constructor(name: string, id: number, imageURL?: string) {
    this.name = name;
    this.id = id;
    this.imageURL = imageURL;
  }
}
