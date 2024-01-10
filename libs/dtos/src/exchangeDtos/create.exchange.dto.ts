import {
  IsInt,
  IsArray,
  IsNotEmpty,
  ArrayNotEmpty,
  Min,
} from 'class-validator';

export class CreateExchangeDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  creator_id: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  pick_up_person_id: number;

  @IsNotEmpty()
  box_size: string;

  @IsArray()
  @ArrayNotEmpty()
  item_ids: number[];

  constructor() {
    this.creator_id = 0;
    this.pick_up_person_id = 0;
    this.box_size = '';
    this.item_ids = [];
  }
}
