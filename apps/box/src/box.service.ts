import { AddBoxToExchangeDto } from '@app/dtos/boxDtos/add.box.to.exhange';
import { supabase } from '@app/tables';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { generateRandomString } from './helpers/string.helper';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { exchangeessagePatterns } from '@app/tcp/exchange.message.patterns';
import { OpenBoxDto } from '@app/dtos/boxDtos/open.box.dto';
import { frontMessagePatterns } from '@app/tcp/front.message.patterns';
@Injectable()
export class BoxService {
  private readonly frontClient;
  private readonly exchangeClient;

  constructor(private schedulerRegistry: SchedulerRegistry) {
    this.frontClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3003,
      },
    });

    this.exchangeClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3007,
      },
    });
  }

  /**
   * Asynchronously creates a box for an exchange and schedules its availability based on provided criteria.
   * This function also generates a random password for the box, hashes it, and inserts the box data into the database.
   * Additionally, it sets a timeout to process the box after a delay, based on the time calculated for the box to be opened.
   */
  async createBoxForExchange(addBoxToExchangeDto: AddBoxToExchangeDto) {
    try {
      // Calculate the time difference to determine when the box can be opened
      const currentDate = new Date();

      // Add 2 hours (2 * 60 * 60 * 1000 milliseconds) to it
      const timeToPutItemsIntoTheBox = new Date(
        currentDate.getTime() + 2 * 60 * 60 * 1000,
      );

      // Insert the new box data into the 'box' table
      const { data: boxId, error: insertError } = await supabase
        .from('box')
        .insert([
          {
            time_to_put_in_box: timeToPutItemsIntoTheBox,
            exchange_id: addBoxToExchangeDto.exchange_id,
            front_id: addBoxToExchangeDto.front_id,
          },
        ])
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      // Set a timeout to process the message after a delay based on the time to open the box
      const deleteExchangeFromFront = setTimeout(async () => {
        try {
          // Check if the box has items in it
          const { data, error } = await supabase
            .from('box')
            .select()
            .eq('id', boxId.id)
            .single();

          if (error) {
            throw error;
          }

          if (!data.items_in_box) {
            // Handle the case when the box is empty
            // Retrieve associated items and delete exchange from front
            const response: number = await this.frontClient
              .send(
                { cmd: frontMessagePatterns.getCenterIdByFront.cmd },
                {
                  id: addBoxToExchangeDto.front_id,
                },
              )
              .toPromise();

            await this.exchangeClient
              .send(
                { cmd: exchangeessagePatterns.deleteExchangeFromFront.cmd },
                {
                  box_size: addBoxToExchangeDto.box_size,
                  center_id: response,
                  id: addBoxToExchangeDto.exchange_id,
                },
              )
              .toPromise();

            await supabase.from('box').delete().eq('id', boxId.id);
          }

          console.log('Box deleted successfully');
        } catch (timeoutError) {
          console.error('Error during timeout processing:', timeoutError);
          // Handle timeout error
        }
      }, 7200000);

      // Register the timeout in the scheduler
      this.schedulerRegistry.addTimeout(
        `timeout set for box ${boxId.id}`,
        deleteExchangeFromFront,
      );
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

      // Update the 'box' record in the database with the new hashed password and opening time
      await supabase
        .from('box')
        .update({
          box_open_code: hashedPassword,
          time_to_open_box: futureTime,
        })
        .eq('exchange_id', id);

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
   * @param {number} openBoxDto.exchange_id - Unique identifier of the associated exchange.
   * @param {string} openBoxDto.code - Security code for box opening.
   */
  async openBox(openBoxDto: OpenBoxDto) {
    try {
      // Fetching the box data from the database based on exchange_id
      const { data: boxData } = await supabase
        .from('box')
        .select('box_open_code, time_to_open_box, id')
        .eq('exchange_id', openBoxDto.exchangeId)
        .single();

      // If no box data is found, throw an error
      if (!boxData) {
        throw new Error('Box not found');
      }

      const { box_open_code, time_to_open_box, id } = boxData;

      // Checking if the current time allows for the box to be opened
      const currentTime = new Date();
      if (currentTime > new Date(time_to_open_box)) {
        throw new Error('Box cannot be opened');
      }

      // Comparing the provided code with the stored box open code
      const codeMatches = await bcrypt.compare(
        openBoxDto.openBoxCode,
        box_open_code,
      );
      if (!codeMatches) {
        throw new Error('Incorrect code');
      }

      // Updating the box status to open in the database
      await supabase
        .from('box')
        .update({
          box_open_code: null,
          items_in_box: true,
          time_to_open_box: null,
          open_or_closed: true,
        })
        .eq('id', id);

      // Setting a timeout to automatically close the box after 60 seconds
      const closeBox = setTimeout(async () => {
        try {
          // Updating the box status to closed in the database
          await supabase
            .from('box')
            .update({
              open_or_closed: false,
            })
            .eq('id', id);
        } catch (timeoutError) {
          console.error('Error during timeout processing:', timeoutError);
        }

        await this.exchangeClient
          .send(
            { cmd: exchangeessagePatterns.changeExchangeStatus.cmd },
            {
              exchange_state: 'inBox',
              id: openBoxDto.exchangeId,
            },
          )
          .toPromise();
      }, 6000);

      // Registering the timeout in the scheduler
      this.schedulerRegistry.addTimeout('box is closing', closeBox);
    } catch (error) {
      // Handling any errors that occur during the box
      console.error('Error in openBox function:', error);
    }
  }
}
