import { Controller, Inject, UsePipes, ValidationPipe } from '@nestjs/common';
import { ItemService } from './item.service';
import { CreateUpdateItemDto } from 'libs/dtos/itemDtos/create.update.item.dto';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { ItemDto } from 'libs/dtos/itemDtos/item.dto';
import { ItemSizeDto } from 'libs/dtos/itemDtos/item.size.dto';
import { ToggleExchangeToItemDto } from 'libs/dtos/itemDtos/toggle.exchange.id.dto';
import { UploadItemImageDto } from 'libs/dtos/itemDtos/upload.item.image.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { itemManagementCommands } from '../../../libs/tcp/src/itemMessagePatterns/item.management.messages.patterns';
import { itemExchangeManagementCommands } from '../../../libs/tcp/src/itemMessagePatterns/item.exchange.management.message.patterns';
import { itemImageManagementCommands } from '../../../libs/tcp/src/itemMessagePatterns/item.image.management.message.patterns';
import { transformCreateItemToIntDto } from './Helpers/item.helpers';
import { ItemSimpleDto } from 'libs/dtos/itemDtos/item.simple.dto';

@Controller()
export class ItemController {
  constructor(
    private readonly itemService: ItemService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // Create a new item using the provided DTO
  @MessagePattern(itemManagementCommands.createItem)
  async createItem(createUpdateItemDto: CreateUpdateItemDto): Promise<ItemDto> {
    try {
      return await this.itemService.createItem(
        transformCreateItemToIntDto(createUpdateItemDto),
      );
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemManagementCommands.getAllItems)
  async getAllItems(): Promise<ItemDto[]> {
    try {
      const cacheKey = 'allItems';
      const cachedItems: ItemDto[] = await this.cacheManager.get(cacheKey);

      if (cachedItems) {
        return cachedItems;
      }

      const items = await this.itemService.getAllItems();

      await this.cacheManager.set(cacheKey, items, 18000);

      return items;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemManagementCommands.getUserItems)
  async getUserItems({
    id,
    query,
  }: {
    id: number;
    query: any;
  }): Promise<ItemDto[]> {
    try {
      const cacheKey = `userItems_${id}`;
      const cachedUserItems: ItemDto[] = await this.cacheManager.get(cacheKey);

      if (cachedUserItems && query == null) {
        return cachedUserItems;
      }

      const userItems = await this.itemService.getUserItems(id, false, query);

      await this.cacheManager.set(cacheKey, userItems, 18000);

      return userItems;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Retrieve forgotten items belonging to a specific user
  @MessagePattern(itemManagementCommands.getUserForgotenItems)
  async getUserForgotenItems({
    id,
    query,
  }: {
    id: number;
    query: any;
  }): Promise<ItemDto[]> {
    try {
      const cacheKey = `userForgottenItems_${id}`;
      const cachedUserForgottenItems: ItemDto[] =
        await this.cacheManager.get(cacheKey);

      if (cachedUserForgottenItems && query == null) {
        return cachedUserForgottenItems;
      }

      const userForgottenItems = await this.itemService.getUserItems(
        id,
        true,
        query,
      );

      await this.cacheManager.set(cacheKey, userForgottenItems, 18000);

      return userForgottenItems;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Delete an item based on its ID
  @MessagePattern(itemManagementCommands.deleteItem)
  async deleteItem({ id }: { id: number }) {
    try {
      return await this.itemService.deleteItem(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Update an existing item using the provided DTO
  @MessagePattern(itemManagementCommands.updateItem)
  async updateItem(updateItemDto: CreateUpdateItemDto): Promise<ItemDto> {
    try {
      return await this.itemService.updateItem(
        transformCreateItemToIntDto(updateItemDto),
      );
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Retrieve an item based on its ID
  @MessagePattern(itemManagementCommands.getItem)
  async getItem({ id }: { id: number }): Promise<ItemDto> {
    try {
      const cacheKey = `item:${id}`;
      const cachedItem: ItemDto = await this.cacheManager.get(cacheKey);

      if (cachedItem) {
        return cachedItem;
      }

      const item = await this.itemService.getItem(id);

      await this.cacheManager.set(cacheKey, item, 18000);

      return item;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(
    itemExchangeManagementCommands.retrieveItemSizesAndCheckExchange,
  )
  async retrieveItemSizesAndCheckExchange({
    item_ids,
    udpate,
  }: {
    item_ids: number[];
    udpate: boolean;
  }): Promise<ItemSizeDto[]> {
    try {
      return await this.itemService.retrieveItemSizesAndCheckExchange(
        item_ids,
        udpate,
      );
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Retrieve an item based on its ID
  @MessagePattern(itemExchangeManagementCommands.addExchangeToItems)
  async addExchangeIdToItem(addExchangeIdToItemDto: ToggleExchangeToItemDto) {
    try {
      return await this.itemService.addExchangeToItems(addExchangeIdToItemDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemExchangeManagementCommands.deleteExchangeFromItems)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async deleteExchangeFromItems({
    itemIds,
  }: {
    itemIds: number[];
  }): Promise<boolean> {
    try {
      return await this.itemService.deleteExchangeFromItems(itemIds);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemImageManagementCommands.uploadItemImage)
  async uploadItemImage(uploadUserImageDto: UploadItemImageDto) {
    try {
      return this.itemService.uploadItemImage(uploadUserImageDto, false);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemImageManagementCommands.updateItemImage)
  async updateItemImage(uploadUserImageDto: UploadItemImageDto) {
    try {
      return this.itemService.uploadItemImage(uploadUserImageDto, true);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemImageManagementCommands.getItemImage)
  async getUserImage({ id }: { id: number }): Promise<string> {
    try {
      return this.itemService.getItemImage(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemImageManagementCommands.deleteItemImage)
  async deleteItemImage({ id }: { id: number }) {
    try {
      return this.itemService.deleteItemImage(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemExchangeManagementCommands.getUserItemSimpleForExchange)
  async getUserItemSimpleForExchange({
    id,
  }: {
    id: number;
  }): Promise<ItemSimpleDto[]> {
    try {
      const cacheKey = `userSimpleItems:${id}`;

      const cachedItems: ItemSimpleDto[] =
        await this.cacheManager.get(cacheKey);

      if (cachedItems) {
        return cachedItems;
      }

      const items = await this.itemService.getUserItemSimpleForExchange(id);

      await this.cacheManager.set(cacheKey, items, 18000);
      return items;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }
}
