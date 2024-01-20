import { Front } from '@app/database/entities/front.entity';
import { DeleteExchangeFromFrontDto } from '@app/dtos/exchangeDtos/delete.exchange.from.front.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class FrontService {
  constructor(
    @InjectRepository(Front)
    private readonly frontRepository: Repository<Front>,
    private readonly entityManager: EntityManager,
  ) {}
  /**
   * Creates a new front associated with a given center in the database.
   *
   * @param {number} center_id - The ID of the center to which the front is associated.
   * @returns {Promise<boolean>} - Returns a promise that resolves to `true` if the front is successfully created.
   */
  async createFront(): Promise<Front> {
    try {
      const boxTotals = this.generateBoxNumbersWithTotal();

      const newFront = this.frontRepository.create({
        totalNumberOfTasks: boxTotals.total,
        numberOfTasksInFront: 0,
        numberOfLargeBoxesTotal: boxTotals.largeBoxes,
        numberOfMediumBoxesTotal: boxTotals.mediumBoxes,
        numberOfSmallBoxesTotal: boxTotals.smallBoxes,
      });

      await this.frontRepository.save(newFront);

      return newFront;
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
  async getFrontForTask(size: string, frontId: number): Promise<Front> {
    try {
      // Using the repository to find the front with the given center ID
      const front = await this.frontRepository.findOne({
        where: { id: frontId },
      });

      // Check if the front exists and if there's room for another box,
      if (
        !front ||
        front[`numberOf${size}Boxes`] + 1 > front[`numberOf${size}BoxesTotal`]
      ) {
        throw new Error('Center is full. Try different size or center');
      }
      front[`numberOf${size}Boxes`] = front[`numberOf${size}Boxes`] + 1;

      const updatedFront = await this.frontRepository.save(front);

      // Return the front ID
      return updatedFront;
    } catch (error) {
      console.error('Error getting front for task:', error);
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
  ): Promise<boolean> {
    const size = deleteExchnageFromFront.boxSize;
    const frontId = deleteExchnageFromFront.frontId;

    try {
      // Fetch the current data
      const front = await this.frontRepository.findOne({
        where: { id: frontId },
      });
      if (!front) {
        throw new Error('Front not found');
      }

      front[`numberOf${size}Boxes`] = front[`numberOf${size}Boxes`] - 1;
      front.numberOfTasksInFront = front.numberOfTasksInFront - 1;
      // Compute updated values

      // Update the 'front' entity
      await this.frontRepository.save(front);

      return true;
    } catch (err) {
      console.error(err);
      return false;
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
