import { Front } from '@app/database/entities/front.entity';
import { DeleteExchangeFromFrontDto } from 'libs/dtos/exchangeDtos/delete.exchange.from.front.dto';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class FrontService {
  constructor(
    @InjectRepository(Front)
    private readonly frontRepository: Repository<Front>,
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

      if (!boxTotals) {
        throw new InternalServerErrorException('Failed to generate box totals');
      }

      const newFront = this.frontRepository.create({
        totalNumberOfTasks: boxTotals.total,
        numberOfTasksInFront: 0,
        numberOfLargeBoxesTotal: boxTotals.largeBoxes,
        numberOfMediumBoxesTotal: boxTotals.mediumBoxes,
        numberOfSmallBoxesTotal: boxTotals.smallBoxes,
      });

      if (!newFront) {
        throw new InternalServerErrorException('Failed to create front');
      }

      await this.frontRepository.save(newFront);

      return newFront;
    } catch (error) {
      console.error('Error in createFront function:', error);
      throw error;
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
  async addTaskToFront(size: string, frontId: number) {
    try {
      // Using the repository to find the front with the given center ID
      const front = await this.frontRepository.findOne({
        where: { id: frontId },
      });

      if (!front) {
        throw new NotFoundException(`Front with ID ${frontId} not found`);
      }

      if (
        typeof front[`numberOf${size}Boxes`] !== 'number' ||
        isNaN(front[`numberOf${size}Boxes`])
      ) {
        throw new InternalServerErrorException(
          `Invalid ${size} box count in front`,
        );
      }

      if (
        typeof front[`numberOf${size}BoxesTotal`] !== 'number' ||
        isNaN(front[`numberOf${size}BoxesTotal`])
      ) {
        throw new InternalServerErrorException(
          `Invalid total ${size} box count in front`,
        );
      }

      if (
        front[`numberOf${size}Boxes`] + 1 >
        front[`numberOf${size}BoxesTotal`]
      ) {
        throw new ConflictException(
          `Front with ID ${frontId} is full for ${size} boxes`,
        );
      }

      front[`numberOf${size}Boxes`] += 1;

      await this.frontRepository.save(front);
    } catch (error) {
      console.error('Error in addTaskToFront function:', error);
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
        throw new NotFoundException(`Front with ID ${frontId} not found`);
      }

      if (
        typeof front[`numberOf${size}Boxes`] !== 'number' ||
        isNaN(front[`numberOf${size}Boxes`])
      ) {
        throw new InternalServerErrorException(
          `Invalid ${size} box count in front`,
        );
      }

      if (
        typeof front.numberOfTasksInFront !== 'number' ||
        isNaN(front.numberOfTasksInFront)
      ) {
        throw new InternalServerErrorException('Invalid task count in front');
      }

      front[`numberOf${size}Boxes`] = Math.max(
        front[`numberOf${size}Boxes`] - 1,
        0,
      );
      front.numberOfTasksInFront = Math.max(front.numberOfTasksInFront - 1, 0);

      // Update the 'front' entity
      await this.frontRepository.save(front);

      return true;
    } catch (err) {
      console.error('Error in deleteTaskFromFront function:', err);
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
