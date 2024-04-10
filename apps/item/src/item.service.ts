import { ToggleExchangeToItemDto } from 'libs/dtos/itemDtos/toggle.exchange.id.dto';
import { ItemDto } from 'libs/dtos/itemDtos/item.dto';
import { ItemSizeDto } from 'libs/dtos/itemDtos/item.size.dto';
import {
  deleteFileFromFirebase,
  getImageUrlFromFirebase,
  updateFileInFirebase,
  uploadFileToFirebase,
} from '../../../libs/database/src/firabase-storage';
import { Injectable } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { UploadItemImageDto } from 'libs/dtos/itemDtos/upload.item.image.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Item } from '../../../libs/database/src/entities/item.entity';
import { User } from '../../../libs/database/src/entities/user.entity';
import { friendManagementCommands } from '../../../libs/tcp/src/userMessagePatterns/friend.management.nessage.patterns';
import { profileManagementCommands } from '../../../libs/tcp/src/userMessagePatterns/user.profile.message.patterns';
import { sendNotification } from '../../../libs/tcp/src/notifications/notification.helper';
import { CreateUpdateItemIntDto } from 'libs/dtos/itemDtos/create.udpate.item.int.dto';
import { toItemDto, toItemSimpleDto } from './Helpers/item.helpers';
import { ItemSimpleDto } from 'libs/dtos/itemDtos/item.simple.dto';
import { ItemRepository } from './item.repository';

