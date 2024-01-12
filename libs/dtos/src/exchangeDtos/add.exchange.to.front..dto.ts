import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddExchangeToFrontDto {
  @IsNotEmpty()
  pick_up_date: Date;

  @IsNotEmpty()
  size: string;

  @IsInt()
  @Min(1)
  id: number;

  @IsInt()
  @Min(1)
  center_id: number;

  constructor(pick_up_date: Date, id: number, size: string, center_id: number) {
    this.pick_up_date = pick_up_date;
    this.id = id;
    this.size = size;
    this.center_id = center_id;
  }
}
