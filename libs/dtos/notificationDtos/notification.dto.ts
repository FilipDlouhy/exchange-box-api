import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsDate,
} from 'class-validator';

export class NotificationDto {
  @IsOptional()
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  text: string;

  @IsOptional()
  @IsNotEmpty()
  @IsInt()
  userId: number;

  @IsDate()
  createdAt: Date;

  constructor(id: number, createdAt: Date, userId: number, text: string) {
    this.id = id;
    this.createdAt = createdAt;
    this.userId = userId;
    this.text = text;
  }
}
