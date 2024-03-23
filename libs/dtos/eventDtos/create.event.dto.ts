import { IsDate, IsString, IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsDate()
  @Type(() => Date)
  fromTime: Date;

  @IsDate()
  @Type(() => Date)
  toTime: Date;

  @IsString()
  @IsNotEmpty()
  eventName: string;

  @IsString()
  @IsNotEmpty()
  eventDescription: string;

  @IsInt()
  @IsNotEmpty()
  userId: number;

  constructor(
    fromTime: Date,
    toTime: Date,
    eventName: string,
    userId: number,
    eventDescription: string,
  ) {
    this.fromTime = fromTime;
    this.toTime = toTime;
    this.eventName = eventName;
    this.userId = userId;
    this.eventDescription = eventDescription;
  }
}
