import {
  IsInt,
  IsArray,
  IsNotEmpty,
  ArrayNotEmpty,
  Min,
} from 'class-validator';

export class UpdateExchangeDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  pick_up_person_id: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  id: number;

  @IsNotEmpty()
  box_size: string;

  @IsArray()
  @ArrayNotEmpty()
  item_ids: number[];

  constructor() {
    this.pick_up_person_id = 0;
    this.id = 0;
    this.box_size = '';
    this.item_ids = [];
  }
}
