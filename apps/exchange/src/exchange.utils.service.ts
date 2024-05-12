import { exchnageStatus } from 'libs/dtos/exchange.status.dto';
import { boxMessagePatterns } from '@app/tcp/boxMessagePatterns/box.message.patterns';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { Exchange } from '@app/database/entities/exchange.entity';
import { taskManagementCommands } from '@app/tcp/frontMessagePatterns/front.task.management.message.patterns';
import { centerMessagePatterns } from '@app/tcp/centerMessagePatterns/center.message.patterns';
import { Front } from '@app/database';
import { ExchangeSimpleDto } from 'libs/dtos/exchangeDtos/exchange.simple.dto';
import { itemExchangeManagementCommands } from '@app/tcp/itemMessagePatterns/item.exchange.management.message.patterns';
import { ExchangeRepository } from './exhcnage.repository';

@Injectable()
export class ExchangeUtilsService {
  private readonly frontClient;
  private readonly boxClient;
  private readonly centerCilent;
  private readonly itemClient;

  constructor(private readonly exchangeRepository: ExchangeRepository) {
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
    this.centerCilent = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3002,
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
    query: any = {},
  ): Promise<ExchangeSimpleDto[]> {
    try {
      const exchanges = await this.exchangeRepository.getExchangesByUser(
        userId,
        query,
      );

      const usersExchanges: ExchangeSimpleDto[] = exchanges.map(
        (exchange) =>
          new ExchangeSimpleDto(
            exchange.user.id,
            exchange.friend.id,
            exchange.items.length,
            exchange.id,
            exchange.pickUpDate,
            exchange.friend.imageUrl,
            exchange.friend.name,
            exchange.name,
            exchange.exchangeState,
          ),
      );

      return usersExchanges;
    } catch (error) {
      console.error(
        `Failed to retrieve exchanges for user with ID: ${userId}`,
        error,
      );
      throw new BadRequestException('Failed to retrieve exchanges.');
    }
  }

  /**
   * Adds an exchange to the front of a queue based on the center ID, assigns a box, and updates the exchange status.
   * @param exchange The exchange entity that is being processed.
   * @param centerId The ID of the center where the exchange will take place.
   * @returns The updated exchange with a reserved status, front, and box information.
   */
  async addExchangeToTheFront(exchange: Exchange, centerId: number) {
    const front: Front = await this.centerCilent
      .send(
        { cmd: centerMessagePatterns.getCenterByCoordinates.cmd },
        { centerId: centerId },
      )
      .toPromise();

    if (!front) {
      throw new NotFoundException(`Front not found`);
    }

    await this.frontClient
      .send(
        { cmd: taskManagementCommands.addTaskToFront.cmd },
        {
          size: exchange.boxSize,
          frontId: front.id,
        },
      )
      .toPromise();

    const box = await this.boxClient
      .send({ cmd: boxMessagePatterns.createBox.cmd }, { exchange })
      .toPromise();

    if (!box) {
      throw new NotFoundException('Failed to create a box for the exchange');
    }

    exchange.exchangeState = exchnageStatus.reserved;

    exchange.front = front;
    exchange.box = box;

    const updatedExchange =
      await this.exchangeRepository.saveExchange(exchange);

    return updatedExchange;
  }

  /**
   * Deletes an exchange from the front based on the provided box ID.
   *
   * @param {number} boxId - Unique identifier of the box associated with the exchange to be deleted.
   * @returns {Promise<boolean>} A promise that resolves to `true` if the exchange is successfully deleted from the front.
   */
  async deleteExchangeFromFront(id: number, isExhcnage: boolean) {
    try {
      // Find the exchange by the associated box ID and include the 'front' relation
      const exchange = isExhcnage
        ? await this.exchangeRepository.findOneByIdAndRelations(id, [
            'front',
            'items',
          ])
        : await this.exchangeRepository.findOneByBoxId(id, ['front', 'items']);

      if (!exchange) {
        throw new Error(`Exchange with box ID ${id} not found.`);
      }

      const itemIds = exchange.items.map((item) => {
        return item.id;
      });

      await this.frontClient
        .send(
          { cmd: taskManagementCommands.deleteTaskFromFront.cmd },
          {
            boxSize: exchange.boxSize,
            front: exchange.front.id,
            id: exchange.id,
          },
        )
        .toPromise();

      await this.itemClient
        .send(
          {
            cmd: itemExchangeManagementCommands.deleteExchangeFromItems.cmd,
          },
          {
            itemIds: itemIds,
            isExhcnageDone:
              exchange.exchangeState === exchnageStatus.done ? true : false,
          },
        )
        .toPromise();

      exchange.front = null;
      exchange.box = null;
      await this.exchangeRepository.removeExchange(exchange);
    } catch (error) {
      console.error('Error deleting exchange from the front:', error);
      throw error;
    }
  }
}
