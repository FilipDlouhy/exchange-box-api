import { AddExchangeToFrontDto } from '@app/dtos/exchangeDtos/add.exchange.to.front..dto';
import { ChangeExchangeStatusDto } from '@app/dtos/exchangeDtos/change.exchange.status.dto';
import { CreateExchangeDto } from '@app/dtos/exchangeDtos/create.exchange.dto';
import { DeleteExchangeDto } from '@app/dtos/exchangeDtos/delete.exchange.dto';
import { ExchangeDto } from '@app/dtos/exchangeDtos/exchange.dto';
import { ExchangeWithUserDto } from '@app/dtos/exchangeDtos/exchange.with.users.dto';
import { UpdateExchangeDto } from '@app/dtos/exchangeDtos/update.exchange.dto';
import { ItemDto } from '@app/dtos/itemDtos/item.dto';
import { ItemSizeDto } from '@app/dtos/itemDtos/item.size.dto';
import { boxSizes } from '@app/database/box.sizes';
import { exchnageStatus } from '@app/dtos/exchange.status.dto';
import { userMessagePatterns } from '@app/tcp';
import { boxMessagePatterns } from '@app/tcp/box.message.patterns';
import { frontMessagePatterns } from '@app/tcp/front.message.patterns';
import { itemMessagePatterns } from '@app/tcp/item.messages.patterns';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Exchange } from '@app/database/entities/exchange.entity';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { Front } from '@app/database/entities/front.entity';
import { User } from '@app/database/entities/user.entity';
import { Item } from '@app/database/entities/item.entity';

@Injectable()
export class ExchangeService {
  private readonly userClient;
  private readonly itemClient;
  private readonly frontClient;
  private readonly boxClient;

