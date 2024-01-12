import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class DeleteExchangeFromFrontDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  id: number;

  @IsNotEmpty()
  box_size: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  center_id: number;

  constructor() {
    this.id = 0;
    this.center_id = 0;
    this.box_size = '';
  }
}
