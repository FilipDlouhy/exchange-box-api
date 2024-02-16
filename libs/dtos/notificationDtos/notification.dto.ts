import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsDate,
  IsBoolean,
} from 'class-validator';

export class NotificationDto {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsNotEmpty()
  @IsString()
  text: string;

  @IsNotEmpty()
  @IsString()
  initials: string;

  @IsNotEmpty()
  @IsInt()
  userId: number;

  @IsDate()
  createdAt: Date;

  @IsBoolean()
  seen: boolean;

  constructor(
    id: number,
    createdAt: Date,
    userId: number,
    text: string,
    initials: string,
    seen: boolean,
  ) {
    this.id = id;
    this.createdAt = createdAt;
    this.userId = userId;
    this.text = text;
    this.initials = initials;
    this.seen = seen;
  }
}
