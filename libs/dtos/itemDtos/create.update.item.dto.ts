import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUpdateItemDto {
  @IsString()
  @IsNotEmpty()
  length: string = '0';

  @IsString()
  @IsNotEmpty()
  width: string = '0';

  @IsString()
  @IsNotEmpty()
  height: string = '0';

  @IsString()
  @IsNotEmpty()
  name: string = '';

  @IsString()
  @IsNotEmpty()
  userId: string = '0';

  @IsString()
  @IsNotEmpty()
  friendId: string = '0';

  @IsString()
  @IsNotEmpty()
  weight: string = '0';

  @IsString()
  id?: string = '0';

  images?: any;
}
