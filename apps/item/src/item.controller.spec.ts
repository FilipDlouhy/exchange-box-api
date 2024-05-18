import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { RpcException } from '@nestjs/microservices';
import { ItemController } from './item.controller';
import { ItemService } from './item.service';
import { CreateUpdateItemDto } from 'libs/dtos/itemDtos/create.update.item.dto';
import { ItemDto } from 'libs/dtos/itemDtos/item.dto';
import { ItemSizeDto } from 'libs/dtos/itemDtos/item.size.dto';
import { ToggleExchangeToItemDto } from 'libs/dtos/itemDtos/toggle.exchange.id.dto';
import { UploadItemImageDto } from 'libs/dtos/itemDtos/upload.item.image.dto';
import { ItemSimpleDto } from 'libs/dtos/itemDtos/item.simple.dto';
import { transformCreateItemToIntDto } from './Helpers/item.helpers';
import { Exchange } from '@app/database';

describe('ItemController', () => {
  let itemController: ItemController;
  let itemService: ItemService;
  let cacheManager: Cache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemController],
      providers: [
        {
          provide: ItemService,
          useValue: {
            createItem: jest.fn(),
            getAllItems: jest.fn(),
            getUserItems: jest.fn(),
            getItem: jest.fn(),
            deleteItem: jest.fn(),
            updateItem: jest.fn(),
            retrieveItemSizesAndCheckExchange: jest.fn(),
            addExchangeToItems: jest.fn(),
            deleteExchangeFromItems: jest.fn(),
            uploadItemImage: jest.fn(),
            getItemImage: jest.fn(),
            deleteItemImage: jest.fn(),
            getUserItemSimpleForExchange: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    itemController = module.get<ItemController>(ItemController);
    itemService = module.get<ItemService>(ItemService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createItem', () => {
    it('should create an item', async () => {
      const createUpdateItemDto: CreateUpdateItemDto = {
        userId: '1',
        friendId: '2',
        name: 'Updated Item',
        height: '10',
        length: '15',
        weight: '5',
        width: '20',
        images: [],
      };
      const itemDto: ItemDto = new ItemDto(
        'New Item',
        'Owner',
        1,
        2,
        5000,
        1,
        10,
        20,
        15,
        'imageUrl',
        1,
      );

      jest.spyOn(itemService, 'createItem').mockResolvedValue(itemDto);

      const result = await itemController.createItem(createUpdateItemDto);

      expect(result).toEqual(itemDto);
      expect(itemService.createItem).toHaveBeenCalledWith(
        transformCreateItemToIntDto(createUpdateItemDto),
      );
    });

    it('should throw an RpcException on error', async () => {
      const createUpdateItemDto: CreateUpdateItemDto = {
        userId: '1',
        friendId: '2',
        name: 'Updated Item',
        height: '10',
        length: '15',
        weight: '5',
        width: '20',
        images: [],
      };

      jest
        .spyOn(itemService, 'createItem')
        .mockRejectedValue(new Error('Create Item Error'));

      await expect(
        itemController.createItem(createUpdateItemDto),
      ).rejects.toThrow(new RpcException('Create Item Error'));
    });
  });

  describe('getAllItems', () => {
    it('should return all items from cache', async () => {
      const items: ItemDto[] = [
        new ItemDto(
          'Item1',
          'Owner1',
          1,
          2,
          5000,
          1,
          10,
          20,
          15,
          'imageUrl1',
          1,
        ),
        new ItemDto(
          'Item2',
          'Owner2',
          3,
          4,
          6000,
          2,
          11,
          21,
          16,
          'imageUrl2',
          2,
        ),
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(items);

      const result = await itemController.getAllItems();

      expect(result).toEqual(items);
      expect(cacheManager.get).toHaveBeenCalledWith('allItems');
    });

    it('should return all items from service and cache them', async () => {
      const items: ItemDto[] = [
        new ItemDto(
          'Item1',
          'Owner1',
          1,
          2,
          5000,
          1,
          10,
          20,
          15,
          'imageUrl1',
          1,
        ),
        new ItemDto(
          'Item2',
          'Owner2',
          3,
          4,
          6000,
          2,
          11,
          21,
          16,
          'imageUrl2',
          2,
        ),
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(itemService, 'getAllItems').mockResolvedValue(items);

      const result = await itemController.getAllItems();

      expect(result).toEqual(items);
      expect(cacheManager.get).toHaveBeenCalledWith('allItems');
      expect(itemService.getAllItems).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith('allItems', items, 18000);
    });

    it('should throw an RpcException on error', async () => {
      jest.spyOn(cacheManager, 'get').mockRejectedValue(new Error('Error'));

      await expect(itemController.getAllItems()).rejects.toThrow(
        new RpcException('Error'),
      );
    });
  });

  describe('getUserItems', () => {
    it('should return user items from cache if query is null', async () => {
      const items: ItemDto[] = [
        new ItemDto(
          'Item1',
          'Owner1',
          1,
          2,
          5000,
          1,
          10,
          20,
          15,
          'imageUrl1',
          1,
        ),
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(items);

      const result = await itemController.getUserItems({ id: 1, query: null });

      expect(result).toEqual(items);
      expect(cacheManager.get).toHaveBeenCalledWith('userItems_1');
    });

    it('should return user items from service and cache them', async () => {
      const items: ItemDto[] = [
        new ItemDto(
          'Item1',
          'Owner1',
          1,
          2,
          5000,
          1,
          10,
          20,
          15,
          'imageUrl1',
          1,
        ),
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(itemService, 'getUserItems').mockResolvedValue(items);

      const result = await itemController.getUserItems({ id: 1, query: {} });

      expect(result).toEqual(items);
      expect(cacheManager.get).toHaveBeenCalledWith('userItems_1');
      expect(itemService.getUserItems).toHaveBeenCalledWith(1, false, {});
      expect(cacheManager.set).toHaveBeenCalledWith(
        'userItems_1',
        items,
        18000,
      );
    });

    it('should throw an RpcException on error', async () => {
      jest
        .spyOn(itemService, 'getUserItems')
        .mockRejectedValue(new Error('Error'));

      await expect(
        itemController.getUserItems({ id: 1, query: {} }),
      ).rejects.toThrow(new RpcException('Error'));
    });
  });

  describe('getUserForgotenItems', () => {
    it('should return forgotten items from cache if query is null', async () => {
      const items: ItemDto[] = [
        new ItemDto(
          'Item1',
          'Owner1',
          1,
          2,
          5000,
          1,
          10,
          20,
          15,
          'imageUrl1',
          1,
        ),
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(items);

      const result = await itemController.getUserForgotenItems({
        id: 1,
        query: null,
      });

      expect(result).toEqual(items);
      expect(cacheManager.get).toHaveBeenCalledWith('userForgottenItems_1');
    });

    it('should return forgotten items from service and cache them', async () => {
      const items: ItemDto[] = [
        new ItemDto(
          'Item1',
          'Owner1',
          1,
          2,
          5000,
          1,
          10,
          20,
          15,
          'imageUrl1',
          1,
        ),
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(itemService, 'getUserItems').mockResolvedValue(items);

      const result = await itemController.getUserForgotenItems({
        id: 1,
        query: {},
      });

      expect(result).toEqual(items);
      expect(cacheManager.get).toHaveBeenCalledWith('userForgottenItems_1');
      expect(itemService.getUserItems).toHaveBeenCalledWith(1, true, {});
      expect(cacheManager.set).toHaveBeenCalledWith(
        'userForgottenItems_1',
        items,
        18000,
      );
    });

    it('should throw an RpcException on error', async () => {
      jest
        .spyOn(itemService, 'getUserItems')
        .mockRejectedValue(new Error('Error'));

      await expect(
        itemController.getUserForgotenItems({ id: 1, query: {} }),
      ).rejects.toThrow(new RpcException('Error'));
    });
  });

  describe('deleteItem', () => {
    it('should delete an item', async () => {
      jest.spyOn(itemService, 'deleteItem').mockResolvedValue(true);

      const result = await itemController.deleteItem({ id: 1 });

      expect(result).toBe(true);
      expect(itemService.deleteItem).toHaveBeenCalledWith(1);
    });

    it('should throw an RpcException on error', async () => {
      jest
        .spyOn(itemService, 'deleteItem')
        .mockRejectedValue(new Error('Error'));

      await expect(itemController.deleteItem({ id: 1 })).rejects.toThrow(
        new RpcException('Error'),
      );
    });
  });

  describe('updateItem', () => {
    it('should update an item', async () => {
      const updateItemDto: CreateUpdateItemDto = {
        userId: '1',
        friendId: '2',
        name: 'Updated Item',
        height: '10',
        length: '15',
        weight: '5',
        width: '20',
        images: [],
      };
      const itemDto: ItemDto = new ItemDto(
        'Updated Item',
        'Owner',
        1,
        2,
        5000,
        1,
        10,
        20,
        15,
        'imageUrl',
        1,
      );

      jest.spyOn(itemService, 'updateItem').mockResolvedValue(itemDto);

      const result = await itemController.updateItem(updateItemDto);

      expect(result).toEqual(itemDto);
      expect(itemService.updateItem).toHaveBeenCalledWith(
        transformCreateItemToIntDto(updateItemDto),
      );
    });

    it('should throw an RpcException on error', async () => {
      const updateItemDto: CreateUpdateItemDto = {
        userId: '1',
        friendId: '2',
        name: 'Updated Item',
        height: '10',
        length: '15',
        weight: '5',
        width: '20',
        images: [],
      };

      jest
        .spyOn(itemService, 'updateItem')
        .mockRejectedValue(new Error('Error'));

      await expect(itemController.updateItem(updateItemDto)).rejects.toThrow(
        new RpcException('Error'),
      );
    });
  });

  describe('getItem', () => {
    it('should return an item from cache', async () => {
      const item: ItemDto = new ItemDto(
        'Item1',
        'Owner1',
        1,
        2,
        5000,
        1,
        10,
        20,
        15,
        'imageUrl',
        1,
      );
      jest.spyOn(cacheManager, 'get').mockResolvedValue(item);

      const result = await itemController.getItem({ id: 1 });

      expect(result).toEqual(item);
      expect(cacheManager.get).toHaveBeenCalledWith('item:1');
    });

    it('should return an item from service and cache it', async () => {
      const item: ItemDto = new ItemDto(
        'Item1',
        'Owner1',
        1,
        2,
        5000,
        1,
        10,
        20,
        15,
        'imageUrl',
        1,
      );
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(itemService, 'getItem').mockResolvedValue(item);

      const result = await itemController.getItem({ id: 1 });

      expect(result).toEqual(item);
      expect(cacheManager.get).toHaveBeenCalledWith('item:1');
      expect(itemService.getItem).toHaveBeenCalledWith(1);
      expect(cacheManager.set).toHaveBeenCalledWith('item:1', item, 18000);
    });

    it('should throw an RpcException on error', async () => {
      jest.spyOn(itemService, 'getItem').mockRejectedValue(new Error('Error'));

      await expect(itemController.getItem({ id: 1 })).rejects.toThrow(
        new RpcException('Error'),
      );
    });
  });

  describe('retrieveItemSizesAndCheckExchange', () => {
    it('should retrieve item sizes and check exchange', async () => {
      const itemSizeDtos: ItemSizeDto[] = [new ItemSizeDto(10, 20, 15, 1)];

      jest
        .spyOn(itemService, 'retrieveItemSizesAndCheckExchange')
        .mockResolvedValue(itemSizeDtos);

      const result = await itemController.retrieveItemSizesAndCheckExchange({
        item_ids: [1],
        udpate: false,
      });

      expect(result).toEqual(itemSizeDtos);
      expect(
        itemService.retrieveItemSizesAndCheckExchange,
      ).toHaveBeenCalledWith([1], false);
    });

    it('should throw an RpcException on error', async () => {
      jest
        .spyOn(itemService, 'retrieveItemSizesAndCheckExchange')
        .mockRejectedValue(new Error('Error'));

      await expect(
        itemController.retrieveItemSizesAndCheckExchange({
          item_ids: [1],
          udpate: false,
        }),
      ).rejects.toThrow(new RpcException('Error'));
    });
  });

  describe('addExchangeIdToItem', () => {
    it('should add exchange id to items', async () => {
      const addExchangeToItemDto: ToggleExchangeToItemDto = {
        exchange: new Exchange(),
        itemIds: [1, 2],
      };

      jest
        .spyOn(itemService, 'addExchangeToItems')
        .mockResolvedValue(undefined);

      const result =
        await itemController.addExchangeIdToItem(addExchangeToItemDto);

      expect(result).toBeUndefined();
      expect(itemService.addExchangeToItems).toHaveBeenCalledWith(
        addExchangeToItemDto,
      );
    });

    it('should throw an RpcException on error', async () => {
      const addExchangeToItemDto: ToggleExchangeToItemDto = {
        exchange: new Exchange(),
        itemIds: [1, 2],
      };

      jest
        .spyOn(itemService, 'addExchangeToItems')
        .mockRejectedValue(new Error('Error'));

      await expect(
        itemController.addExchangeIdToItem(addExchangeToItemDto),
      ).rejects.toThrow(new RpcException('Error'));
    });
  });

  describe('deleteExchangeFromItems', () => {
    it('should delete exchange from items', async () => {
      jest
        .spyOn(itemService, 'deleteExchangeFromItems')
        .mockResolvedValue(true);

      const result = await itemController.deleteExchangeFromItems({
        itemIds: [1, 2],
        isExchangeDone: false,
      });

      expect(result).toBe(true);
      expect(itemService.deleteExchangeFromItems).toHaveBeenCalledWith(
        [1, 2],
        false,
      );
    });

    it('should throw an RpcException on error', async () => {
      jest
        .spyOn(itemService, 'deleteExchangeFromItems')
        .mockRejectedValue(new Error('Error'));

      await expect(
        itemController.deleteExchangeFromItems({
          itemIds: [1, 2],
          isExchangeDone: false,
        }),
      ).rejects.toThrow(new RpcException('Error'));
    });
  });

  describe('uploadItemImage', () => {
    it('should upload item image', async () => {
      const uploadItemImageDto: UploadItemImageDto = {
        file: 'image',
        itemId: '1',
      };

      jest.spyOn(itemService, 'uploadItemImage').mockResolvedValue(undefined);

      const result = await itemController.uploadItemImage(uploadItemImageDto);

      expect(result).toBeUndefined();
      expect(itemService.uploadItemImage).toHaveBeenCalledWith(
        uploadItemImageDto,
        false,
      );
    });

    it('should throw an RpcException on error', async () => {
      const uploadItemImageDto: UploadItemImageDto = {
        file: 'image',
        itemId: '1',
      };

      jest
        .spyOn(itemService, 'uploadItemImage')
        .mockRejectedValue(new Error('Error'));

      await expect(
        itemController.uploadItemImage(uploadItemImageDto),
      ).rejects.toThrow(new RpcException('Error'));
    });
  });

  describe('updateItemImage', () => {
    it('should update item image', async () => {
      const uploadItemImageDto: UploadItemImageDto = {
        file: 'image',
        itemId: '1',
      };

      jest.spyOn(itemService, 'uploadItemImage').mockResolvedValue(undefined);

      const result = await itemController.updateItemImage(uploadItemImageDto);

      expect(result).toBeUndefined();
      expect(itemService.uploadItemImage).toHaveBeenCalledWith(
        uploadItemImageDto,
        true,
      );
    });

    it('should throw an RpcException on error', async () => {
      const uploadItemImageDto: UploadItemImageDto = {
        file: 'image',
        itemId: '1',
      };

      jest
        .spyOn(itemService, 'uploadItemImage')
        .mockRejectedValue(new Error('Error'));

      await expect(
        itemController.updateItemImage(uploadItemImageDto),
      ).rejects.toThrow(new RpcException('Error'));
    });
  });

  describe('getUserImage', () => {
    it('should get item image', async () => {
      const imageUrl = 'image_url';

      jest.spyOn(itemService, 'getItemImage').mockResolvedValue(imageUrl);

      const result = await itemController.getUserImage({ id: 1 });

      expect(result).toBe(imageUrl);
      expect(itemService.getItemImage).toHaveBeenCalledWith(1);
    });

    it('should throw an RpcException on error', async () => {
      jest
        .spyOn(itemService, 'getItemImage')
        .mockRejectedValue(new Error('Error'));

      await expect(itemController.getUserImage({ id: 1 })).rejects.toThrow(
        new RpcException('Error'),
      );
    });
  });

  describe('deleteItemImage', () => {
    it('should delete item image', async () => {
      jest.spyOn(itemService, 'deleteItemImage').mockResolvedValue(undefined);

      const result = await itemController.deleteItemImage({ id: 1 });

      expect(result).toBeUndefined();
      expect(itemService.deleteItemImage).toHaveBeenCalledWith(1);
    });

    it('should throw an RpcException on error', async () => {
      jest
        .spyOn(itemService, 'deleteItemImage')
        .mockRejectedValue(new Error('Error'));

      await expect(itemController.deleteItemImage({ id: 1 })).rejects.toThrow(
        new RpcException('Error'),
      );
    });
  });

  describe('getUserItemSimpleForExchange', () => {
    it('should return user item simple for exchange from cache', async () => {
      const items: ItemSimpleDto[] = [
        new ItemSimpleDto('Item1', 1000, 1, 10, 20, 15, 'image_url'),
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(items);

      const result = await itemController.getUserItemSimpleForExchange({
        id: 1,
      });

      expect(result).toEqual(items);
      expect(cacheManager.get).toHaveBeenCalledWith('userSimpleItems:1');
    });

    it('should return user item simple for exchange from service and cache them', async () => {
      const items: ItemSimpleDto[] = [
        new ItemSimpleDto('Item1', 1000, 1, 10, 20, 15, 'image_url'),
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest
        .spyOn(itemService, 'getUserItemSimpleForExchange')
        .mockResolvedValue(items);

      const result = await itemController.getUserItemSimpleForExchange({
        id: 1,
      });

      expect(result).toEqual(items);
      expect(cacheManager.get).toHaveBeenCalledWith('userSimpleItems:1');
      expect(itemService.getUserItemSimpleForExchange).toHaveBeenCalledWith(
        1,
        false,
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        'userSimpleItems:1',
        items,
        18000,
      );
    });

    it('should throw an RpcException on error', async () => {
      jest
        .spyOn(itemService, 'getUserItemSimpleForExchange')
        .mockRejectedValue(new Error('Error'));

      await expect(
        itemController.getUserItemSimpleForExchange({ id: 1 }),
      ).rejects.toThrow(new RpcException('Error'));
    });
  });

  describe('getUserForgotenItemSimpleForExchange', () => {
    it('should return forgotten user item simple for exchange from cache', async () => {
      const items: ItemSimpleDto[] = [
        new ItemSimpleDto('Item1', 1000, 1, 10, 20, 15, 'image_url'),
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(items);

      const result = await itemController.getUserForgotenItemSimpleForExchange({
        id: 1,
      });

      expect(result).toEqual(items);
      expect(cacheManager.get).toHaveBeenCalledWith(
        'userSimpleForgotenItems:1',
      );
    });

    it('should return forgotten user item simple for exchange from service and cache them', async () => {
      const items: ItemSimpleDto[] = [
        new ItemSimpleDto('Item1', 1000, 1, 10, 20, 15, 'image_url'),
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest
        .spyOn(itemService, 'getUserItemSimpleForExchange')
        .mockResolvedValue(items);

      const result = await itemController.getUserForgotenItemSimpleForExchange({
        id: 1,
      });

      expect(result).toEqual(items);
      expect(cacheManager.get).toHaveBeenCalledWith(
        'userSimpleForgotenItems:1',
      );
      expect(itemService.getUserItemSimpleForExchange).toHaveBeenCalledWith(
        1,
        true,
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        'userSimpleForgotenItems:1',
        items,
        18000,
      );
    });

    it('should throw an RpcException on error', async () => {
      jest
        .spyOn(itemService, 'getUserItemSimpleForExchange')
        .mockRejectedValue(new Error('Error'));

      await expect(
        itemController.getUserForgotenItemSimpleForExchange({ id: 1 }),
      ).rejects.toThrow(new RpcException('Error'));
    });
  });
});
