import { Test, TestingModule } from '@nestjs/testing';
import { ItemController } from './item.controller';
import { ItemService } from './item.service';
import { CACHE_MANAGER } from '@nestjs/common/cache';
import { Repository } from 'typeorm';
import { CreateUpdateItemDto } from 'libs/dtos/itemDtos/create.update.item.dto';
import { ItemDto } from 'libs/dtos/itemDtos/item.dto';
import { RpcException } from '@nestjs/microservices';
import { UploadItemImageDto } from 'libs/dtos/itemDtos/upload.item.image.dto';
import { ItemSizeDto } from 'libs/dtos/itemDtos/item.size.dto';

describe('ItemController', () => {
  let controller: ItemController;
  let itemService: ItemService;
  let cacheManager: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemController],
      providers: [
        ItemService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: 'ItemRepository',
          useClass: Repository,
        },
      ],
    }).compile();

    controller = module.get<ItemController>(ItemController);
    itemService = module.get<ItemService>(ItemService);
    cacheManager = module.get<any>(CACHE_MANAGER);
  });

  describe('createItem', () => {
    it('should create an item', async () => {
      const createUpdateItemDto: CreateUpdateItemDto = {
        friendId: ' 1',
        height: '54',
        length: '54',
        name: 'asd',
        userId: '4',
        weight: '54',
        width: '54',
        id: '1',
        images: [],
      };
      const expectedItemDto: ItemDto = {
        friendId: 1,
        height: 54,
        length: 54,
        name: 'asd',
        userId: 4,
        weightInGrams: 54,
        width: 54,
        id: 1,
        ownerName: 'Rogal dorn',
        imageURL: '',
      };

      jest.spyOn(itemService, 'createItem').mockResolvedValue(expectedItemDto);

      expect(await controller.createItem(createUpdateItemDto)).toEqual(
        expectedItemDto,
      );
    });

    it('should throw an exception', async () => {
      const createUpdateItemDto: CreateUpdateItemDto = {
        friendId: ' 1',
        height: '54',
        length: '54',
        name: 'asd',
        userId: '4',
        weight: '54',
        width: '54',
        id: '1',
        images: [],
      };
      const errorMessage = 'Error creating item';

      jest
        .spyOn(itemService, 'createItem')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.createItem(createUpdateItemDto)).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('getAllItems', () => {
    it('should return cached items if available', async () => {
      const cachedItems: ItemDto[] = [
        {
          friendId: 1,
          height: 54,
          length: 54,
          name: 'asd',
          userId: 4,
          weightInGrams: 54,
          width: 54,
          id: 1,
          ownerName: 'Rogal dorn',
          imageURL: '',
        },
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedItems);

      expect(await controller.getAllItems()).toEqual(cachedItems);
    });

    it('should fetch items from service if not cached', async () => {
      const items: ItemDto[] = [
        {
          friendId: 1,
          height: 54,
          length: 54,
          name: 'asd',
          userId: 4,
          weightInGrams: 54,
          width: 54,
          id: 1,
          ownerName: 'Rogal dorn',
          imageURL: '',
        },
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(itemService, 'getAllItems').mockResolvedValue(items);

      expect(await controller.getAllItems()).toEqual(items);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'allItems',
        items,
        expect.any(Number),
      );
    });

    it('should throw an exception if error occurs during fetching items', async () => {
      const errorMessage = 'Error fetching items';
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest
        .spyOn(itemService, 'getAllItems')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.getAllItems()).rejects.toThrow(errorMessage);
    });
  });
  describe('getUserItems', () => {
    it('should return cached user items if available', async () => {
      const userId = 1;
      const query = null;
      const cachedUserItems: ItemDto[] = [
        {
          friendId: 1,
          height: 54,
          length: 54,
          name: 'asd',
          userId: 4,
          weightInGrams: 54,
          width: 54,
          id: 1,
          ownerName: 'Rogal dorn',
          imageURL: '',
        },
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedUserItems);

      expect(await controller.getUserItems({ id: userId, query })).toEqual(
        cachedUserItems,
      );
    });

    it('should fetch user items from service if not cached', async () => {
      const userId = 1;
      const query = null;
      const userItems: ItemDto[] = [
        {
          friendId: 1,
          height: 54,
          length: 54,
          name: 'asd',
          userId: 4,
          weightInGrams: 54,
          width: 54,
          id: 1,
          ownerName: 'Rogal dorn',
          imageURL: '',
        },
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(itemService, 'getUserItems').mockResolvedValue(userItems);

      expect(await controller.getUserItems({ id: userId, query })).toEqual(
        userItems,
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        `userItems_${userId}`,
        userItems,
        18000,
      );
    });

    it('should throw an exception if error occurs during fetching user items', async () => {
      const userId = 1;
      const query = null;
      const errorMessage = 'Error fetching user items';
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest
        .spyOn(itemService, 'getUserItems')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.getUserItems({ id: userId, query }),
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('getUserForgotenItems', () => {
    it('should return cached user forgotten items if available', async () => {
      const userId = 1;
      const query = null;
      const cachedUserForgottenItems: ItemDto[] = [
        {
          friendId: 1,
          height: 54,
          length: 54,
          name: 'asd',
          userId: 4,
          weightInGrams: 54,
          width: 54,
          id: 1,
          ownerName: 'Rogal dorn',
          imageURL: '',
        },
      ];
      jest
        .spyOn(cacheManager, 'get')
        .mockResolvedValue(cachedUserForgottenItems);

      expect(
        await controller.getUserForgotenItems({ id: userId, query }),
      ).toEqual(cachedUserForgottenItems);
    });

    it('should fetch user forgotten items from service if not cached', async () => {
      const userId = 1;
      const query = null;
      const userForgottenItems: ItemDto[] = [
        {
          friendId: 1,
          height: 54,
          length: 54,
          name: 'asd',
          userId: 4,
          weightInGrams: 54,
          width: 54,
          id: 1,
          ownerName: 'Rogal dorn',
          imageURL: '',
        },
      ];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest
        .spyOn(itemService, 'getUserItems')
        .mockResolvedValue(userForgottenItems);

      expect(
        await controller.getUserForgotenItems({ id: userId, query }),
      ).toEqual(userForgottenItems);
      expect(cacheManager.set).toHaveBeenCalledWith(
        `userForgottenItems_${userId}`,
        userForgottenItems,
        18000,
      );
    });

    it('should throw an exception if error occurs during fetching user forgotten items', async () => {
      const userId = 1;
      const query = null;
      const errorMessage = 'Error fetching user forgotten items';
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest
        .spyOn(itemService, 'getUserItems')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.getUserForgotenItems({ id: userId, query }),
      ).rejects.toThrow(errorMessage);
    });
  });
  describe('deleteItem', () => {
    it('should delete an item', async () => {
      const itemId = 1;

      jest.spyOn(itemService, 'deleteItem').mockResolvedValue(undefined);

      await expect(
        controller.deleteItem({ id: itemId }),
      ).resolves.toBeUndefined();
    });

    it('should throw an exception when deleteItem service method throws an error', async () => {
      const itemId = 1;
      const errorMessage = 'Error deleting item';

      jest
        .spyOn(itemService, 'deleteItem')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.deleteItem({ id: itemId })).rejects.toThrowError(
        new RpcException(errorMessage),
      );
    });
  });

  describe('updateItem', () => {
    it('should update an item', async () => {
      const updateItemDto: CreateUpdateItemDto = {
        friendId: '1',
        height: '60',
        length: '60',
        name: 'updatedName',
        userId: '4',
        weight: '60',
        width: '60',
        id: '1',
        images: ['image1.jpg', 'image2.jpg'],
      };

      const expectedItemDto: ItemDto = {
        friendId: 1,
        height: 60,
        length: 60,
        name: 'updatedName',
        userId: 4,
        weightInGrams: 60,
        width: 60,
        id: 1,
        ownerName: 'Owner',
        imageURL: '',
      };

      jest.spyOn(itemService, 'updateItem').mockResolvedValue(expectedItemDto);

      await expect(controller.updateItem(updateItemDto)).resolves.toEqual(
        expectedItemDto,
      );
    });

    it('should throw an exception when updateItem service method throws an error', async () => {
      const updateItemDto: CreateUpdateItemDto = {
        friendId: '1',
        height: '60',
        length: '60',
        name: 'updatedName',
        userId: '4',
        weight: '60',
        width: '60',
        id: '1',
        images: ['image1.jpg', 'image2.jpg'],
      };

      const errorMessage = 'Error updating item';

      jest
        .spyOn(itemService, 'updateItem')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.updateItem(updateItemDto)).rejects.toThrowError(
        new RpcException(errorMessage),
      );
    });
  });

  describe('getItem', () => {
    it('should return cached item if available', async () => {
      const itemId = 1;
      const cachedItem: ItemDto = {
        friendId: 1,
        height: 60,
        length: 60,
        name: 'Sample Item',
        userId: 4,
        weightInGrams: 60,
        width: 60,
        id: 1,
        ownerName: 'Owner',
        imageURL: 'image.jpg',
      };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedItem);

      await expect(controller.getItem({ id: itemId })).resolves.toEqual(
        cachedItem,
      );
    });

    it('should fetch item from service if not cached', async () => {
      const itemId = 1;
      const itemFromService: ItemDto = {
        friendId: 1,
        height: 60,
        length: 60,
        name: 'Sample Item',
        userId: 4,
        weightInGrams: 60,
        width: 60,
        id: 1,
        ownerName: 'Owner',
        imageURL: 'image.jpg',
      };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(itemService, 'getItem').mockResolvedValue(itemFromService);

      await expect(controller.getItem({ id: itemId })).resolves.toEqual(
        itemFromService,
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        `item:${itemId}`,
        itemFromService,
        18000,
      );
    });

    it('should throw an exception when getItem service method throws an error', async () => {
      const itemId = 1;
      const errorMessage = 'Error fetching item';

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest
        .spyOn(itemService, 'getItem')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.getItem({ id: itemId })).rejects.toThrowError(
        new RpcException(errorMessage),
      );
    });
  });

  describe('retrieveItemSizesAndCheckExchange', () => {
    it('should return item sizes and check exchange', async () => {
      const itemIds = [1, 2];
      const update = false;
      const expectedItemSizes: ItemSizeDto[] = [
        { height: 55, itemId: 1, length: 54, width: 54 },
        { height: 55, itemId: 2, length: 54, width: 54 },
      ];

      jest
        .spyOn(itemService, 'retrieveItemSizesAndCheckExchange')
        .mockResolvedValue(expectedItemSizes);

      expect(
        await controller.retrieveItemSizesAndCheckExchange({
          item_ids: itemIds,
          udpate: update,
        }),
      ).toEqual(expectedItemSizes);
    });

    it('should throw an exception if error occurs during retrieval', async () => {
      const itemIds = [1, 2, 3];
      const update = false;
      const errorMessage = 'Error retrieving item sizes and checking exchange';

      jest
        .spyOn(itemService, 'retrieveItemSizesAndCheckExchange')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.retrieveItemSizesAndCheckExchange({
          item_ids: itemIds,
          udpate: update,
        }),
      ).rejects.toThrowError(new RpcException(errorMessage));
    });
  });
});
