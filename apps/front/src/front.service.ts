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
      const boxTotals = this.generateBoxNumbersWithTotal();
      const { data, error } = await supabase
        .from('front')
        .insert([
          {
            total_number_of_tasks: boxTotals.total,
            number_of_tasks_in_front: 0,
            created_at: new Date(),
            time_to_complete_all_tasks: null,
            center_id: center_id,
            number_of_large_boxes: boxTotals.largeBoxes,
            number_of_medium_boxes: boxTotals.mediumBoxes,
            number_of_small_boxes: boxTotals.smallBoxes,
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

  /**
   * Generates random box numbers for small, medium, and large boxes, calculates their total,
   * and returns the results as an object.
   *
   * @returns - An object containing counts for small, medium, and large boxes,
   * as well as the total count.
   */
  private generateBoxNumbersWithTotal() {
    const smallBoxes = Math.floor(Math.random() * 12) + 1;
    const mediumBoxes = Math.floor(Math.random() * 12) + 1;
    const largeBoxes = Math.floor(Math.random() * 12) + 1;

    // Calculate the total count of boxes.
    const total = smallBoxes + mediumBoxes + largeBoxes;

    return {
      smallBoxes,
      mediumBoxes,
      largeBoxes,
      total,
    };
  }
}
