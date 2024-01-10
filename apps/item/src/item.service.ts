import { AddExchangeIdToItemDto } from '@app/dtos/itemDtos/add.exchange.id.dto';
import { CreateItemDto } from '@app/dtos/itemDtos/create.item.dto';
import { ExchangeItemDto } from '@app/dtos/itemDtos/exchange.item.dto';
import { ItemDto } from '@app/dtos/itemDtos/item.dto';
import { ItemSizeDto } from '@app/dtos/itemDtos/item.size.dto';
import { ItemWithUsersDto } from '@app/dtos/itemDtos/item.with.users.dto';
import { UpdateItemDto } from '@app/dtos/itemDtos/update.item.dto';
import { UserDto } from '@app/dtos/userDtos/user.dto';
import { supabase } from '@app/tables';
import { userMessagePatterns } from '@app/tcp';
import { Injectable } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class ItemService {
  private readonly userClient;

  constructor() {
    this.userClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3006,
      },
    });
  }
  /**
   * Asynchronously creates a new item in the 'item' table of the Supabase database.
   *
   * @param createItemDto - An object containing the properties of the new item.
   * @returns A promise resolving to an ItemDto representing the newly created item.
   */
  async createItem(createItemDto: CreateItemDto): Promise<ItemDto> {
    try {
      const response: boolean = await this.userClient
        .send(
          { cmd: userMessagePatterns.checkIfFriends.cmd },
          {
            user_id: createItemDto.user_id,
            friend_id: createItemDto.friend_id,
          },
        )
        .toPromise();

      if (!response) {
        throw new Error(
          'Cannot create item: The specified users are not friends.',
        );
      }

      const { data, error } = await supabase
        .from('item')
        .insert([
          {
            created_at: new Date(),
            user_id: createItemDto.user_id,
            friend_id: createItemDto.friend_id,
            height: createItemDto.heightInCm,
            length: createItemDto.lengthInCm,
            name: createItemDto.name,
            weight: createItemDto.weightInGrams,
            width: createItemDto.widthInCm,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }
      const newItemDto = new ItemDto(data);

      return newItemDto;
    } catch (error) {
      // Handle any errors that occur during the API call.
      throw error;
    }
  }

  /**
   * Asynchronously retrieves all items from the 'item' table in the Supabase database.
   *
   * @returns A promise resolving to an array of ItemDto representing all items.
   */
  async getAllItems(): Promise<ItemDto[]> {
    try {
      const { data, error } = await supabase.from('item').select();

      if (error) {
        throw error;
      }

      const itemDtoArray: ItemDto[] = data.map((item) => {
        return new ItemDto(item);
      });

      return itemDtoArray;
    } catch (error) {
      // Handle any errors that occur during the API call.
      throw error;
    }
  }

  /**
   * Asynchronously retrieves items associated with a user.
   *
   * @param user_id - The unique identifier of the user.
   * @param forgoten - A boolean indicating whether to retrieve forgotten items.
   * @returns A promise resolving to an array of ItemDto representing the user's items.
   */
  async getUserItems(user_id: number, forgoten: boolean): Promise<ItemDto[]> {
    try {
      const { data, error } = forgoten
        ? await supabase.from('item').select().eq('user_id', user_id)
        : await supabase.from('item').select().eq('friend_id', user_id);

      if (error) {
        throw error;
      }

      const itemDtoArray: ItemDto[] = data.map((item) => {
        return new ItemDto(item);
      });

      return itemDtoArray;
    } catch (error) {
      // Handle any errors that occur during the API call.
      throw error;
    }
  }

  /**
   * Asynchronously deletes an item from the 'item' table in the Supabase database.
   *
   * @param item_id - The unique identifier of the item to delete.
   * @returns A promise resolving to a boolean value: `true` if deletion is successful, `false` if not.
   */
  async deleteItem(item_id: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('item')
        .delete()
        .match({ id: item_id });
      if (error) {
        throw error;
      }

      return true;
    } catch (e) {
      console.error('Error deleting item:', e);

      return false;
    }
  }

  /**
   * Asynchronously updates an item in the 'item' table of the Supabase database.
   *
   * @param updateItemDto - An object with updated item properties.
   * @returns A promise resolving to an ItemDto representing the updated item.
   */
  async updateItem(updateItemDto: UpdateItemDto): Promise<ItemDto> {
    try {
      const { data, error } = await supabase
        .from('item')
        .update({
          updated_at: new Date(),
          created_at: new Date(),
          friend_id: updateItemDto.friend_id,
          height: updateItemDto.heightInCm,
          length: updateItemDto.lengthInCm,
          name: updateItemDto.name,
          weight: updateItemDto.weightInGrams,
          width: updateItemDto.widthInCm,
        })
        .eq('id', updateItemDto.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updatedItem = new ItemDto(data);

      return updatedItem;
    } catch (e) {
      console.error('Error updating item:', e);
      throw e;
    }
  }

  /**
   * Fetches an item from the 'item' table in the Supabase database based on the provided item ID.
   * Additionally, retrieves the associated user and friend information.
   *
   * @param item_id - The unique identifier of the item to retrieve.
   * @returns A promise resolving to an ItemWithUsersDto object, which includes the item data
   *          along with associated user and friend information.
   */
  async getItem(item_id: number): Promise<ItemWithUsersDto> {
    try {
      const { data, error } = await supabase
        .from('item')
        .select()
        .eq('id', item_id)
        .single();

      if (error) {
        throw new Error(`Error fetching item: ${error.message}`);
      }

      const itemDto = new ItemDto(data);

      const response: { user: UserDto; friend: UserDto } = await this.userClient
        .send(
          { cmd: userMessagePatterns.getUserWithFriend.cmd },
          {
            user_id: itemDto.user_id,
            friend_id: itemDto.friend_id,
          },
        )
        .toPromise();

      const itemWithUsersDto = new ItemWithUsersDto(
        itemDto,
        response.user,
        response.friend,
      );

      return itemWithUsersDto;
    } catch (e) {
      // Log and rethrow the error for further handling.
      console.error('Error in fetching item or user data:', e);
      throw new Error('Error processing item retrieval');
    }
  }

  /**
   * Fetch sizes of items and check if they are already in an exchange.
   *
   * @param {number[]} ids - Array of item IDs for which sizes are to be fetched.
   * @returns {Promise<ItemSizeDto[]>} - Resolves with an array of ItemSizeDto objects on success.
   * @throws {Error} - Throws an error if any item is already part of an exchange.
   */
  async retrieveItemSizesAndCheckExchange(
    ids: number[],
  ): Promise<ItemSizeDto[]> {
    try {
      const { data, error } = await supabase
        .from('item')
        .select('length, width, height, id, exchange_id')
        .in('id', ids);

      if (error) {
        throw error;
      }

      // Check if any item is already in an exchange
      const itemsInExchange = data.some((item) => item.exchange_id != null);
      if (itemsInExchange) {
        throw new Error('One or more items are already in an exchange');
      }

      const itemSizes = data.map((item) => {
        return new ItemSizeDto(item.length, item.width, item.height, item.id);
      });

      return itemSizes;
    } catch (err) {
      console.error('Error fetching item sizes:', err);
      throw new Error('Failed to fetch item sizes');
    }
  }

  /**
   * Update 'exchange_id' for a list of items in the 'item' table.
   *
   * @param {AddExchangeIdToItemDto} dto - Object containing exchange_id and item_ids.
   * @returns {Promise<ItemDto[]>} - Resolves with an array of ItemDto objects on success.
   */
  async addExchangeIdToItem(
    addExchangeIdToItem: AddExchangeIdToItemDto,
  ): Promise<ExchangeItemDto[]> {
    try {
      const { data, error } = await supabase
        .from('item')
        .update({
          exchange_id: addExchangeIdToItem.exchange_id,
        })
        .in('id', addExchangeIdToItem.item_ids)
        .select();

      if (error) {
        throw error;
      }

      const itemDtoArray: ExchangeItemDto[] = data.map(
        (item) => new ExchangeItemDto(item),
      );

      return itemDtoArray;
    } catch (err) {
      console.error('Error updating exchange ID for items:', err);
      throw err;
    }
  }
}
