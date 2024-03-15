import { ChangeExchangeStatusDto } from 'libs/dtos/exchangeDtos/change.exchange.status.dto';
import { CreateExchangeDto } from 'libs/dtos/exchangeDtos/create.exchange.dto';
import { ExchangeDto } from 'libs/dtos/exchangeDtos/exchange.dto';
import { ExchangeWithUserDto } from 'libs/dtos/exchangeDtos/exchange.with.users.dto';
import { UpdateExchangeDto } from 'libs/dtos/exchangeDtos/update.exchange.dto';
import { ItemSizeDto } from 'libs/dtos/itemDtos/item.size.dto';
import { boxSizes } from '@app/database/box.sizes';
import { exchnageStatus } from 'libs/dtos/exchange.status.dto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Exchange } from '@app/database/entities/exchange.entity';
import { Repository } from 'typeorm';
import { User } from '@app/database/entities/user.entity';
import { Item } from '@app/database/entities/item.entity';
import { itemExchangeManagementCommands } from '@app/tcp/itemMessagePatterns/item.exchange.management.message.patterns';
import { friendManagementCommands } from '@app/tcp/userMessagePatterns/friend.management.nessage.patterns';
import { ExchangeUtilsService } from './exchange.utils.service';
import { sendNotification } from '@app/tcp/notifications/notification.helper';
import { ExchangeSimpleDto } from 'libs/dtos/exchangeDtos/exchange.simple.dto';
import { centerMessagePatterns } from '@app/tcp/centerMessagePatterns/center.message.patterns';
import { FullExchangeDto } from 'libs/dtos/exchangeDtos/full.exchange.dto';
import { ExchangeUserDto } from 'libs/dtos/exchangeDtos/exchange.user.dto';
import { ItemSimpleDto } from 'libs/dtos/itemDtos/item.simple.dto';
import { boxMessagePatterns } from '@app/tcp/boxMessagePatterns/box.message.patterns';
import { OpenBoxDto } from 'libs/dtos/boxDtos/open.box.dto';
import { taskManagementCommands } from '@app/tcp/frontMessagePatterns/front.task.management.message.patterns';

@Injectable()
export class ExchangeService {
  private readonly userClient;
  private readonly itemClient;
  private readonly notificationClient;
  private readonly boxClient;
  private readonly centerClient;
  private readonly frontClient;