  constructor(
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
    private readonly entityManager: EntityManager,
  ) {
    this.userClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3006,
      },
    });

    this.itemClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3004,
      },
    });

    this.frontClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3003,
      },
    });

    this.boxClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3008,
      },
    });
  }

  /**
   * Asynchronous function to create a new exchange.
   * It handles the process of validating item sizes, creating the exchange record, and updating item details.
   *
   * @param createExchangeDto DTO containing information needed for creating the exchange.
   * @returns ExchangeDto Returns a data transfer object representing the newly created exchange.
   */
  async createExchange(
    createExchangeDto: CreateExchangeDto,
  ): Promise<ExchangeDto> {
    try {
      if (createExchangeDto.creatorId === createExchangeDto.pickUpPersonId) {
        throw new ConflictException(
          'Creator and pick-up person cannot be the same.',
        );
      }

      if (
        !this.checkItemsFitInBox(
          createExchangeDto.itemIds,
          createExchangeDto.boxSize,
          false,
        )
      ) {
        throw new BadRequestException(
          'Items do not fit in the specified box size.',
        );
      }

      const exchange = new Exchange();
      exchange.exchangeState = exchnageStatus.unscheduled;

      const { friend, items, user } = await this.getItemsAndUsers(
        exchange,
        createExchangeDto.pickUpPersonId,
        createExchangeDto.creatorId,
        createExchangeDto.itemIds,
      );

      exchange.boxSize = createExchangeDto.boxSize;
      exchange.items = items;
      exchange.user = user;
      exchange.friend = friend;

      const savedExchange = await this.exchangeRepository.save(exchange);

      return new ExchangeDto(
        savedExchange.user.id,
        savedExchange.friend.id,
        savedExchange.boxSize,
        savedExchange.items,
        savedExchange.id,
      );
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Error creating exchange:', error);
      throw new InternalServerErrorException('Failed to create exchange');
    }
  }

  /**
   * Deletes an exchange and removes its references from items.
   * @param deleteExchangeDto - DTO containing the ID of the exchange to be deleted and associated item IDs.
   * @returns boolean - Returns true if the operation is successful.
   */
  async deleteExchange(id: number): Promise<boolean> {
    try {
      // Find the exchange by its ID
      const exchange = await this.exchangeRepository.findOne({
        where: { id: id },
        relations: ['front'],
      });

      if (!exchange) {
        throw new NotFoundException('Exchange not found');
      }

      if (exchange.front !== null) {
        throw new ConflictException('Exchange is in front');
      }

      // Delete the exchange from the database
      await this.exchangeRepository.remove(exchange);

      return true;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      console.error('Error in deleteExchange:', error);
      throw new InternalServerErrorException('Failed to delete exchange');
    }
  }

  /**
   * Updates an existing exchange with new details.
   * @param updateExchangeDto - DTO containing the updated details of the exchange.
   * @returns ExchangeDto - The updated exchange data.
   */
  async updateExchange(
    updateExchangeDto: UpdateExchangeDto,
  ): Promise<ExchangeDto> {
    try {
      // Check if the items fit in the specified box size
      const itemsFitInBox = await this.checkItemsFitInBox(
        updateExchangeDto.itemIds,
        updateExchangeDto.boxSize,
        true,
      );

      if (!itemsFitInBox) {
        throw new BadRequestException(
          'Items do not fit in the specified box size.',
        );
      }

      // Find the exchange to update
      const exchange = await this.exchangeRepository.findOne({
        where: { id: updateExchangeDto.id },
        relations: ['user'],
      });

      if (!exchange) {
        throw new NotFoundException('Exchange not found.');
      }

      const { friend, items, user } = await this.getItemsAndUsers(
        exchange,
        updateExchangeDto.pickUpPersonId,
        exchange.user.id,
        updateExchangeDto.itemIds,
      );

      exchange.boxSize = updateExchangeDto.boxSize;
      exchange.friend = friend;
      exchange.items = items;

      const updatedExchange = await this.exchangeRepository.save(exchange);

      return new ExchangeDto(
        updatedExchange.user.id,
        updatedExchange.friend.id,
        updatedExchange.boxSize,
        updatedExchange.items,
        updatedExchange.id,
      );
    } catch (error) {
      console.error('Error updating exchange:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to update exchange.');
    }
  }

  /**
   * Retrieves exchanges associated with a specific user, either as a creator or as a pick-up person.
   *
   * @param userId - The ID of the user.
   * @param isNotFriend - A boolean flag to determine the role of the user in the exchange (creator or pick-up person).
   * @returns An array of ExchangeWithUserDto objects associated with the user.
   */

  async getExchangesByUser(
    userId: number,
    isNotFriend: boolean,
  ): Promise<ExchangeWithUserDto[]> {
    try {
      let exchanges: Exchange[] = [];

      if (isNotFriend) {
        // Find exchanges where the user is the creator and include relations
        exchanges = await this.exchangeRepository.find({
          where: {
            user: { id: userId },
          },
          relations: ['user', 'friend', 'items'],
        });
      } else {
        // Find exchanges where the user is the pick-up person and include relations
        exchanges = await this.exchangeRepository.find({
          where: {
            friend: { id: userId },
          },
          relations: ['user', 'friend', 'items'],
        });
      }

      // Initialize the array to store the results
      const usersExchanges: ExchangeWithUserDto[] = [];

      // Loop through each exchange and load related user data
      for (const exchange of exchanges) {
        const userExchange = new ExchangeWithUserDto(
          exchange.user,
          exchange.friend,
          exchange.boxSize,
          exchange.id,
          exchange.items,
        );
        usersExchanges.push(userExchange);
      }

      return usersExchanges;
    } catch (error) {
      console.error(
        `Failed to retrieve exchanges for user with ID: ${userId}`,
        error,
      );

      // Rethrow specific errors as NestJS exceptions for better handling
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to retrieve exchanges.');
    }
  }

  /**
   * Retrieves all exchanges from the database.
   * Each exchange includes details about the creator and the person picking up the exchange.
   *
   * @returns Promise<ExchangeWithUserDto[]>
   */
  async getAllExchanges(): Promise<ExchangeWithUserDto[]> {
    try {
      const exchanges = await this.exchangeRepository.find({
        relations: ['user', 'friend', 'items'],
      });

      const usersExchanges: ExchangeWithUserDto[] = [];

      // Loop through each exchange and load related user data
      for (const exchange of exchanges) {
        const userExchange = new ExchangeWithUserDto(
          exchange.user,
          exchange.friend,
          exchange.boxSize,
          exchange.id,
          exchange.items,
        );
        usersExchanges.push(userExchange);
      }

      return usersExchanges;
    } catch (error) {
      // Log and handle errors that occur during the retrieval
      console.error('Failed to retrieve exchanges:', error);

      // Check if it's a TypeORM NotFoundException and re-throw with a specific message
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Exchanges not found.');
      }

      throw error;
    }
  }

  /**
   * Retrieves the full details of an exchange by its ID.
   * This includes the details of the exchange, users involved, and the items in the exchange.
   *
   * @param id - The ID of the exchange.
   * @returns A FullExchangeDto object containing detailed information about the exchange.
   */
  async getFullExchange(id: number): Promise<Exchange> {
    try {
      // Find the exchange by ID with relations
      const exchange = await this.exchangeRepository.findOne({
        where: { id },
        relations: ['user', 'friend', 'items', 'box'],
      });

      if (!exchange) {
        throw new NotFoundException(`Exchange with ID ${id} not found`);
      }

      return exchange;
    } catch (error) {
      // Log and handle errors that occur during the retrieval
      console.error(
        'Failed to retrieve full exchange details for ID:',
        id,
        error,
      );

      // Check if it's a TypeORM NotFoundException and re-throw with a specific message
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new Error('Failed to retrieve exchange details.');
    }
  }

  /**
   * Adds an exchange to the front, updating exchange and front data.
   *
   * @param addExchangeToTheFront - DTO with exchange details.
   * @returns Updated exchange DTO.
   * @throws Error on failure or if the exchange already has a front.
   */
  async addExchangeToTheFront(
    addExchangeToTheFront: AddExchangeToFrontDto,
  ): Promise<Exchange> {
    try {
      const exchange = await this.exchangeRepository.findOneBy({
        id: addExchangeToTheFront.id,
      });

      if (!exchange) {
        throw new NotFoundException(
          `Exchange with ID ${addExchangeToTheFront.id} not found`,
        );
      }

      // Retrieve the front ID for the task
      const front: Front = await this.frontClient
        .send(
          { cmd: frontMessagePatterns.getFrontForTask.cmd },
          {
            size: addExchangeToTheFront.size,
            frontId: addExchangeToTheFront.frontId,
          },
        )
        .toPromise();

      if (!front) {
        throw new NotFoundException(
          `Front with ID ${addExchangeToTheFront.frontId} not found`,
        );
      }

      const box = await this.boxClient
        .send({ cmd: boxMessagePatterns.createBox.cmd }, { exchange })
        .toPromise();

      if (!box) {
        throw new NotFoundException('Failed to create a box for the exchange');
      }

      // Update the exchange with the new front ID and other details

      exchange.exchangeState = exchnageStatus.reserved;
      exchange.pickUpDate = new Date(addExchangeToTheFront.pickUpDate);
      exchange.front = front;
      exchange.box = box;

      const updatedExchange = await this.exchangeRepository.save(exchange);

      return updatedExchange;
    } catch (error) {
      console.error('Error in adding exchange to the front:', error);

      // Check if it's a NotFoundException and re-throw with a specific message
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new Error('Failed to add exchange to the front.');
    }
  }

  /**
   * Deletes an exchange from the front based on the provided box ID.
   *
   * @param {number} boxId - Unique identifier of the box associated with the exchange to be deleted.
   * @returns {Promise<boolean>} A promise that resolves to `true` if the exchange is successfully deleted from the front.
   */
  async deleteExchangeFromFront(boxId: number): Promise<boolean> {
    try {
      // Find the exchange by the associated box ID and include the 'front' relation
      const exchange = await this.exchangeRepository.findOne({
        where: { box: { id: boxId } },
        relations: ['front'],
      });

      if (!exchange) {
        throw new Error(`Exchange with box ID ${boxId} not found.`);
      }

      // Retrieve the front ID for the task and attempt to delete the task from the front
      const wasExchangeDeleted: boolean = await this.frontClient
        .send(
          { cmd: frontMessagePatterns.deleteTaskFromFront.cmd },
          {
            boxSize: exchange.boxSize,
            front: exchange.front.id,
            id: exchange.id,
          },
        )
        .toPromise();

      if (!wasExchangeDeleted) {
        throw new Error('Failed to delete the task from the front.');
      }

      // Clear the 'front' and 'box' associations from the exchange and save it
      exchange.front = null;
      exchange.box = null;
      await this.exchangeRepository.save(exchange);

      return true;
    } catch (error) {
      console.error('Error deleting exchange from the front:', error);
      throw error;
    }
  }

  /**
   * Asynchronously updates the status of an exchange in the 'exchange' table based on the provided DTO.
   * Handles the update logic, including fetching pick-up date and box size.
   *
   * @param {ChangeExchangeStatusDto} changeExchangeStatus - DTO with info to update exchange status.
   * @param {number} changeExchangeStatus.id - Unique identifier of the exchange to update.
   * @param {string} changeExchangeStatus.exchange_state - New state to set in the database.
   */
  async changeExchangeStatus(
    changeExchangeStatus: ChangeExchangeStatusDto,
  ): Promise<void> {
    try {
      // Find the exchange by the associated Box ID and include the 'box' relation
      const exchange = await this.exchangeRepository.findOne({
        relations: ['box'],
        where: {
          box: { id: changeExchangeStatus.id },
        },
      });

      if (!exchange) {
        throw new NotFoundException(
          `Exchange with Box ID ${changeExchangeStatus.id} not found`,
        );
      }

      exchange.exchangeState = changeExchangeStatus.exchangeState;

      await this.exchangeRepository.save(exchange);
    } catch (error) {
      console.error('Error updating exchange:', error);
      throw new Error('Failed to update exchange');
    }
  }

  /**
   * Retrieves the box size from the "exchange" table based on the provided ID.
   *
   * @param id The ID of the exchange record to retrieve the box size for.
   * @returns A Promise that resolves to the box size as a string.
   * @throws An error if there's an issue with the  query or if the box size is not found.
   */
  async getBoxSize(id: number): Promise<string> {
    try {
      const exchange = await this.exchangeRepository.findOne({
        where: { id },
        select: ['boxSize'],
      });

      if (!exchange) {
        console.error(`No exchange found with id ${id}`);
        throw new NotFoundException(`Exchange with ID ${id} not found`);
      }

      return exchange.boxSize;
    } catch (err) {
      console.error('An error occurred while fetching box size:', err);
      throw new Error('Error fetching box size');
    }
  }

  /**
   * Checks if the total dimensions of the items fit within the specified box size.
   *
   * @param itemIds Array of item IDs to check.
   * @param boxSizeKey Key of the box size to compare against.
   * @returns boolean Returns true if items fit in the box, false otherwise.
   */
  private async checkItemsFitInBox(
    itemIds: number[],
    boxSizeKey: string,
    udpate: boolean,
  ): Promise<boolean> {
    try {
      const itemSizes: ItemSizeDto[] = await this.itemClient
        .send(
          { cmd: itemMessagePatterns.retrieveItemSizesAndCheckExchange.cmd },
          { item_ids: itemIds, udpate: udpate },
        )
        .toPromise();
      const boxSize = boxSizes[boxSizeKey];

      const { heightToCompare, widthToCompare, lengthToCompare } =
        itemSizes.reduce(
          (acc, itemSize) => {
            acc.heightToCompare += itemSize.height;
            acc.lengthToCompare += itemSize.length;
            acc.widthToCompare += itemSize.width;
            return acc;
          },
          { heightToCompare: 0, widthToCompare: 0, lengthToCompare: 0 },
        );

      return (
        boxSize.height >= heightToCompare &&
        boxSize.width >= widthToCompare &&
        boxSize.length >= lengthToCompare
      );
    } catch (error) {
      console.error('Error in checkItemsFitInBox:', error);
      throw error;
    }
  }

  private async getItemsAndUsers(
    exchange: Exchange,
    friendId: number,
    userId: number,
    itemIds: number[],
  ): Promise<{ user: User; friend: User; items: Item[] }> {
    // Fetch user and friend details
    const { user, friend }: { user: User; friend: User } = await this.userClient
      .send(
        { cmd: userMessagePatterns.getUserWithFriend.cmd },
        {
          userId: userId,
          friendId: friendId,
        },
      )
      .toPromise();

    // Associate items with the exchange
    const items: Item[] = await this.itemClient
      .send(
        { cmd: itemMessagePatterns.addExchangeToItems.cmd },
        { itemIds: itemIds, exchange: exchange },
      )
      .toPromise();

    return { user, friend, items };
  }
}
