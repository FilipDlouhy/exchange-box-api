import { IsInt, IsDate, IsString } from 'class-validator';

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

  @IsString()
  time_to_complete_all_tasks: string | null;
}
