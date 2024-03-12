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

@Injectable()
export class ItemService {
  private readonly userClient;
  private readonly notificationClient;

  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
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

      const newItem = this.itemRepository.create({
        user: user,
        friend: friend,
        height: createUpdateItemDto.height,
        length: createUpdateItemDto.length,
        name: createUpdateItemDto.name,
        weight: createUpdateItemDto.weight,
        width: createUpdateItemDto.width,
      });

      await this.itemRepository.save(newItem);

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
      // Fetch all items from the database using TypeORM
      const items = await this.itemRepository
        .createQueryBuilder('item')
        .leftJoinAndSelect('item.user', 'user')
        .leftJoinAndSelect('item.friend', 'friend')
        .select(['item.id', 'user.id', 'friend.id'])
        .getMany();
      // Convert each Item entity to ItemDto
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
      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 10;

      const items = await this.itemRepository.find({
        where: forgotten
          ? { friend: { id: userId }, name: Like(`%${query.search}%`) }
          : { user: { id: userId }, name: Like(`%${query.search}%`) },
        relations: ['user', 'friend'],
        skip: page,
        take: limit,
      });

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
  async getUserItemSimple(userId: number): Promise<ItemSimpleDto[]> {
    try {
      const items = await this.itemRepository.find({
        where: {
          friend: {
            id: userId,
          },
          exchange: null,
        },
      });

      const itemSimpleDtos = items.map((item) => toItemSimpleDto(item));

      return itemSimpleDtos;
    } catch (error) {
      console.error('Error fetching simplified items:', error);

      throw new Error('Failed to fetch simplified items');
    }
  }

  /**
   * Deletes an item from the database.
   * It first checks if the item is part of an exchange. If it is, the deletion is not allowed.
   *
   * @param item_id - The ID of the item to delete.
   * @returns A boolean indicating if the deletion was successful.
   * @throws Error if the item is part of an exchange.
   */
  async deleteItem(itemId: number) {
    try {
      // Find the item by itemId
      const item = await this.itemRepository.findOne({
        where: { id: itemId },
        relations: { exchange: true, user: true },
      });

      // Check if the item exists and if it is part of an exchange
      if (!item) {
        throw new Error('Item not found.');
      }
      if (item.exchange) {
        throw new Error('Item is part of an exchange and cannot be deleted.');
      }

      sendNotification(this.notificationClient, {
        userId: item.user.id.toString(),
        nameOfTheService: 'item-service',
        text: `Item named ${item.name} has been deleted from your repository`,
        initials: 'IC',
      });
      const deleteResult = await this.itemRepository.delete(itemId);

      // Check if the item was successfully deleted
      if (deleteResult.affected === 0) {
        throw new Error('Item could not be deleted.');
      }
    } catch (e) {
      console.error('Error in deleteItem:', e);
      return false;
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
    const queryRunner =
      this.itemRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = await queryRunner.manager.findOne(Item, {
        where: { id: updateItemDto.id },
        relations: ['friend', 'user'],
      });

      if (!item) {
        throw new Error('Item not found.');
      }

      if (item.friend.id !== updateItemDto.friendId) {
        const newFriend = await this.userClient
          .send(
            { cmd: profileManagementCommands.getUserForItemUpdate.cmd },
            { friendId: updateItemDto.friendId },
          )
          .toPromise();
        item.friend = newFriend;
      }

      if (updateItemDto.images) {
        const uploadImageDto = new UploadItemImageDto();
        uploadImageDto.file = updateItemDto.images[0];
        uploadImageDto.itemId = item.id.toString();
        await this.uploadItemImage(uploadImageDto, true);
      }

      item.height = updateItemDto.height;
      item.length = updateItemDto.length;
      item.name = updateItemDto.name;
      item.weight = updateItemDto.weight;
      item.width = updateItemDto.width;

      await queryRunner.manager.save(item);
      await queryRunner.commitTransaction();

      const updatedItemDto = toItemDto(item);

      return updatedItemDto;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error updating item:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Fetches an item from the 'item' table in the  database based on the provided item ID.
   * Additionally, retrieves the associated user and friend information.
   *
   * @param item_id - The unique identifier of the item to retrieve.
   * @returns A promise resolving to an ItemWithUsersDto object, which includes the item data
   * along with associated user and friend information.
   */
  async getItem(itemId: number): Promise<ItemDto> {
    try {
      const item = await this.itemRepository.findOne({
        where: { id: itemId },
        relations: ['user', 'friend'],
      });

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
      // Fetch items by their IDs
      const items = await this.itemRepository.find({
        where: { id: In(ids) },
        select: ['length', 'width', 'height', 'id', 'exchange'],
      });

      if (!update) {
        // Check if any item is already in an exchange
        const itemsInExchange = items.some((item) => item.exchange != null);
        if (itemsInExchange) {
          throw new Error('One or more items are already in an exchange');
        }
      }

      // Map the items to ItemSizeDto
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
    try {
      // Find the items by their IDs

      const items = await this.itemRepository.findByIds(
        addExchangeToItemDto.itemIds,
      );

      if (!items || items.length === 0) {
        throw new Error('No items found.');
      }

      return items;
    } catch (err) {
      console.error('Error updating Exchange for items:', err);
      throw err;
    }
  }

  /**
   * Deletes exchange references from items.
   * @param removeExchangeIdToItemDto - DTO containing item IDs to remove exchange references from.
   * @returns boolean - Returns true if the operation is successful.
   */
  async deleteExchangeFromItems(itemIds: number[]): Promise<boolean> {
    try {
      // Find the items by their IDs
      const items = await this.itemRepository.findByIds(itemIds);

      if (!items || items.length === 0) {
        throw new Error('No items found.');
      }

      // Set the Exchange entity to null for each item
      for (const item of items) {
        item.exchange = null;
      }

      // Save the updated items with null Exchange
      await this.itemRepository.save(items);

      return true;
    } catch (err) {
      console.error('Error deleting Exchange from items:', err);
      throw err;
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
      const item = await this.itemRepository.findOneBy({
        id: parseInt(uploadItemImageDto.itemId),
      });

      if (!item) {
        throw new Error('Item not found.');
      }

      item.imageUrl = update
        ? await updateFileInFirebase(
            uploadItemImageDto.file,
            uploadItemImageDto.itemId,
            'Items',
          )
        : await uploadFileToFirebase(
            uploadItemImageDto.file,
            uploadItemImageDto.itemId,
            'Items',
          );

      await this.itemRepository.save(item);
    } catch (error) {
      // Handle or rethrow the error appropriately
      console.error('Error uploading item image:', error);
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
