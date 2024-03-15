import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { generateRandomString } from './helpers/string.helper';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { OpenBoxDto } from 'libs/dtos/boxDtos/open.box.dto';
import { Box } from '@app/database/entities/box.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { exchangeQueueManagementCommands } from '@app/tcp/exchnageMessagePatterns/exchnage.queue.message.patterns';
import { exchnageStatus } from 'libs/dtos/exchange.status.dto';
@Injectable()
export class BoxService implements OnModuleInit {
  private readonly exchangeClient;
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectRepository(Box)
    private readonly boxRepository: Repository<Box>,
  ) {
    this.exchangeClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3007,
      },
    });
  }

  /**
   * Asynchronously initializes the module to handle box creation and scheduling.
   * It fetches existing boxes from the database and updates their status based on specific criteria.
   * Additionally, it sets a timeout to handle box deletion or further processing.
   */
  async onModuleInit() {
    const boxes = await this.boxRepository.find({
      where: {
        timeToPutInBox: Not(IsNull()),
      },
    });
    boxes.map(async (box) => {
      const currentDate = new Date();
      const timeToPutItemsIntoTheBox = new Date(
        currentDate.getTime() + 2 * 60 * 60 * 1000,
      );

      box.timeToPutInBox = timeToPutItemsIntoTheBox;

      // Save the new box entity to the database
      await this.boxRepository.save(box);

      const deleteExchangeFromFront = setTimeout(async () => {
        this.deleteExchnageViaBox(box.id);
      }, 7200000); // 2 hours in milliseconds
      // Register the timeout in the scheduler
      this.schedulerRegistry.addTimeout(
        `timeout set for box ${box.id}`,
        deleteExchangeFromFront,
      );
    });
  }

  /**
   * Asynchronously creates a box for an exchange and schedules its availability based on provided criteria.
   * This function also generates a random password for the box, hashes it, and inserts the box data into the database.
   * Additionally, it sets a timeout to process the box after a delay, based on the time calculated for the box to be opened.
   */
  async createBoxForExchange() {
    try {
      const currentDate = new Date();
      const timeToPutItemsIntoTheBox = new Date(
        currentDate.getTime() + 2 * 60 * 60 * 1000,
      );
      const box = new Box();
      box.timeToPutInBox = timeToPutItemsIntoTheBox;

      const insertedBox = await this.boxRepository.save(box);

      const deleteExchangeFromFront = setTimeout(async () => {
        this.deleteExchnageViaBox(box.id);
      }, 7200000);
      this.schedulerRegistry.addTimeout(
        `timeout set for box ${insertedBox.id}`,
        deleteExchangeFromFront,
      );

      return insertedBox;
    } catch (error) {
      console.error('Error in createBoxForExchange function:', error);
      // Handle general errors
    }
  }

  /**
   Generates a secure random password for a box associated with the given ID.
   @param {number} id - The exchange's ID linked to the box.
   @returns {Promise<string>} - Resolves with the generated password.
   */
  async generateCodeForBoxToOpen(
    id: number,
    exchangeState: string,
  ): Promise<string> {
    try {
      const passwordToOpenBox = generateRandomString(8);
      const hashedPassword = await bcrypt.hash(passwordToOpenBox, 10);

      const box = await this.boxRepository.findOne({ where: { id } });

      if (!box) {
        throw new NotFoundException(`No box found with exchange id ${id}`);
      }
      if (box.boxOpenCode != null) {
        throw new ConflictException('Box has code already generated');
      }
      if (box.itemsInBox && exchangeState !== exchnageStatus.inBox) {
        throw new ConflictException('Items are already in the box');
      }

      box.boxOpenCode = hashedPassword;

      await this.boxRepository.save(box);

      const timeoutId = `clearCode-${box.id}`;
      const clearCodeTimeout = setTimeout(async () => {
        const boxToUpdate = await this.boxRepository.findOne({ where: { id } });
        if (boxToUpdate) {
          boxToUpdate.boxOpenCode = null;
          await this.boxRepository.save(boxToUpdate);
          console.log(`Box open code cleared for box with id ${id}`);
        }
      }, 6000);

      this.schedulerRegistry.addTimeout(timeoutId, clearCodeTimeout);
      return passwordToOpenBox;
    } catch (error) {
      console.error('Error in generateCodeForBoxToOpen function:', error);
      throw error;
    }
  }

  /**
   * Asynchronously opens a box, performing checks and updates based on the provided DTO.
   * Retrieves box data, verifies the code, checks timing constraints, and updates the box's status.
   * Sets a timeout for auto-closing the box after a specified duration.
   *
   * @param {object} openBoxDto - DTO with info for opening the box.
   * @param {number} openBoxDto.id - Unique identifier of the associated exchange.
   * @param {string} openBoxDto.code - Security code for box opening.
   */
  async openBox(openBoxDto: OpenBoxDto, isFromCreator: boolean) {
    try {
      const box = await this.boxRepository.findOne({
        where: { id: openBoxDto.id },
      });

      if (!box) {
        throw new NotFoundException('Box not found');
      }

      const { boxOpenCode, timeToPutInBox } = box;

      const currentTime = new Date();

      if (isFromCreator && currentTime > new Date(timeToPutInBox)) {
        throw new UnauthorizedException('Box cannot be opened at this time');
      }

      const codeMatches = await bcrypt.compare(
        openBoxDto.openBoxCode,
        boxOpenCode,
      );

      if (!codeMatches) {
        throw new UnauthorizedException('Incorrect code');
      }

      box.boxOpenCode = null;
      box.itemsInBox = true;
      box.timeToPutInBox = null;
      box.openOrClosed = true;

      await this.boxRepository.save(box);

      const closeBox = setTimeout(async () => {
        try {
          const box = await this.boxRepository.findOne({
            where: { id: openBoxDto.id },
          });

          if (box) {
            box.openOrClosed = false;
            await this.boxRepository.save(box);
          }
        } catch (timeoutError) {
          console.error('Error during timeout processing:', timeoutError);
        }

        await this.exchangeClient
          .send(
            { cmd: exchangeQueueManagementCommands.changeExchangeStatus.cmd },
            {
              exchangeState: isFromCreator
                ? exchnageStatus.inBox
                : exchnageStatus.done,
              id: openBoxDto.id,
            },
          )
          .toPromise();
      }, 6000);

      this.schedulerRegistry.addTimeout(`box${box.id} is closing`, closeBox);
    } catch (error) {
      console.error('Error in openBox function:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      } else {
        throw new InternalServerErrorException(
          'Failed to open the box. Please try again later.',
        );
      }
    }
  }

  /**
   * Deletes an exchange associated with a specific box ID.
   * This method performs two main actions:
   * 1. It sends a command to the exchange client to delete the exchange from the front based on the given box ID.
   *    The operation assumes the exchange is not directly associated with the action by setting `isExchange` to false.
   * 2. If the first operation is successful, it proceeds to delete the box from the box repository.
   * @param boxId The ID of the box associated with the exchange to be deleted.
   */
  async deleteExchnageViaBox(boxId: number) {
    try {
      await this.exchangeClient
        .send(
          {
            cmd: exchangeQueueManagementCommands.deleteExchangeFromFront.cmd,
          },
          {
            boxId: boxId,
            isExchange: false,
          },
        )
        .toPromise();

      this.boxRepository.delete(boxId);
      console.log('Box deleted successfully');
    } catch (timeoutError) {
      console.error('Error during timeout processing:', timeoutError);
    }
  }
}
