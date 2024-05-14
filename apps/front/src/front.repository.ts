import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Front } from '@app/database/entities/front.entity';

@Injectable()
export class FrontRepository {
  constructor(
    @InjectRepository(Front)
    private readonly frontRepository: Repository<Front>,
  ) {}

  /**
   * Creates a new front entity in the database.
   *
   * @param {Partial<Front>} frontData - Partial data to create a new Front entity.
   * @returns {Promise<Front>} - The created Front entity.
   */
  async createFront(frontData: Partial<Front>): Promise<Front> {
    const newFront = this.frontRepository.create(frontData);
    return this.frontRepository.save(newFront);
  }

  /**
   * Finds a front entity by its ID.
   *
   * @param {number} id - The ID of the front to find.
   * @returns {Promise<Front>} - The found Front entity, or null if not found.
   */
  async findFrontById(id: number): Promise<Front> {
    return this.frontRepository.findOne({ where: { id } });
  }

  /**
   * Saves a front entity to the database.
   *
   * @param {Front} front - The Front entity to save.
   * @returns {Promise<Front>} - The saved Front entity.
   */
  async saveFront(front: Front): Promise<Front> {
    return this.frontRepository.save(front);
  }
}
