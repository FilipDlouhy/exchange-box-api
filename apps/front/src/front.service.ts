import { supabase } from '@app/tables';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FrontService {
  /**
   * Creates a new front associated with a given center in the database.
   *
   * @param {number} center_id - The ID of the center to which the front is associated.
   * @returns {Promise<boolean>} - Returns a promise that resolves to `true` if the front is successfully created.
   */
  async createFront(center_id: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('front')
        .insert([
          {
            total_number_of_tasks: Math.floor(Math.random() * 30) + 1,
            number_of_tasks_in_front: 0,
            created_at: new Date(),
            time_to_complete_all_tasks: null,
            center_id: center_id,
          },
        ])
        .select('id')
        .single();

      if (error) {
        console.error('Error creating front:', error);
        throw new Error('Failed to create the front');
      }

      return true;
    } catch (err) {
      console.error('Error in createFront function:', err);
      throw err;
    }
  }
}
