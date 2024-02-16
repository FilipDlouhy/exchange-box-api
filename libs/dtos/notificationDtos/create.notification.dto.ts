import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsInt()
  userId: number;

  @IsNotEmpty()
  @IsString()
  nameOfTheService: string;

  @IsNotEmpty()
  @IsString()
  text: string;

  @IsNotEmpty()
  @IsString()
  initials: string;
}
