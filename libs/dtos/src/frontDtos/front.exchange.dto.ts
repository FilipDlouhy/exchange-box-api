import { IsInt } from 'class-validator';

export class FrontExchangeDto {
  @IsInt()
  id: number;

  @IsInt()
  number_of_tasks_in_front: number;

  @IsInt()
  number_of_medium_boxes: number;

  @IsInt()
  number_of_large_boxes: number;

  @IsInt()
  number_of_small_boxes: number;

  constructor(
    id: number,
    number_of_medium_boxes: number,
    number_of_large_boxes: number,
    number_of_small_boxes: number,
  ) {
    this.id = id;
    this.number_of_medium_boxes = number_of_medium_boxes;
    this.number_of_large_boxes = number_of_large_boxes;
    this.number_of_small_boxes = number_of_small_boxes;
  }
}
