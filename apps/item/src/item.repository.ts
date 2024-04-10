// item.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Item } from '../../../libs/database/src/entities/item.entity';
import { User } from '../../../libs/database/src/entities/user.entity';
import { CreateUpdateItemIntDto } from 'libs/dtos/itemDtos/create.udpate.item.int.dto';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { profileManagementCommands } from '@app/tcp/userMessagePatterns/user.profile.message.patterns';
import { ItemDto } from 'libs/dtos/itemDtos/item.dto';
import { toItemDto } from './Helpers/item.helpers';
import { UploadItemImageDto } from 'libs/dtos/itemDtos/upload.item.image.dto';
import { updateFileInFirebase, uploadFileToFirebase } from '@app/database';
import { ToggleExchangeToItemDto } from 'libs/dtos/itemDtos/toggle.exchange.id.dto';

@Injectable()
export class ItemRepository {
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
   * Asynchronously creates a new item in the 'item' table of the database.
   * This method abstracts the creation and initial storage of an item entity.
   * @param user - The user entity associated with the item.
   * @param friend - The friend entity associated with the item.
   * @param createUpdateItemDto - An object containing the properties for the new item.
   * @returns A promise resolving to the newly created and saved item entity.
   */
  async createItem(
    user: User,
    friend: User,
    createUpdateItemDto: CreateUpdateItemIntDto,
  ): Promise<Item> {
    const newItem = this.itemRepository.create({
      user: user,
      friend: friend,
      height: createUpdateItemDto.height,
      length: createUpdateItemDto.length,
      name: createUpdateItemDto.name,
      weight: createUpdateItemDto.weight,
      width: createUpdateItemDto.width,
    });

    return await this.itemRepository.save(newItem);
  }

  /**
   * Fetches all items from the database and converts them to ItemDto objects.
   * @returns A promise that resolves with an array of ItemDto objects.
   */
  async getAllItems(): Promise<Item[]> {
    try {
      const items = await this.itemRepository
        .createQueryBuilder('item')
        .leftJoinAndSelect('item.user', 'user')
        .leftJoinAndSelect('item.friend', 'friend')
        .select(['item.id', 'user.id', 'friend.id'])
        .getMany();

      return items;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw new Error('Failed to retrieve items');
    }
  }

  /**
   * Fetches items based on the user ID, a forgotten flag, page, limit, and search term.
   * @param userId - The ID of the user.
   * @param forgotten - Determines if the query should use the friend relation.
   * @param page - The current page of items to fetch.
   * @param limit - The number of items to fetch per page.
   * @param searchTerm - The term used to filter items by name.
   * @returns A promise that resolves with an array of ItemDto objects.
   */
  async getUserItems(
    userId: number,
    forgotten: boolean,
    page: number,
    limit: number,
    searchTerm: string,
  ): Promise<Item[]> {
    try {
      const items = await this.itemRepository.find({
        where: forgotten
          ? { friend: { id: userId }, name: Like(`%${searchTerm}%`) }
          : { user: { id: userId }, name: Like(`%${searchTerm}%`) },
        relations: ['user', 'friend', 'exchange'],
        skip: page * limit,
        take: limit,
      });

      return items;
    } catch (error) {
      console.error('Error fetching user items:', error);
      throw new Error('Failed to retrieve user items');
    }
  }

  /**
   * Fetches a simplified list of items for exchange based on user ID and whether it is for forgotten items.
   * @param userId - The ID of the user associated with the items.
   * @param isForForgotten - Boolean flag indicating if the items are for "forgotten" use.
   * @returns A promise that resolves with an array of ItemSimpleDto objects.
   */
  async getUserItemSimpleForExchange(
    userId: number,
    isForForgotten: boolean,
  ): Promise<Item[]> {
    try {
      const condition = isForForgotten
        ? { user: { id: userId } }
        : { friend: { id: userId } };

      const items = await this.itemRepository.find({
        where: {
          ...condition,
          exchange: null,
        },
      });

      return items;
    } catch (error) {
      console.error('Error fetching simplified items for exchange:', error);
      throw new Error('Failed to fetch simplified items for exchange');
    }
  }

  /**
   * Deletes an item from the database if it's not part of an exchange.
   * @param itemId - The ID of the item to delete.
   * @returns A promise that resolves with a boolean indicating if the deletion was successful.
   * @throws Error if the item is part of an exchange or if the item was not found.
   */
  async deleteItem(itemId: number): Promise<boolean> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId },
      relations: ['exchange', 'user'],
    });

    if (!item) {
      throw new Error('Item not found.');
    }

    if (item.exchange) {
      throw new Error('Item is part of an exchange and cannot be deleted.');
    }

    const deleteResult = await this.itemRepository.delete(itemId);

    if (deleteResult.affected === 0) {
      throw new Error('Item could not be deleted.');
    }

    return true;
  }

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
      console.error('Error uploading item image:', error);
      throw error;
    }
  }

  /**
   * Fetches an item and its associated user and friend information based on the item ID.
   * @param itemId - The unique identifier of the item to retrieve.
   * @returns A promise resolving to an ItemDto.
   */
  async getItem(itemId: number): Promise<Item> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId },
      relations: ['user', 'friend'],
    });

    if (!item) {
      throw new Error('Item not found.');
    }

    return item;
  }

  /**
   * Fetches sizes of specified items and checks if any are already in an exchange, unless bypassed.
   * @param ids Array of item IDs for which sizes are to be fetched.
   * @param update Boolean to bypass the exchange check.
   * @returns A promise resolving with an array of ItemSizeDto objects.
   * @throws Error if any item is part of an exchange and not updating.
   */
  async retrieveItemSizesAndCheckExchange(
    ids: number[],
    update: boolean,
  ): Promise<Item[]> {
    const items = await this.itemRepository.find({
      where: { id: In(ids) },
      select: ['length', 'width', 'height', 'id', 'exchange'],
    });

    if (!update) {
      const itemsInExchange = items.some((item) => item.exchange != null);
      if (itemsInExchange) {
        throw new Error('One or more items are already in an exchange');
      }
    }

    return items;
  }

  /**
   * Update 'exchange_id' for a list of items in the 'item' table.
   *
   * @param {ToggleExchangeToItemDto} dto - Object containing exchange_id and item_ids.
   * @returns {Promise<ItemDto[]>} - Resolves with an array of ItemDto objects on success.
   */
  async addExchangeToItems(addExchangeToItemDto: ToggleExchangeToItemDto) {
    try {
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
  async deleteExchangeFromItems(
    itemIds: number[],
    isExhcnageDone: boolean,
  ): Promise<boolean> {
    try {
      const items = await this.itemRepository.findByIds(itemIds);

      if (!items || items.length === 0) {
        throw new Error('No items found.');
      }

      for (const item of items) {
        item.exchange = null;
      }

      if (isExhcnageDone) {
        await this.itemRepository.remove(items);
      } else {
        await this.itemRepository.save(items);
      }

      return true;
    } catch (err) {
      console.error('Error deleting Exchange from items:', err);
      throw err;
    }
  }
}