@Injectable()
export class ItemService {
  private readonly userClient;
  private readonly notificationClient;

  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    private readonly itemRepository2: ItemRepository,
  ) {
    this.userClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3006,
      },
    });

    this.notificationClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3011,
      },
    });
  }

  /**
   * Asynchronously creates a new item in the 'item' table of the database.
   * This involves fetching the user and their friend from the user service,
   * creating a new item entry with the provided details, and optionally
   * uploading an image for the item if provided in the request.
   * @param createUpdateItemDto - An object containing the properties for the new item.
   * @returns A promise resolving to an ItemDto representing the newly created item.
   */
  async createItem(
    createUpdateItemDto: CreateUpdateItemIntDto,
  ): Promise<ItemDto> {
    try {
      const { friend, user }: { friend: User; user: User } =
        await this.userClient
          .send(
            { cmd: friendManagementCommands.getUserWithFriend.cmd },
            {
              userId: createUpdateItemDto.userId,
              friendId: createUpdateItemDto.friendId,
            },
          )
          .toPromise();

      const newItem = await this.itemRepository2.createItem(
        user,
        friend,
        createUpdateItemDto,
      );

      if (createUpdateItemDto.images) {
        const uploadImageDto = new UploadItemImageDto();
        uploadImageDto.file = createUpdateItemDto.images[0];
        uploadImageDto.itemId = newItem.id.toString();

        await this.uploadItemImage(uploadImageDto, false);
      }

      sendNotification(this.notificationClient, {
        userId: user.id.toString(),
        nameOfTheService: 'item-service',
        text: `You created item with owner ${friend.name}`,
        initials: 'IC',
      });

      sendNotification(this.notificationClient, {
        userId: friend.id.toString(),
        nameOfTheService: 'item-service',
        text: `Your friend ${user.name} has created item named ${createUpdateItemDto.name}`,
        initials: 'IC',
      });

      const savedItem = await this.itemRepository.findOne({
        where: { id: newItem.id },
        relations: ['user', 'friend'],
      });

      return toItemDto(savedItem);
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  /**
   * Asynchronously retrieves all items from the 'item' table in the  database.
   *
   * @returns A promise resolving to an array of ItemDto representing all items.
   */
  async getAllItems(): Promise<ItemDto[]> {
    try {
      const items = await this.itemRepository2.getAllItems();
      const itemDtos = items.map((item) => {
        return toItemDto(item);
      });

      return itemDtos;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw new Error('Failed to retrieve items');
    }
  }

  /**
   * Asynchronously retrieves items associated with a user.
   *
   * @param user_id - The unique identifier of the user.
   * @param forgoten - A boolean indicating whether to retrieve forgotten items.
   * @returns A promise resolving to an array of ItemDto representing the user's items.
   */
  async getUserItems(
    userId: number,
    forgotten: boolean,
    query: any = {},
  ): Promise<ItemDto[]> {
    try {
      const page = parseInt(query.page, 10) || 0;
      const limit = parseInt(query.limit, 10) || 10;
      const searchTerm = query.search || '';

      const items = await this.itemRepository2.getUserItems(
        userId,
        forgotten,
        page,
        limit,
        searchTerm,
      );

      const itemDtos = items.map((item) => {
        return toItemDto(item);
      });

      return itemDtos;
    } catch (error) {
      console.error('Error fetching user items:', error);
      throw new Error('Failed to retrieve user items');
    }
  }

  /**
   * Deletes an item from the database.
   *
   * @param item_id - The ID of the item to delete.
   * @returns A boolean indicating if the deletion was successful.
   * @throws Error if the item is part of an exchange.
   */
  async getUserItemSimpleForExchange(
    userId: number,
    isForForgotten: boolean,
  ): Promise<ItemSimpleDto[]> {
    try {
      const items = await this.itemRepository2.getUserItemSimpleForExchange(
        userId,
        isForForgotten,
      );
      const itemSimpleDtos = items.map((item) => toItemSimpleDto(item));

      return itemSimpleDtos;
    } catch (error) {
      console.error('Error fetching simplified items:', error);

      throw new Error('Failed to fetch simplified items');
    }
  }

  /**
   * Service method to delete an item. It defers the operation to the repository,
   * including the checks if the item is part of an exchange.
   *
   * @param itemId - The ID of the item to delete.
   * @returns A promise that resolves with a boolean indicating if the deletion was successful.
   */
  async deleteItem(itemId: number): Promise<boolean> {
    try {
      return await this.itemRepository2.deleteItem(itemId);
    } catch (error) {
      console.error('Service error in deleteItem:', error.message);
      throw error;
    }
  }

  /**
   * Updates an item's details and optionally its image in the database.
   * It first updates item details within a transaction. If an image is provided,
   * it updates the image after the transaction completes.
   *
   * @param updateItemDto Object containing item updates.
   * @returns Updated item details as ItemDto.
   */
  async updateItem(updateItemDto: CreateUpdateItemIntDto): Promise<ItemDto> {
    try {
      return await this.itemRepository2.updateItem(updateItemDto);
    } catch (error) {
      console.error('Error occurred while updating item:', error);
      throw error;
    }
  }

  /**
   * Fetches an item from the 'item' table in the  database based on the provided item ID.
   * Additionally, retrieves the associated user and friend information.
   *
   * @param item_id - The unique identifier of the item to retrieve.
   * @returns A promise resolving to an ItemDto object, which includes the item data
   * along with associated user and friend information.
   */
  async getItem(itemId: number): Promise<ItemDto> {
    try {
      const item = await this.itemRepository2.getItem(itemId);

      if (!item) {
        throw new Error(`Item not found.`);
      }

      const itemDto = toItemDto(item);

      return itemDto;
    } catch (e) {
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
    update: boolean,
  ): Promise<ItemSizeDto[]> {
    try {
      const items =
        await this.itemRepository2.retrieveItemSizesAndCheckExchange(
          ids,
          update,
        );

      if (!update) {
        const itemsInExchange = items.some((item) => item.exchange != null);
        if (itemsInExchange) {
          throw new Error('One or more items are already in an exchange');
        }
      }

      const itemSizes = items.map(
        (item) =>
          new ItemSizeDto(item.length, item.width, item.height, item.id),
      );

      return itemSizes;
    } catch (err) {
      console.error('Error fetching item sizes:', err);
      throw new Error('Failed to fetch item sizes');
    }
  }

  /**
   * Update 'exchange_id' for a list of items in the 'item' table.
   *
   * @param {ToggleExchangeToItemDto} dto - Object containing exchange_id and item_ids.
   * @returns {Promise<ItemDto[]>} - Resolves with an array of ItemDto objects on success.
   */
  async addExchangeToItems(addExchangeToItemDto: ToggleExchangeToItemDto) {
    await this.itemRepository2.addExchangeToItems(addExchangeToItemDto);
  }

  /**
   * Deletes exchange references from items.
   * @param removeExchangeIdToItemDto - DTO containing item IDs to remove exchange references from.
   * @returns boolean - Returns true if the operation is successful.
   */
  async deleteExchangeFromItems(
    itemIds: number[],
    isExchangeDone: boolean,
  ): Promise<boolean> {
    try {
      return await this.itemRepository2.deleteExchangeFromItems(
        itemIds,
        isExchangeDone,
      );
    } catch (error) {
      console.error(
        'Error occurred while deleting exchange from items:',
        error,
      );
      return false;
    }
  }

  /**
   * Uploads an item image to Firebase Storage.
   *
   * @param uploadItemImageDto - Data transfer object containing the file to upload and the item ID.
   * @throws - Propagates any errors that occur during file upload.
   */
  async uploadItemImage(
    uploadItemImageDto: UploadItemImageDto,
    update: boolean,
  ) {
    try {
      await this.itemRepository2.uploadItemImage(uploadItemImageDto, update);
    } catch (error) {
      console.error('Error occurred while uploading item image:', error);
      throw error;
    }
  }

  /**
   * Retrieves the URL of an item's image from Firebase Storage.
   *
   * @param id - The ID of the item whose image URL is to be retrieved.
   * @returns - The URL of the item's image.
   * @throws - Propagates any errors that occur during URL retrieval.
   */
  async getItemImage(id: number): Promise<string> {
    try {
      return await getImageUrlFromFirebase(id.toString(), 'Items');
    } catch (error) {
      console.error('Error getting item image URL:', error);
      throw error;
    }
  }

  /**
   * Deletes an item's image from Firebase Storage.
   *
   * @param id - The ID of the item whose image is to be deleted.
   * @throws - Propagates any errors that occur during image deletion.
   */
  async deleteItemImage(id: number) {
    try {
      await deleteFileFromFirebase(id.toString(), 'Items');

      await this.itemRepository.update(id, { imageUrl: null });
    } catch (error) {
      console.error('Error deleting item image:', error);
      throw error;
    }
  }
}
