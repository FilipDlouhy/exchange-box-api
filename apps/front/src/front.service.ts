import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FrontRepository } from './front.repository';
import { DeleteExchangeFromFrontDto } from 'libs/dtos/exchangeDtos/delete.exchange.from.front.dto';
import { Front } from '@app/database/entities/front.entity';

@Injectable()
export class FrontService {
  constructor(private readonly frontRepository: FrontRepository) {}

  /**
   * Creates a new front associated with a given center in the database.
   *
   * @returns {Promise<Front>} - Returns a promise that resolves to the created Front entity.
   */
  async createFront(): Promise<Front> {
    try {
      const boxTotals = this.generateBoxNumbersWithTotal();

      if (!boxTotals) {
        throw new InternalServerErrorException('Failed to generate box totals');
      }

      const newFrontData = {
        totalNumberOfTasks: boxTotals.total,
        numberOfTasksInFront: 0,
        numberOfLargeBoxesTotal: boxTotals.largeBoxes,
        numberOfMediumBoxesTotal: boxTotals.mediumBoxes,
        numberOfSmallBoxesTotal: boxTotals.smallBoxes,
      };

      const newFront = await this.frontRepository.createFront(newFrontData);

      if (!newFront) {
        throw new InternalServerErrorException('Failed to create front');
      }

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
   * @param frontId - The ID of the front.
   * @returns {Promise<void>} - Resolves when the task is successfully added to the front.
   * @throws {NotFoundException} - If the front is not found.
   * @throws {ConflictException} - If the front is full for the specified size.
   * @throws {InternalServerErrorException} - If there is an issue with the front data.
   */
  async addTaskToFront(size: string, frontId: number): Promise<void> {
    try {
      const front = await this.frontRepository.findFrontById(frontId);

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

      await this.frontRepository.saveFront(front);
    } catch (error) {
      console.error('Error in addTaskToFront function:', error);
      throw error;
    }
  }

  /**
   * Deletes a task from the front by updating the corresponding front's data.
   *
   * @param deleteExchangeFromFront - DTO with details to identify the task and front.
   * @returns {Promise<void>} - Resolves when the task is successfully deleted from the front.
   * @throws {NotFoundException} - If the front is not found.
   * @throws {InternalServerErrorException} - If there is an issue with the front data.
   */
  async deleteTaskFromFront(
    deleteExchangeFromFront: DeleteExchangeFromFrontDto,
  ): Promise<void> {
    const size = deleteExchangeFromFront.boxSize;
    const frontId = deleteExchangeFromFront.frontId;

    try {
      const front = await this.frontRepository.findFrontById(frontId);

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

      await this.frontRepository.saveFront(front);
    } catch (error) {
      console.error('Error in deleteTaskFromFront function:', error);
      throw error;
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

    const total = smallBoxes + mediumBoxes + largeBoxes;

    return {
      smallBoxes,
      mediumBoxes,
      largeBoxes,
      total,
    };
  }
}
