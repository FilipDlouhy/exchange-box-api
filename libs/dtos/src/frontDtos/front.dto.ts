import { IsInt, IsDate } from 'class-validator';

export class FrontDto {
  @IsInt()
  id: number;

  @IsInt()
  center_id: number;

  @IsDate()
  created_at: Date;

  @IsInt()
  total_number_of_tasks: number;

  @IsInt()
  number_of_tasks_in_front: number;

  @IsInt()
  number_of_medium_boxes: number;

  @IsInt()
  number_of_large_boxes: number;

  @IsInt()
  number_of_small_boxes: number;

  @IsInt()
  number_of_medium_boxes_total: number;

  @IsInt()
  number_of_large_boxes_total: number;

  @IsInt()
  number_of_small_boxes_total: number;
}
