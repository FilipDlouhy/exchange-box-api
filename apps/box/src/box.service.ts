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
import { exchangeessagePatterns } from '@app/tcp/exchange.message.patterns';
import { OpenBoxDto } from '@app/dtos/boxDtos/open.box.dto';
import { Box } from '@app/database/entities/box.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
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
        try {
          await this.exchangeClient
            .send(
              { cmd: exchangeessagePatterns.deleteExchangeFromFront.cmd },
              {
                boxId: box.id,
              },
            )
            .toPromise();
          this.boxRepository.delete(box.id);
          console.log('Box deleted successfully');
        } catch (timeoutError) {
          // Handle any errors during the timeout processing
          console.error('Error during timeout processing:', timeoutError);
        }
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
      // Calculate the time difference to determine when the box can be opened
      const currentDate = new Date();
      // Add 2 hours (2 * 60 * 60 * 1000 milliseconds) to it
      const timeToPutItemsIntoTheBox = new Date(
        currentDate.getTime() + 2 * 60 * 60 * 1000,
      );
      // Insert the new box data into the 'box' table
      const box = new Box();
      box.timeToPutInBox = timeToPutItemsIntoTheBox;

      // Save the new box entity to the database
      const insertedBox = await this.boxRepository.save(box);

      // Set a timeout to process the message after a delay based on the time to open the box
      const deleteExchangeFromFront = setTimeout(async () => {
        try {
          // Check if the box has items in it
          await this.exchangeClient
            .send(
              { cmd: exchangeessagePatterns.deleteExchangeFromFront.cmd },
              {
                boxId: insertedBox.id,
              },
            )
            .toPromise();
          console.log('Box deleted successfully');

          await this.boxRepository.delete(insertedBox.id);
        } catch (timeoutError) {
          console.error('Error during timeout processing:', timeoutError);
          // Handle timeout error
        }
      }, 7200000);
      // Register the timeout in the scheduler
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

  async generateCodeForBoxToOpen(id: number): Promise<string> {
    try {
      // Get the current time and calculate the future time when the box can be opened
      const currentTime = new Date();
      const futureTime = new Date(currentTime.getTime() + 60 * 1000); // 60 seconds from now

      // Generate a random password for the box
      const passwordToOpenBox = generateRandomString(4);
      const hashedPassword = await bcrypt.hash(passwordToOpenBox, 10);

      // Find the box by exchange_id
      const box = await this.boxRepository.findOne({ where: { id: id } });

      if (!box) {
        throw new NotFoundException(`No box found with exchange id ${id}`);
      }

      if (box.itemsInBox) {
        throw new ConflictException('Items are already in the box');
      }

      // Update the 'box' entity with the new hashed password and opening time
      box.boxOpenCode = hashedPassword;
      box.timeToPutInBox = futureTime;
      await this.boxRepository.save(box);

      // Return the plain text password for use elsewhere
      return passwordToOpenBox;
    } catch (error) {
      // Log and rethrow the error for further handling
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
  async openBox(openBoxDto: OpenBoxDto) {
    try {
      const box = await this.boxRepository.findOne({
        where: { id: openBoxDto.id },
      });

      if (!box) {
        throw new NotFoundException('Box not found');
      }

      const { boxOpenCode, timeToPutInBox } = box;

      // Checking if the current time allows for the box to be opened
      const currentTime = new Date();
      if (currentTime < new Date(timeToPutInBox)) {
        throw new UnauthorizedException('Box cannot be opened at this time');
      }

      // Comparing the provided code with the stored box open code
      const codeMatches = await bcrypt.compare(
        openBoxDto.openBoxCode,
        boxOpenCode,
      );
      if (!codeMatches) {
        throw new UnauthorizedException('Incorrect code');
      }

      // Updating the box status to open in the database
      box.boxOpenCode = null;
      box.itemsInBox = true;
      box.timeToPutInBox = null;
      box.openOrClosed = true;
      await this.boxRepository.save(box);

      // Setting a timeout to automatically close the box after 60 seconds
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
            { cmd: exchangeessagePatterns.changeExchangeStatus.cmd },
            {
              exchange_state: 'inBox',
              id: openBoxDto.id,
            },
          )
          .toPromise();
      }, 6000);

      // Registering the timeout in the scheduler
      this.schedulerRegistry.addTimeout('box is closing', closeBox);
    } catch (error) {
      // Handling any errors that occur during the box opening
      console.error('Error in openBox function:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error; // Re-throw specific exceptions with their messages
      } else {
        throw new InternalServerErrorException(
          'Failed to open the box. Please try again later.',
        );
      }
    }
  }
}
