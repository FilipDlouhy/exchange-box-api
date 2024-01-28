import { ToggleExchangeToItemDto } from '@app/dtos/itemDtos/toggle.exchange.id.dto';
import { CreateItemDto } from '@app/dtos/itemDtos/create.item.dto';
import { ItemDto } from '@app/dtos/itemDtos/item.dto';
import { ItemSizeDto } from '@app/dtos/itemDtos/item.size.dto';
import { ItemWithUsersDto } from '@app/dtos/itemDtos/item.with.users.dto';
import { UpdateItemDto } from '@app/dtos/itemDtos/update.item.dto';
import {
  deleteFileFromFirebase,
  getImageUrlFromFirebase,
  updateFileInFirebase,
  uploadFileToFirebase,
} from '@app/database';
import { userMessagePatterns } from '@app/tcp';
import { Injectable } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { UploadItemImageDto } from '@app/dtos/itemDtos/upload.item.image.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Item } from '@app/database/entities/item.entity';
import { User } from '@app/database/entities/user.entity';

@Injectable()
export class ItemService {
  private readonly userClient;

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
  }

  /**
   * Asynchronously creates a new item in the 'item' table of the  database.
   *
   * @param createItemDto - An object containing the properties of the new item.
   * @returns A promise resolving to an ItemDto representing the newly created item.
   */
  async createItem(createItemDto: CreateItemDto): Promise<ItemDto> {
    try {
      // Check if users are friends
      const { friend, user }: { friend: User; user: User } =
        await this.userClient
          .send(
            { cmd: userMessagePatterns.getUserWithFriend.cmd },
            {
              userId: createItemDto.userId,
              friendId: createItemDto.friendId,
            },
          )
          .toPromise();

      // Create a new Item instance
      const newItem = this.itemRepository.create({
        user: user,
        friend: friend,
        height: createItemDto.heightInCm,
        length: createItemDto.lengthInCm,
        name: createItemDto.name,
        weight: createItemDto.weightInGrams,
        width: createItemDto.widthInCm,
      });

      // Save the new item in the database
      const savedItem = await this.itemRepository.save(newItem);

      // Create and return the new ItemDto
      return new ItemDto(
        savedItem.name,
        savedItem.user.id,
        savedItem.friend.id,
        savedItem.weight,
        savedItem.id,
        savedItem.length,
        savedItem.width,
        savedItem.height,
      );
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
      const itemDtos = items.map(
        (item) =>
          new ItemDto(
            item.name,
            item.user.id,
            item.friend.id,
            item.weight,
            item.id,
            item.length,
            item.width,
            item.height,
          ),
      );

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
  async getUserItems(userId: number, forgotten: boolean): Promise<ItemDto[]> {
    try {
      const items = await this.itemRepository.find({
        where: forgotten
          ? { user: { id: userId } }
          : { friend: { id: userId } },
        relations: ['user', 'friend'],
        select: ['id'],
      });

      // Convert each Item entity to ItemDto
      const itemDtos = items.map(
        (item) =>
          new ItemDto(
            item.name,
            item.user.id,
            item.friend.id,
            item.weight,
            item.id,
            item.length,
            item.width,
            item.height,
          ),
      );

      return itemDtos;
    } catch (error) {
      console.error('Error fetching user items:', error);
      throw new Error('Failed to retrieve user items');
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
  async deleteItem(itemId: number): Promise<boolean> {
    try {
      // Find the item by itemId
      const item = await this.itemRepository.findOne({
        where: { id: itemId },
        relations: { exchange: true },
      });

      // Check if the item exists and if it is part of an exchange
      if (!item) {
        throw new Error('Item not found.');
      }
      if (item.exchange) {
        throw new Error('Item is part of an exchange and cannot be deleted.');
      }

      const deleteResult = await this.itemRepository.delete(itemId);

      // Check if the item was successfully deleted
      if (deleteResult.affected === 0) {
        throw new Error('Item could not be deleted.');
      }

      return true;
    } catch (e) {
      console.error('Error in deleteItem:', e);
      return false;
    }
  }

  /**
   * Asynchronously updates an item in the 'item' table of the  database.
   *
   * @param updateItemDto - An object with updated item properties.
   * @returns A promise resolving to an ItemDto representing the updated item.
   */
  async updateItem(updateItemDto: UpdateItemDto): Promise<ItemDto> {
    try {
      // Find the item by its ID
      const item = await this.itemRepository.findOne({
        where: { id: updateItemDto.id },
        relations: ['friend'],
      });

      if (!item) {
        throw new Error('Item not found.');
      }

      if (item.friend.id !== updateItemDto.friendId) {
        const newFriend = await this.userClient
          .send(
            { cmd: userMessagePatterns.getUserForItemUpdate.cmd },
            {
              friendId: updateItemDto.friendId,
            },
          )
          .toPromise();
        item.friend = newFriend;
      }

      // Update item properties
      item.height = updateItemDto.heightInCm;
      item.length = updateItemDto.lengthInCm;
      item.name = updateItemDto.name;
      item.weight = updateItemDto.weightInGrams;
      item.width = updateItemDto.widthInCm;

      // Save the updated item
      const updatedItemEntity = await this.itemRepository.save(item);

      // Create and return the updated ItemDto
      const updatedItemDto = new ItemDto(
        updatedItemEntity.name,
        updatedItemEntity.user.id,
        updatedItemEntity.friend.id,
        updatedItemEntity.weight,
        updatedItemEntity.id,
        updatedItemEntity.length,
        updatedItemEntity.width,
        updatedItemEntity.height,
      );
      return updatedItemDto;
    } catch (e) {
      console.error('Error updating item:', e);
      throw e;
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
  async getItem(itemId: number): Promise<ItemWithUsersDto> {
    try {
      // Fetch the item with user and friend relations
      const item = await this.itemRepository.findOne({
        where: { id: itemId },
        relations: ['user', 'friend'], // Replace with the actual relation names in your Item entity
      });

      if (!item) {
        throw new Error(`Item not found.`);
      }

      const itemDto = new ItemDto(
        item.name,
        item.user.id,
        item.friend.id,
        item.weight,
        item.id,
        item.length,
        item.width,
        item.height,
      );

      const itemWithUsersDto = new ItemWithUsersDto(
        itemDto,
        item.user,
        item.friend,
      );

      return itemWithUsersDto;
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
      // Find the Item entity by its ID

      const item = await this.itemRepository.findOneBy({
        id: parseInt(uploadItemImageDto.itemId),
      });

      if (!item) {
        throw new Error('Item not found.');
      }

      // Update the image_url property
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

      // Set the updated_at property

      // Save the updated Item entity
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
      // Handle or rethrow the error appropriately
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
      // Handle or rethrow the error appropriately
      console.error('Error deleting item image:', error);
      throw error;
    }
  }
}
