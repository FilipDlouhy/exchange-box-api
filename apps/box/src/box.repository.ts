import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Box } from '@app/database/entities/box.entity';

@Injectable()
export class BoxRepository {
  constructor(
    @InjectRepository(Box)
    private readonly boxRepository: Repository<Box>,
  ) {}

  /**
   * Retrieves all boxes that have a non-null 'timeToPutInBox' field.
   * This method is used to find boxes that are scheduled for item placement.
   * @returns {Promise<Box[]>} - A promise that resolves to an array of Box entities.
   */
  async findBoxesWithTimeToPutInBoxNotNull(): Promise<Box[]> {
    return this.boxRepository.find({
      where: {
        timeToPutInBox: Not(IsNull()),
      },
    });
  }

  /**
   * Saves a box entity to the database.
   * This method is used for both creating new boxes and updating existing ones.
   * @param {Box} box - The Box entity to be saved.
   * @returns {Promise<Box>} - A promise that resolves to the saved Box entity.
   */
  async saveBox(box: Box): Promise<Box> {
    return this.boxRepository.save(box);
  }

  /**
   * Finds a box by its ID.
   * This method retrieves a box entity from the database based on the provided ID.
   * @param {number} id - The ID of the box to find.
   * @returns {Promise<Box>} - A promise that resolves to the found Box entity, or null if not found.
   */
  async findBoxById(id: number): Promise<Box> {
    return this.boxRepository.findOne({ where: { id } });
  }

  /**
   * Deletes a box by its ID.
   * This method removes a box entity from the database based on the provided ID.
   * @param {number} boxId - The ID of the box to delete.
   * @returns {Promise<void>} - A promise that resolves when the box has been deleted.
   */
  async deleteBoxById(boxId: number): Promise<void> {
    await this.boxRepository.delete(boxId);
  }
}
