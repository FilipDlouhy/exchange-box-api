import { AddExchangeToFrontDto } from '@app/dtos/exchangeDtos/add.exchange.to.front..dto';
import { CreateExchangeDto } from '@app/dtos/exchangeDtos/create.exchange.dto';
import { DeleteExchangeDto } from '@app/dtos/exchangeDtos/delete.exchange.dto';
import { DeleteExchangeFromFrontDto } from '@app/dtos/exchangeDtos/delete.exchange.from.front.dto';
import { ExchangeDto } from '@app/dtos/exchangeDtos/exchange.dto';
import { ExchangeWithUseDto } from '@app/dtos/exchangeDtos/exchange.with.users.dto';
import { FullExchangeDto } from '@app/dtos/exchangeDtos/full.exchange.dto';
import { UpdateExchangeDto } from '@app/dtos/exchangeDtos/update.exchange.dto';
import { ItemDto } from '@app/dtos/itemDtos/item.dto';
import { ItemSizeDto } from '@app/dtos/itemDtos/item.size.dto';
import { CreateFriendshipDto } from '@app/dtos/userDtos/create.friend.ship.dto';
import { UserDto } from '@app/dtos/userDtos/user.dto';
import { supabase } from '@app/tables';
import { boxSizes } from '@app/tables/box.sizes';
import { exchnageStatus } from '@app/tables/exchange.status.dto';
import { userMessagePatterns } from '@app/tcp';
import { frontMessagePatterns } from '@app/tcp/front.message.patterns';
import { itemMessagePatterns } from '@app/tcp/item.messages.patterns';
import { Injectable } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class ExchangeService {
  private readonly userClient;
  private readonly itemClient;
  private readonly frontClient;

  constructor() {
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
      if (
        createExchangeDto.creator_id === createExchangeDto.pick_up_person_id
      ) {
        throw new Error('Creator and pick-up person cannot be the same.');
      }

      if (
        !this.checkItemsFitInBox(
          createExchangeDto.item_ids,
          createExchangeDto.box_size,
          false,
        )
      ) {
        throw new Error('Items do not fit in the specified box size.');
      }
      const { data, error: insertError } = await supabase
        .from('exchange')
        .insert([
          {
            creator_id: createExchangeDto.creator_id,
            pick_up_user_id: createExchangeDto.pick_up_person_id,
            exchange_state: exchnageStatus.unscheduled,
            box_size: createExchangeDto.box_size,
          },
        ])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return await this.createExchangeDto(data, createExchangeDto.item_ids);
    } catch (err) {
      console.error('Error creating exchange:', err);
      throw err;
    }
  }

  /**
   * Deletes an exchange and removes its references from items.
   * @param deleteExchangeDto - DTO containing the ID of the exchange to be deleted and associated item IDs.
   * @returns boolean - Returns true if the operation is successful.
   */
  async deleteExchange(deleteExchangeDto: DeleteExchangeDto): Promise<boolean> {
    try {
      // Check if the exchange exists
      const { data: exchangeData, error: fetchError } = await supabase
        .from('exchange')
        .select('*')
        .match({ id: deleteExchangeDto.id })
        .single();

      if (fetchError) throw fetchError;
      if (!exchangeData) {
        throw new Error('Exchange not found');
      }

      if (exchangeData.front_id != null) {
        throw new Error('Exchange is in front');
      }

      // Attempt to delete the exchange reference from items
      const deletedExchangeFromItems: boolean = await this.itemClient
        .send(
          { cmd: itemMessagePatterns.deleteExchangeFromItems.cmd },
          {
            item_ids: deleteExchangeDto.item_ids,
            exchange_id: deleteExchangeDto.id,
          },
        )
        .toPromise();

      if (!deletedExchangeFromItems) {
        throw new Error('Failed to delete exchange from items');
      }

      // Attempt to delete the exchange from the 'exchange' table in Supabase
      const { error } = await supabase
        .from('exchange')
        .delete()
        .match({ id: deleteExchangeDto.id });

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error in deleteExchange:', err);
      throw err;
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
        updateExchangeDto.item_ids,
        updateExchangeDto.box_size,
        true,
      );

      if (!itemsFitInBox) {
        throw new Error('Items do not fit in the specified box size.');
      }

      const { data, error: updateError } = await supabase
        .from('exchange')
        .update({
          pick_up_user_id: updateExchangeDto.pick_up_person_id,
          exchange_state: exchnageStatus.unscheduled,
          box_size: updateExchangeDto.box_size,
        })
        .eq('id', updateExchangeDto.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return await this.createExchangeDto(data, updateExchangeDto.item_ids);
    } catch (err) {
      console.error('Error updating exchange:', err);
      throw err;
    }
  }

  /**
   * Retrieves exchanges associated with a specific user, either as a creator or as a pick-up person.
   *
   * @param userId - The ID of the user.
   * @param isNotFriend - A boolean flag to determine the role of the user in the exchange (creator or pick-up person).
   * @returns An array of ExchangeWithUseDto objects associated with the user.
   */
  async getExchangesByUser(
    userId: number,
    isNotFriend: boolean,
  ): Promise<ExchangeWithUseDto[]> {
    try {
      const { data, error } = isNotFriend
        ? await supabase.from('exchange').select().eq('creator_id', userId)
        : await supabase
            .from('exchange')
            .select()
            .eq('pick_up_user_id', userId);

      if (error) {
        throw error;
      }

      const response: { user: UserDto; friend: UserDto } =
        data.length > 0
          ? await this.getUserWithFriend(
              data[0].creator_id,
              data[0].pick_up_user_id,
            )
          : { user: null, friend: null };

      const usersExchanges: ExchangeWithUseDto[] = data.map((exchange) => {
        const userExchange = new ExchangeWithUseDto(
          response.user,
          response.friend,
          exchange.box_size,
          exchange.id,
        );
        return userExchange;
      });

      return usersExchanges;
    } catch (error) {
      console.error(
        'Failed to retrieve exchanges for user with ID:',
        userId,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves all exchanges from the database.
   * Each exchange includes details about the creator and the person picking up the exchange.
   *
   * @returns Promise<ExchangeWithUseDto[]>
   */
  async getAllExchanges(): Promise<ExchangeWithUseDto[]> {
    try {
      // Retrieve exchanges from the database
      const { data, error } = await supabase.from('exchange').select();
      if (error) throw error;

      const existingUsersDtos: UserDto[] = [];

      const usersExchanges: Promise<ExchangeWithUseDto[]> = Promise.all(
        data.map(async (exchange) => {
          try {
            // Find creator and pick_up_person in the existing DTOs array
            let creator = existingUsersDtos.find(
              (userDto) => userDto.id === exchange.creator_id,
            );
            let pick_up_user_id = existingUsersDtos.find(
              (userDto) => userDto.id === exchange.pick_up_user_id,
            );

            // Fetch user details if not already in existingUsersDtos
            if (!creator || !pick_up_user_id) {
              const response = await this.getUserWithFriend(
                exchange.creator_id,
                exchange.pick_up_user_id,
              );

              creator = response.user;
              pick_up_user_id = response.friend;

              // Add new users to the existing users array
              existingUsersDtos.push(creator, pick_up_user_id);
            }

            // Construct and return the ExchangeWithUseDto
            return new ExchangeWithUseDto(
              creator,
              pick_up_user_id,
              exchange.box_size,
              exchange.id,
            );
          } catch (innerError) {
            // Log and handle any errors that occur within the map operation
            console.error('Error processing exchange:', innerError);
            throw innerError;
          }
        }),
      );

      return usersExchanges;
    } catch (error) {
      // Log and handle errors that occur during the exchange retrieval
      console.error('Failed to retrieve exchanges:', error);
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
  async getFullExchange(id: number): Promise<FullExchangeDto> {
    try {
      // Retrieve the exchange details from the database
      const { data, error } = await supabase
        .from('exchange')
        .select()
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      // Retrieve user details associated with the exchange
      const users: { user: UserDto; friend: UserDto } =
        await this.getUserWithFriend(data.creator_id, data.pick_up_user_id);

      // Retrieve items associated with the exchange
      const items: ItemDto[] = await this.itemClient
        .send(
          { cmd: itemMessagePatterns.getItemsForExchange.cmd },
          {
            id: data.id,
          },
        )
        .toPromise();

      // Construct the FullExchangeDto with all the gathered information
      const fullExchangeDto = new FullExchangeDto(
        users.user,
        users.friend,
        data.box_size,
        data.id,
        items,
      );

      return fullExchangeDto;
    } catch (error) {
      // Log the error and rethrow it for higher-level error handling
      console.error(
        'Failed to retrieve full exchange details for ID:',
        id,
        error,
      );
      throw error;
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
  ): Promise<AddExchangeToFrontDto> {
    try {
      const { data: exchangeData, error: exchangeError } = await supabase
        .from('exchange')
        .select('front_id')
        .eq('id', addExchangeToTheFront.id)
        .single();
      if (exchangeError) {
        throw exchangeError;
      }

      if (exchangeData.front_id != null) {
        throw new Error('Exchange has center.');
      }

      // Retrieve the front ID for the task
      const frontId: number = await this.frontClient
        .send(
          { cmd: frontMessagePatterns.getFrontForTask.cmd },
          {
            size: addExchangeToTheFront.size,
            center_id: addExchangeToTheFront.center_id,
          },
        )
        .toPromise();

      // Update the exchange with the new front ID and other details
      const { data, error: updateError } = await supabase
        .from('exchange')
        .update({
          exchange_state: exchnageStatus.scheduled,
          pick_up_date: addExchangeToTheFront.pick_up_date,
          front_id: frontId,
        })
        .eq('id', addExchangeToTheFront.id)
        .select('pick_up_date , id,box_size')
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update the front with the added task
      const wasFrontUpdated: boolean = await this.frontClient
        .send(
          { cmd: frontMessagePatterns.addTaskToFront.cmd },
          { addExchangeToTheFront },
        )
        .toPromise();

      if (!wasFrontUpdated) {
        throw new Error('Failed to update the front with the new task.');
      }
      const updatedExchange = new AddExchangeToFrontDto(
        data.pick_up_date,
        data.id,
        data.box_size,
        addExchangeToTheFront.center_id,
      );
      return updatedExchange;
    } catch (error) {
      console.error('Error in adding exchange to the front:', error);
      throw error;
    }
  }

  async deleteExchangeFromFront(deleteExchangeDto: DeleteExchangeFromFrontDto) {
    try {
      // Retrieve the front ID for the task
      const wasExchangeDeleted: boolean = await this.frontClient
        .send(
          { cmd: frontMessagePatterns.deleteTaskFromFront.cmd },
          {
            box_size: deleteExchangeDto.box_size,
            center_id: deleteExchangeDto.center_id,
            id: deleteExchangeDto.id,
          },
        )
        .toPromise();

      if (!wasExchangeDeleted) {
        throw new Error('Failed to delete the task from the front.');
      }

      console.log('ASFSAF');

      const { data, error: updateError } = await supabase
        .from('exchange')
        .update({
          front_id: null,
        })
        .eq('id', deleteExchangeDto.id)
        .select('pick_up_date, id, box_size');

      if (updateError) {
        throw updateError;
      }

      return data;
    } catch (error) {
      console.error(error);
      throw error;
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
      // Retrieve item sizes
      const itemSizes: ItemSizeDto[] = await this.itemClient
        .send(
          { cmd: itemMessagePatterns.retrieveItemSizesAndCheckExchange.cmd },
          { item_ids: itemIds, udpate: udpate },
        )
        .toPromise();
      // Get the box size using the provided key
      const boxSize = boxSizes[boxSizeKey];

      // Calculate total dimensions of the items
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

      // Check if the total dimensions of the items fit within the specified box size
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
   * Creates an ExchangeDto based on provided data and item IDs.
   *
   * @param data Exchange data to use for creating the ExchangeDto.
   * @param itemIds Array of item IDs to associate with the ExchangeDto.
   * @returns Promise<ExchangeDto> A Promise that resolves to the created ExchangeDto.
   */
  private async createExchangeDto(
    data,
    itemIds: number[],
  ): Promise<ExchangeDto> {
    try {
      const items: ItemDto[] = await this.itemClient
        .send(
          { cmd: itemMessagePatterns.addExchangeId.cmd },
          {
            item_ids: itemIds,
            exchange_id: data.id,
          },
        )
        .toPromise();

      return new ExchangeDto(
        data.creator_id,
        data.pick_up_user_id,
        data.box_size,
        items,
        data.id,
      );
    } catch (error) {
      // Handle the error as needed, e.g., log it or throw a custom error
      console.error('Error creating ExchangeDto:', error);
      throw new Error('Failed to create ExchangeDto');
    }
  }

  /**
   * Private function that retrieves user and friend information.
   *
   * @param user_id - The ID of the user.
   * @param friend_id - The ID of the friend.
   * @returns A promise that resolves to an object containing user and friend data.
   */
  private async getUserWithFriend(
    user_id: number,
    friend_id: number,
  ): Promise<{ user: UserDto; friend: UserDto }> {
    const friendShipDto = new CreateFriendshipDto();
    friendShipDto.friend_id = friend_id;
    friendShipDto.user_id = user_id;
    const result = await this.userClient
      .send({ cmd: userMessagePatterns.getUserWithFriend.cmd }, friendShipDto)
      .toPromise();

    return result;
  }
}
