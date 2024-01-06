export class FrontDto {
  id: number;
  center_id: number;
  created_at: Date;
  total_number_of_tasks: number;
  number_of_tasks_in_front: number;
  time_to_complete_all_tasks: string | null;
}
