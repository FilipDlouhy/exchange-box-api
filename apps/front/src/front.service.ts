import { AddExchangeToFrontDto } from '@app/dtos/exchangeDtos/add.exchange.to.front..dto';
import { DeleteExchangeFromFrontDto } from '@app/dtos/exchangeDtos/delete.exchange.from.front.dto';
import { supabase } from '@app/database';
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
            center_id: center_id,
            number_of_large_boxes_total: boxTotals.largeBoxes,
            number_of_medium_boxes_total: boxTotals.mediumBoxes,
            number_of_small_boxes_total: boxTotals.smallBoxes,
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
   * Retrieves the front ID for a task based on the size and center_id.
   * It checks if the center has available capacity for the specified size of boxes.
   *
   * @param size - The size of the box.
   * @param center_id - The ID of the center.
   * @returns The ID of the front.
   * @throws Error if the data fetch fails or if the center is full for the specified size.
   */
  async getFrontForTask(size: string, center_id: number): Promise<number> {
    try {
      // Fetch the current box counts and the front ID from the 'front' table
      const { data, error } = await supabase
        .from('front')
        .select(`number_of_${size}_boxes, number_of_${size}_boxes_total, id`)
        .eq('center_id', center_id)
        .limit(1)
        .single();

      // Check for any errors in fetching the data
      if (error || !data) {
        throw new Error('Error fetching data or front does not exist.');
      }

      const front = data as any;

      if (
        front[`number_of_${size}_boxes`] + 1 >
        front[`number_of_${size}_boxes_total`]
      ) {
        throw new Error('Center is full. Try different size or center');
      }

      // Return the front ID
      return front.id;
    } catch (error) {
      console.error('Error getting front for task:', error);
      throw error;
    }
  }

  /**
   * Adds a task to the front for a given exchange. It increments the number of boxes
   * and tasks in the front and updates the time to complete all tasks.
   *
   * @param addExchangeToTheFront - The data transfer object containing the details of the exchange to be added.
   * @returns A boolean indicating successful addition of the task.
   */
  async addTaskToFront(
    addExchangeToTheFront: AddExchangeToFrontDto,
  ): Promise<boolean> {
    try {
      // Fetch the current values from the 'front' table for the given center_id
      const { data: currentData, error: fetchError } = await supabase
        .from('front')
        .select()
        .eq('center_id', addExchangeToTheFront.center_id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Ensure pick_up_date is a Date object and calculate the updated values
      const updatedValues = {
        [`number_of_${addExchangeToTheFront.size}_boxes`]:
          (currentData[`number_of_${addExchangeToTheFront.size}_boxes`] ?? 0) +
          1,
        number_of_tasks_in_front:
          (currentData.number_of_tasks_in_front ?? 0) + 1,
      };

      // Update the 'front' table with the new values
      const { error: updateError } = await supabase
        .from('front')
        .update(updatedValues)
        .eq('center_id', addExchangeToTheFront.center_id)
        .single();

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (error) {
      console.error('Error adding task to front:', error);
      // Handle the error appropriately
      throw error;
    }
  }

  /**
   * Deletes a task from the front by updating the corresponding front's data.
   *
   * @param deleteExchnageFromFront - DTO with details to identify the task and front.
   * @returns True if the task is successfully deleted from the front, false otherwise.
   */
  async deleteTaskFromFront(
    deleteExchnageFromFront: DeleteExchangeFromFrontDto,
  ) {
    const size = deleteExchnageFromFront.box_size;
    const center_id = deleteExchnageFromFront.center_id;

    try {
      // Fetch the current data
      const { data: currentData, error: fetchError } = await supabase
        .from('front')
        .select(`number_of_${size}_boxes, number_of_tasks_in_front`)
        .eq('center_id', center_id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const front = currentData as any;

      // Compute updated values
      const updatedValues = {
        [`number_of_${size}_boxes`]: Math.max(
          (currentData[`number_of_${size}_boxes`] ?? 0) - 1,
          0,
        ),
        number_of_tasks_in_front: Math.max(
          (front.number_of_tasks_in_front ?? 0) - 1,
          0,
        ),
      };

      // Update the 'front' table
      const { error: updateError } = await supabase
        .from('front')
        .update(updatedValues)
        .eq('center_id', center_id);

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  /**
   * Asynchronously retrieves the center ID associated with a given front ID from the database.
   * Queries the 'center' table and returns the center's ID.
   *
   * @param {number} id - Front ID for which the center ID is fetched.
   * @returns {Promise<number>} Resolves to the center's ID.
   */
  async getCenterIdByFront(id: number): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('center')
        .select('id')
        .eq('front_id', id)
        .single();

      if (error) {
        throw new Error(`Error fetching center ID: ${error.message}`);
      }

      return parseInt(data.id.toString());
    } catch (error) {
      console.error('Error in getCenterIdByFront function:', error);
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
