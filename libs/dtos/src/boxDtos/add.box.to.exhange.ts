import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddBoxToExchangeDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  exchange_id: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  front_id: number;

  @IsNotEmpty()
  box_size: string;

  @IsNotEmpty()
  pick_up_date: Date;

  constructor(
    exchange_id: number,
    front_id: number,
    pick_up_date: Date,
    box_size: string,
  ) {
    this.exchange_id = exchange_id;
    this.front_id = front_id;
    this.pick_up_date = pick_up_date;
    this.box_size = box_size;
  }
}
