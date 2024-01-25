import { Controller, Inject, UsePipes, ValidationPipe } from '@nestjs/common';
import { ItemService } from './item.service';
import { CreateItemDto } from '@app/dtos/itemDtos/create.item.dto';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { itemMessagePatterns } from '@app/tcp/item.messages.patterns';
import { ItemDto } from '@app/dtos/itemDtos/item.dto';
import { UpdateItemDto } from '@app/dtos/itemDtos/update.item.dto';
import { ItemWithUsersDto } from '@app/dtos/itemDtos/item.with.users.dto';
import { ItemSizeDto } from '@app/dtos/itemDtos/item.size.dto';
import { ToggleExchangeToItemDto } from '@app/dtos/itemDtos/toggle.exchange.id.dto';
import { UploadItemImageDto } from '@app/dtos/itemDtos/upload.item.image.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Controller()
export class ItemController {
  constructor(
    private readonly itemService: ItemService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // Create a new item using the provided DTO
  @MessagePattern(itemMessagePatterns.createItem)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createItem(createItemDto: CreateItemDto): Promise<ItemDto> {
    try {
      return await this.itemService.createItem(createItemDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Retrieve all items
  @MessagePattern(itemMessagePatterns.getAllItems)
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

  // Retrieve items belonging to a specific user
  @MessagePattern(itemMessagePatterns.getUserItems)
  async getUserItems({ id }: { id: number }): Promise<ItemDto[]> {
    try {
      const cacheKey = `userItems:${id}`;
      const cachedUserItems: ItemDto[] = await this.cacheManager.get(cacheKey);

      if (cachedUserItems) {
        return cachedUserItems;
      }

      const userItems = await this.itemService.getUserItems(id, true);

      await this.cacheManager.set(cacheKey, userItems, 18000);

      return userItems;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Retrieve forgotten items belonging to a specific user
  @MessagePattern(itemMessagePatterns.getUserForgotenItems)
  async getUserForgotenItems({ id }: { id: number }): Promise<ItemDto[]> {
    try {
      const cacheKey = `userForgottenItems:${id}`;
      const cachedUserForgottenItems: ItemDto[] =
        await this.cacheManager.get(cacheKey);

      if (cachedUserForgottenItems) {
        return cachedUserForgottenItems;
      }

      const userForgottenItems = await this.itemService.getUserItems(id, false);

      await this.cacheManager.set(cacheKey, userForgottenItems, 18000);

      return userForgottenItems;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Delete an item based on its ID
  @MessagePattern(itemMessagePatterns.deleteItem)
  async deleteItem({ id }: { id: number }): Promise<boolean> {
    try {
      return await this.itemService.deleteItem(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Update an existing item using the provided DTO
  @MessagePattern(itemMessagePatterns.updateItem)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateItem(updateItemDto: UpdateItemDto): Promise<ItemDto> {
    try {
      return await this.itemService.updateItem(updateItemDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Retrieve an item based on its ID
  @MessagePattern(itemMessagePatterns.getItem)
  async getItem({ id }: { id: number }): Promise<ItemWithUsersDto> {
    try {
      const cacheKey = `item:${id}`;
      const cachedItem: ItemWithUsersDto =
        await this.cacheManager.get(cacheKey);

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

  // Retrieve an item based on its ID
  @MessagePattern(itemMessagePatterns.retrieveItemSizesAndCheckExchange)
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
  @MessagePattern(itemMessagePatterns.addExchangeToItems)
  async addExchangeIdToItem(addExchangeIdToItemDto: ToggleExchangeToItemDto) {
    try {
      return await this.itemService.addExchangeToItems(addExchangeIdToItemDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemMessagePatterns.deleteExchangeFromItems)
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

  @MessagePattern(itemMessagePatterns.uploadItemImage)
  async uploadUserImage(uploadUserImageDto: UploadItemImageDto) {
    try {
      return this.itemService.uploadItemImage(uploadUserImageDto, false);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemMessagePatterns.updateItemImage)
  async updateItemImage(uploadUserImageDto: UploadItemImageDto) {
    try {
      return this.itemService.uploadItemImage(uploadUserImageDto, true);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemMessagePatterns.getItemImage)
  async getUserImage({ id }: { id: number }): Promise<string> {
    try {
      return this.itemService.getItemImage(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(itemMessagePatterns.deleteItemImage)
  async deleteUserImage({ id }: { id: number }) {
    try {
      return this.itemService.deleteItemImage(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }
}
