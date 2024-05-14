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
import { exchangeQueueManagementCommands } from '@app/tcp/exchnageMessagePatterns/exchnage.queue.message.patterns';
import { exchnageStatus } from 'libs/dtos/exchange.status.dto';
import { BoxRepository } from './box.repository';

@Injectable()
export class BoxService implements OnModuleInit {
  private readonly exchangeClient;

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private readonly boxRepository: BoxRepository, // Use the new repository
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
   * Handles the initialization logic for the BoxService.
   * This method is executed when the module is initialized.
   * It retrieves boxes from the database that have a defined 'timeToPutInBox' and sets
   * a timeout to handle box deletion after a specified period.
   */
  async onModuleInit() {
    const boxes = await this.boxRepository.findBoxesWithTimeToPutInBoxNotNull();
    boxes.map(async (box) => {
      const currentDate = new Date();
      const timeToPutItemsIntoTheBox = new Date(
        currentDate.getTime() + 2 * 60 * 60 * 1000,
      );

      box.timeToPutInBox = timeToPutItemsIntoTheBox;

      await this.boxRepository.saveBox(box);

      const deleteExchangeFromFront = setTimeout(async () => {
        this.deleteExchnageViaBox(box.id);
      }, 7200000); // 2 hours in milliseconds

      this.schedulerRegistry.addTimeout(
        `timeout set for box ${box.id}`,
        deleteExchangeFromFront,
      );
    });
  }

  /**
   * Creates a new box for an exchange.
   * This method sets a time for putting items into the box, saves the box to the database,
   * and schedules a timeout for deleting the box after a specified period.
   * @returns {Promise<Box>} - The created Box object.
   */
  async createBoxForExchange(): Promise<Box> {
    try {
      const currentDate = new Date();
      const timeToPutItemsIntoTheBox = new Date(
        currentDate.getTime() + 2 * 60 * 60 * 1000,
      );
      const box = new Box();
      box.timeToPutInBox = timeToPutItemsIntoTheBox;

      const insertedBox = await this.boxRepository.saveBox(box);

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
    }
  }

  /**
   * Generates a random code for opening a box and hashes the code.
   * This method also verifies the state of the box and ensures it meets
   * the criteria for code generation before saving the hashed code to the database.
   * @param {number} id - The ID of the box.
   * @param {string} exchangeState - The state of the exchange.
   * @returns {Promise<string>} - The generated code to open the box.
   */
  async generateCodeForBoxToOpen(
    id: number,
    exchangeState: string,
  ): Promise<string> {
    try {
      const passwordToOpenBox = generateRandomString(8);
      const hashedPassword = await bcrypt.hash(passwordToOpenBox, 10);

      const box = await this.boxRepository.findBoxById(id);

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

      await this.boxRepository.saveBox(box);

      const timeoutId = `clearCode-${box.id}`;
      const clearCodeTimeout = setTimeout(async () => {
        const boxToUpdate = await this.boxRepository.findBoxById(id);
        if (boxToUpdate) {
          boxToUpdate.boxOpenCode = null;
          await this.boxRepository.saveBox(boxToUpdate);
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
   * Opens a box using the provided DTO.
   * This method checks the validity of the provided code, updates the box status,
   * and schedules a timeout to close the box automatically after a specified period.
   * @param {OpenBoxDto} openBoxDto - Data Transfer Object containing the box ID and the code to open the box.
   * @param {boolean} isFromCreator - Flag indicating whether the request is from the creator.
   */
  async openBox(openBoxDto: OpenBoxDto, isFromCreator: boolean) {
    try {
      const box = await this.boxRepository.findBoxById(openBoxDto.id);

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

      await this.boxRepository.saveBox(box);

      const closeBox = setTimeout(async () => {
        try {
          const box = await this.boxRepository.findBoxById(openBoxDto.id);

          if (box) {
            box.openOrClosed = false;
            await this.boxRepository.saveBox(box);
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
   * This method sends a command to the exchange client to delete the exchange,
   * and if successful, it deletes the corresponding box from the repository.
   * @param {number} boxId - The ID of the box to be deleted.
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

      this.boxRepository.deleteBoxById(boxId);
      console.log('Box deleted successfully');
    } catch (timeoutError) {
      console.error('Error during timeout processing:', timeoutError);
    }
  }
}