  constructor(
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
    private readonly exchangeUtilsService: ExchangeUtilsService,
  ) {
    this.userClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3006,
      },
    });
    this.frontClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3003,
      },
    });
    this.centerClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3002,
      },
    });

    this.itemClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3004,
      },
    });

    this.notificationClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3011,
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
   * Creates a new exchange between users for item pickup, ensuring all business rules are met.
   * @param createExchangeDto The data transfer object containing details necessary to create an exchange.
   * @returns A promise that resolves to an ExchangeDto containing details of the created exchange.
   */
  async createExchange(
    createExchangeDto: CreateExchangeDto,
  ): Promise<ExchangeSimpleDto> {
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
      exchange.exchangeState = exchnageStatus.inBox;

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
      exchange.name = createExchangeDto.name;
      exchange.pickUpDate = new Date(createExchangeDto.pickUpDate);
      const updatedExchange =
        await this.exchangeUtilsService.addExchangeToTheFront(
          exchange,
          createExchangeDto.centerId,
        );

      sendNotification(this.notificationClient, {
        userId: user.id.toString(),
        nameOfTheService: 'item-service',
        text: `You have created an exhcange with ${friend.name} you have two hours to put items into the box`,
        initials: 'IC',
      });

      sendNotification(this.notificationClient, {
        userId: friend.id.toString(),
        nameOfTheService: 'item-service',
        text: `Your friend ${
          user.name
        } has created exchnage with pick up date ${exchange.pickUpDate.toLocaleString()}`,
        initials: 'IC',
      });

      return new ExchangeSimpleDto(
        updatedExchange.user.id,
        updatedExchange.friend.id,
        updatedExchange.items.length,
        updatedExchange.id,
        updatedExchange.pickUpDate,
        updatedExchange.friend.imageUrl,
        updatedExchange.friend.name,
        updatedExchange.name,
        updatedExchange.exchangeState,
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

      const { friend, items } = await this.getItemsAndUsers(
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

      if (error instanceof NotFoundException) {
        throw new NotFoundException('Exchanges not found.');
      }

      throw error;
    }
  }

  /**
   * Updates exchange status. Fetches and updates pick-up date and box size.
   * @param {ChangeExchangeStatusDto} changeExchangeStatus - Contains update info.
   * @param {number} changeExchangeStatus.id - Exchange ID.
   * @param {string} changeExchangeStatus.exchange_state - New exchange state.
   */
  async getFullExchange(id: number, userId: number): Promise<FullExchangeDto> {
    let exchange;
    try {
      exchange = await this.exchangeRepository.findOne({
        where: { id },
        relations: ['user', 'friend', 'items', 'front'],
      });
      if (!exchange) {
        throw new NotFoundException(`Exchange with ID ${id} not found`);
      }
    } catch (error) {
      console.error('Failed to retrieve exchange from database:', id, error);
      throw new Error('Database retrieval failed');
    }

    try {
      const { long, lat } = await this.centerClient
        .send(
          { cmd: centerMessagePatterns.getCenterCoordinatsWithFrontId.cmd },
          { frontId: exchange.front.id },
        )
        .toPromise();

      const items = exchange.items.map(
        (item) =>
          new ItemSimpleDto(
            item.name,
            item.weight,
            item.id,
            item.length,
            item.weight,
            item.height,
            item.imageUrl,
          ),
      );

      return new FullExchangeDto(
        exchange.id,
        exchange.createdAt,
        exchange.updatedAt,
        exchange.pickUpDate,
        exchange.price,
        exchange.timeElapsedSincePickUpDate,
        items,
        exchange.user.id === userId
          ? new ExchangeUserDto(
              exchange.friend.name,
              exchange.friend.id,
              exchange.friend.imageUrl,
            )
          : new ExchangeUserDto(
              exchange.user.name,
              exchange.user.id,
              exchange.user.imageUrl,
            ),
        exchange.boxSize,
        exchange.name,
        exchange.exchangeState,
        lat,
        long,
      );
    } catch (error) {
      console.error('Failed to process exchange details:', id, error);
      throw new Error('Processing exchange details failed.');
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

      if (changeExchangeStatus.exchangeState === exchnageStatus.done) {
        this.removeExhcangeFromFront(exchange);
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
   * Retrieves a code for opening a box associated with a given exchange.
   *
   * @param id The ID of the exchange.
   * @returns A promise that resolves to the opening code for the associated box.
   */
  async getCodeForExchnageBox(id: number): Promise<string> {
    try {
      const exchange = await this.exchangeRepository.findOne({
        where: { id },
        relations: ['box', 'friend', 'user'],
      });

      if (!exchange || !exchange.box) {
        throw new Error('Exchange or associated box not found');
      }

      return await this.boxClient
        .send(
          { cmd: boxMessagePatterns.generateCodeForBoxToOpen.cmd },
          {
            id: exchange.box.id,
            exchangeState: exchange.exchangeState,
          },
        )
        .toPromise();
    } catch (error) {
      console.error(
        `Error getting code for exchange box with ID ${id}:`,
        error,
      );
      throw error;
    }
  }
  /**
   * Opens a box associated with an exchange by sending a command to the box client.
   *
   * @param openBoxDto DTO containing box information.
   * @param isFromCreator Boolean indicating if action is initiated by exchange creator.
   */
  async openBoxViaExhcnage(openBoxDto: OpenBoxDto, isFromCreator: boolean) {
    try {
      const exchange = await this.exchangeRepository.findOne({
        where: { id: openBoxDto.id },
        relations: ['box', 'friend', 'user'],
      });

      if (!exchange) {
        throw new NotFoundException(
          `Exchange with ID ${openBoxDto.id} not found.`,
        );
      }

      openBoxDto.id = exchange.box.id;

      await this.boxClient
        .send(
          { cmd: boxMessagePatterns.openBox.cmd },
          { openBoxDto, isFromCreator },
        )
        .toPromise();
    } catch (error) {
      console.error('Error in openBoxViaExchange:', error);

      throw new HttpException(
        'Failed to open box due to internal error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
          {
            cmd: itemExchangeManagementCommands
              .retrieveItemSizesAndCheckExchange.cmd,
          },
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

  /**
   * Retrieves user and friend information along with a list of items involved in an exchange.
   * @param exchange The exchange context for which items and users are being fetched.
   * @param friendId The ID of the friend involved in the exchange.
   * @param userId The ID of the user initiating the request.
   * @param itemIds An array of item IDs involved in the exchange.
   * @returns A promise that resolves to an object containing the user, friend, and items involved in the exchange.
   */
  private async getItemsAndUsers(
    exchange: Exchange,
    friendId: number,
    userId: number,
    itemIds: number[],
  ): Promise<{ user: User; friend: User; items: Item[] }> {
    try {
      const { user, friend }: { user: User; friend: User } =
        await this.userClient
          .send(
            { cmd: friendManagementCommands.getUserWithFriend.cmd },
            {
              userId: userId,
              friendId: friendId,
            },
          )
          .toPromise();

      const items: Item[] = await this.itemClient
        .send(
          { cmd: itemExchangeManagementCommands.addExchangeToItems.cmd },
          { itemIds: itemIds, exchange: exchange },
        )
        .toPromise();

      return { user, friend, items };
    } catch (error) {
      console.error('Failed to get items and users', error);
      throw error;
    }
  }

  /**
   * Attempts to remove an exchange entry from the front.
   * This involves sending a command to the front client to delete a task associated with a given exchange.
   * @param exchange The exchange object to be removed. It contains the box size, front id, and exchange id.
   * @returns A promise that resolves when the exchange is successfully removed, or rejects if an error occurs.
   */
  private async removeExhcangeFromFront(exchange: Exchange) {
    try {
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
    } catch (error) {
      console.error('Failed to remove exchange from front', error);
      throw error;
    }
  }
}
