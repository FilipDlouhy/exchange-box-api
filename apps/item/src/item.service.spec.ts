import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ItemService } from './item.service';
import { ItemRepository } from './item.repository';
import { Item } from '../../../libs/database/src/entities/item.entity';
import { User } from '../../../libs/database/src/entities/user.entity';
import { CreateUpdateItemIntDto } from 'libs/dtos/itemDtos/create.udpate.item.int.dto';
import { UploadItemImageDto } from 'libs/dtos/itemDtos/upload.item.image.dto';
import { ToggleExchangeToItemDto } from 'libs/dtos/itemDtos/toggle.exchange.id.dto';
import { Exchange } from '@app/database';
import { ItemDto } from 'libs/dtos/itemDtos/item.dto';

describe('ItemService', () => {
  let service: ItemService;
  let itemRepository: ItemRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemService,
        {
          provide: getRepositoryToken(Item),
          useClass: ItemRepository,
        },
      ],
    }).compile();

    service = module.get<ItemService>(ItemService);
    itemRepository = module.get<ItemRepository>(getRepositoryToken(Item));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createItem', () => {
    it('should create a new item', async () => {
      const createUpdateItemDto: CreateUpdateItemIntDto = {
        userId: 1,
        friendId: 2,
        name: 'Updated Item',
        images: ['updated-image.png'],
        height: 5,
        length: 5,
        weight: 5,
        width: 5,
        id: 5,
      };

      const user = new User({
        id: 1,
        name: 'Old Name',
        telephone: '0987654321',
        address: '123 Old Address',
        email: 'old@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url',
        backgroundImageUrl: 'background_image_url',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      });
      user.id = 1;
      user.name = 'Test User';

      const friend = new User({
        id: 1,
        name: 'Old Name',
        telephone: '0987654321',
        address: '123 Old Address',
        email: 'old@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url',
        backgroundImageUrl: 'background_image_url',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      });
      friend.id = 2;
      friend.name = 'Test Friend';

      const newItem = new Item();
      newItem.id = 1;

      jest.spyOn(service['userClient'], 'send').mockImplementation(() => ({
        toPromise: jest.fn().mockResolvedValue({ user, friend }),
      }));

      jest.spyOn(itemRepository, 'createItem').mockResolvedValue(newItem);
      jest.spyOn(service, 'uploadItemImage').mockResolvedValue(undefined);
      jest.spyOn(itemRepository, 'getSavedItemd').mockResolvedValue(newItem);

      const result = await service.createItem(createUpdateItemDto);

      expect(result).toEqual(expect.any(Object));
    });

    it('should throw an error if user or friend not found', async () => {
      const createUpdateItemDto: CreateUpdateItemIntDto = {
        userId: 1,
        friendId: 2,
        name: 'Updated Item',
        images: ['updated-image.png'],
        height: 5,
        length: 5,
        weight: 5,
        width: 5,
        id: 5,
      };

      jest.spyOn(service['userClient'], 'send').mockImplementation(() => ({
        toPromise: jest.fn().mockResolvedValue(null),
      }));

      await expect(service.createItem(createUpdateItemDto)).rejects.toThrow();
    });
  });

  describe('getAllItems', () => {
    it('should return all items', async () => {
      const items = [new Item(), new Item()];
      jest.spyOn(itemRepository, 'getAllItems').mockResolvedValue(items);

      const result = await service.getAllItems();

      expect(result).toHaveLength(2);
    });

    it('should throw an error if items retrieval fails', async () => {
      jest.spyOn(itemRepository, 'getAllItems').mockRejectedValue(new Error());

      await expect(service.getAllItems()).rejects.toThrow();
    });
  });

  describe('getUserItems', () => {
    it('should return user items', async () => {
      const items = [new Item(), new Item()];
      jest.spyOn(itemRepository, 'getUserItems').mockResolvedValue(items);

      const result = await service.getUserItems(1, false);

      expect(result).toHaveLength(2);
    });

    it('should throw an error if user items retrieval fails', async () => {
      jest.spyOn(itemRepository, 'getUserItems').mockRejectedValue(new Error());

      await expect(service.getUserItems(1, false)).rejects.toThrow();
    });
  });

  describe('deleteItem', () => {
    it('should delete an item', async () => {
      jest.spyOn(itemRepository, 'deleteItem').mockResolvedValue(true);

      const result = await service.deleteItem(1);

      expect(result).toBe(true);
    });

    it('should throw an error if item deletion fails', async () => {
      jest.spyOn(itemRepository, 'deleteItem').mockRejectedValue(new Error());

      await expect(service.deleteItem(1)).rejects.toThrow();
    });
  });

  describe('updateItem', () => {
    it('should update an item', async () => {
      const updateItemDto: CreateUpdateItemIntDto = {
        userId: 1,
        friendId: 2,
        name: 'Updated Item',
        images: ['updated-image.png'],
        height: 5,
        length: 5,
        weight: 5,
        width: 5,
        id: 5,
      };

      const updatedItem = new ItemDto(
        'Updated Item',
        'Owner Name',
        1,
        2,
        5000,
        5,
        5,
        5,
        5,
        'updated-image.png',
        10,
      );

      jest.spyOn(itemRepository, 'updateItem').mockResolvedValue(updatedItem);

      const result = await service.updateItem(updateItemDto);

      expect(result).toEqual(updateItemDto);
    });

    it('should throw an error if item update fails', async () => {
      jest.spyOn(itemRepository, 'updateItem').mockRejectedValue(new Error());

      await expect(
        service.updateItem({} as CreateUpdateItemIntDto),
      ).rejects.toThrow();
    });
  });

  describe('getItem', () => {
    it('should return an item', async () => {
      const item = new Item();
      jest.spyOn(itemRepository, 'getItem').mockResolvedValue(item);

      const result = await service.getItem(1);

      expect(result).toEqual(expect.any(Object));
    });

    it('should throw an error if item not found', async () => {
      jest.spyOn(itemRepository, 'getItem').mockResolvedValue(null);

      await expect(service.getItem(1)).rejects.toThrow('Item not found.');
    });
  });

  describe('retrieveItemSizesAndCheckExchange', () => {
    it('should return item sizes', async () => {
      const items = [new Item(), new Item()];
      jest
        .spyOn(itemRepository, 'retrieveItemSizesAndCheckExchange')
        .mockResolvedValue(items);

      const result = await service.retrieveItemSizesAndCheckExchange(
        [1, 2],
        false,
      );

      expect(result).toHaveLength(2);
    });

    it('should throw an error if items are in an exchange', async () => {
      const item = new Item();
      item.exchange = new Exchange();

      jest
        .spyOn(itemRepository, 'retrieveItemSizesAndCheckExchange')
        .mockResolvedValue([item]);

      await expect(
        service.retrieveItemSizesAndCheckExchange([1], false),
      ).rejects.toThrow('One or more items are already in an exchange');
    });
  });

  describe('addExchangeToItems', () => {
    it('should add exchange to items', async () => {
      const addExchangeToItemDto: ToggleExchangeToItemDto = {
        exchange: new Exchange(),
        itemIds: [1, 2],
      };

      jest
        .spyOn(itemRepository, 'addExchangeToItems')
        .mockResolvedValue(undefined);

      await expect(
        service.addExchangeToItems(addExchangeToItemDto),
      ).resolves.toBeUndefined();
    });
  });

  describe('deleteExchangeFromItems', () => {
    it('should delete exchange from items', async () => {
      jest
        .spyOn(itemRepository, 'deleteExchangeFromItems')
        .mockResolvedValue(true);

      const result = await service.deleteExchangeFromItems([1, 2], false);

      expect(result).toBe(true);
    });

    it('should throw an error if exchange deletion fails', async () => {
      jest
        .spyOn(itemRepository, 'deleteExchangeFromItems')
        .mockRejectedValue(new Error());

      await expect(
        service.deleteExchangeFromItems([1, 2], false),
      ).rejects.toThrow();
    });
  });

  describe('uploadItemImage', () => {
    it('should upload item image', async () => {
      const uploadItemImageDto: UploadItemImageDto = {
        file: 'test-image.png',
        itemId: '1',
      };

      jest
        .spyOn(itemRepository, 'uploadItemImage')
        .mockResolvedValue(undefined);

      await expect(
        service.uploadItemImage(uploadItemImageDto, false),
      ).resolves.toBeUndefined();
    });

    it('should throw an error if image upload fails', async () => {
      jest
        .spyOn(itemRepository, 'uploadItemImage')
        .mockRejectedValue(new Error());

      await expect(
        service.uploadItemImage({} as UploadItemImageDto, false),
      ).rejects.toThrow();
    });
  });

  describe('getItemImage', () => {
    it('should return item image URL', async () => {
      const url = 'http://test-image-url.com';
      jest.spyOn(service, 'getItemImage').mockResolvedValue(url);

      const result = await service.getItemImage(1);

      expect(result).toBe(url);
    });

    it('should throw an error if image URL retrieval fails', async () => {
      jest.spyOn(service, 'getItemImage').mockRejectedValue(new Error());

      await expect(service.getItemImage(1)).rejects.toThrow();
    });
  });

  describe('deleteItemImage', () => {
    it('should delete item image', async () => {
      jest
        .spyOn(itemRepository, 'deleteItemImage')
        .mockResolvedValue(undefined);

      await expect(service.deleteItemImage(1)).resolves.toBeUndefined();
    });

    it('should throw an error if image deletion fails', async () => {
      jest
        .spyOn(itemRepository, 'deleteItemImage')
        .mockRejectedValue(new Error());

      await expect(service.deleteItemImage(1)).rejects.toThrow();
    });
  });
});
