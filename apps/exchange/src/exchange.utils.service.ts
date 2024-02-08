import { AddExchangeToFrontDto } from 'libs/dtos/exchangeDtos/add.exchange.to.front..dto';
import { ExchangeWithUserDto } from 'libs/dtos/exchangeDtos/exchange.with.users.dto';
import { exchnageStatus } from 'libs/dtos/exchange.status.dto';
import { boxMessagePatterns } from '@app/tcp/boxMessagePatterns/box.message.patterns';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Exchange } from '@app/database/entities/exchange.entity';
import { Repository } from 'typeorm';
import { Front } from '@app/database/entities/front.entity';
import { taskManagementCommands } from '@app/tcp/frontMessagePatterns/front.task.management.message.patterns';

@Injectable()
export class ExchangeUtilsService {
  private readonly frontClient;
  private readonly boxClient;

  constructor(
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
  ) {
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
          { cmd: taskManagementCommands.getFrontForTask.cmd },
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
          { cmd: taskManagementCommands.deleteTaskFromFront.cmd },
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
}
