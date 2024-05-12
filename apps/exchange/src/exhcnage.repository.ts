import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Exchange } from '../../../libs/database/src/entities/exchange.entity';

@Injectable()
export class ExchangeRepository {
  constructor(
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
  ) {}

  /**
   * Finds a single Exchange entity based on its identifier and the specified relations.
   * @param id The unique identifier of the Exchange entity to find.
   * @param relations An array of strings that specify which related entities to load along with the Exchange.
   * @returns A Promise that resolves to an Exchange entity or undefined if no entity is found.
   */
  async findOneByIdAndRelations(
    id: number,
    relations: string[],
  ): Promise<Exchange | undefined> {
    try {
      return await this.exchangeRepository.findOne({
        where: { id: id },
        relations: relations,
      });
    } catch (error) {
      console.error(`Failed to find exchange with ID ${id}: ${error.message}`);
      throw new Error('Database operation failed');
    }
  }

  /**
   * Saves the given Exchange entity in the database.
   * @param exchange The Exchange entity to save.
   * @returns The saved Exchange entity, including any automatically generated ID (useful for inserts).
   */
  async saveExchange(exchange: Exchange): Promise<Exchange> {
    try {
      return await this.exchangeRepository.save(exchange);
    } catch (error) {
      console.error(`Failed to save exchange: ${error.message}`);
      throw new Error('Database operation failed');
    }
  }

  /**
   * Finds an Exchange entity based only on its ID, without loading any related entities.
   * @param id The unique identifier of the Exchange entity to find.
   * @returns A Promise that resolves to an Exchange entity or undefined if no entity is found.
   */
  async findById(id: number) {
    try {
      return await this.exchangeRepository.findOne({ where: { id: id } });
    } catch (error) {
      console.error(`Failed to find exchange with ID ${id}: ${error.message}`);
      throw new Error('Database operation failed');
    }
  }

  /**
   * Finds an Exchange entity based on the associated Box ID.
   * @param boxId The unique identifier of the Box entity associated with the Exchange.
   * @returns A Promise that resolves to an Exchange entity or undefined if no such Exchange is found.
   */
  async findOneByBoxId(
    boxId: number,
    relations: string[],
  ): Promise<Exchange | undefined> {
    try {
      return await this.exchangeRepository.findOne({
        relations: relations,
        where: {
          box: { id: boxId },
        },
      });
    } catch (error) {
      console.error(
        `Failed to find exchange with Box ID ${boxId}: ${error.message}`,
      );
      throw new Error('Database operation failed');
    }
  }
  async getExchangesByUser(userId: number, query: any = {}) {
    const page = parseInt(query.page, 10) || 0;
    const limit = parseInt(query.limit, 10) || 10;
    const search = query.search || '';

    const whereConditions = [
      { user: { id: userId }, name: Like(`%${search}%`) },
      { friend: { id: userId }, name: Like(`%${search}%`) },
    ];
    return await this.exchangeRepository.find({
      where: whereConditions,
      relations: ['user', 'friend', 'items'],
      skip: page,
      take: limit,
    });
  }

  /**
   * Removes an Exchange entity from the database.
   * @param exhcnage Exchange entity to remove.
   * @returns A Promise that resolves to the result of the delete operation.
   */
  async removeExchange(exhcnage: Exchange): Promise<void> {
    try {
      const result = await this.exchangeRepository.delete(exhcnage);
      if (result.affected === 0) {
        throw new Error('No record found to delete');
      }
      console.log(`Exchange with ID ${exhcnage.id} has been removed.`);
    } catch (error) {
      console.error(
        `Failed to remove exchange with ID ${exhcnage.id}: ${error.message}`,
      );
      throw new Error('Database operation failed');
    }
  }
}
