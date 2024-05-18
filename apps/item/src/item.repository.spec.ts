import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemRepository } from './item.repository';
import { Item } from '../../../libs/database/src/entities/item.entity';
import { User } from '../../../libs/database/src/entities/user.entity';
import { CreateUpdateItemIntDto } from 'libs/dtos/itemDtos/create.udpate.item.int.dto';
import { UploadItemImageDto } from 'libs/dtos/itemDtos/upload.item.image.dto';
import { ToggleExchangeToItemDto } from 'libs/dtos/itemDtos/toggle.exchange.id.dto';
import { profileManagementCommands } from '@app/tcp/userMessagePatterns/user.profile.message.patterns';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import * as database from '@app/database';
import { ItemDto } from 'libs/dtos/itemDtos/item.dto';

jest.mock('@app/database');

describe('ItemRepository', () => {
  let itemRepository: ItemRepository;
  let itemRepoMock: Partial<Record<keyof Repository<Item>, jest.Mock>>;

  beforeEach(async () => {
    itemRepoMock = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemRepository,
        { provide: getRepositoryToken(Item), useValue: itemRepoMock },
      ],
    }).compile();

    itemRepository = module.get<ItemRepository>(ItemRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createItem', () => {
    it('should create and save a new item', async () => {
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
      const createUpdateItemDto: CreateUpdateItemIntDto = {
        userId: 1,
        friendId: 2,
        name: 'Test Item',
        height: 10,
        length: 15,
        weight: 5,
        width: 20,
        images: [],
        id: 1,
      };

      const newItem = new Item();
      newItem.id = 1;

      itemRepoMock.create.mockReturnValue(newItem);
      itemRepoMock.save.mockResolvedValue(newItem);

      const result = await itemRepository.createItem(
        user,
        friend,
        createUpdateItemDto,
      );

      expect(itemRepoMock.create).toHaveBeenCalledWith({
        user: user,
        friend: friend,
        height: createUpdateItemDto.height,
        length: createUpdateItemDto.length,
        name: createUpdateItemDto.name,
        weight: createUpdateItemDto.weight,
        width: createUpdateItemDto.width,
      });

      expect(itemRepoMock.save).toHaveBeenCalledWith(newItem);
      expect(result).toEqual(newItem);
    });
  });

  describe('getAllItems', () => {
    it('should fetch all items', async () => {
      const items = [new Item(), new Item()];
      itemRepoMock.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(items),
      });

      const result = await itemRepository.getAllItems();

      expect(result).toEqual(items);
    });

    it('should throw an error if fetching items fails', async () => {
      itemRepoMock.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(new Error('Error fetching items')),
      });

      await expect(itemRepository.getAllItems()).rejects.toThrow(
        'Failed to retrieve items',
      );
    });
  });

  describe('getUserItems', () => {
    it('should fetch user items', async () => {
      const items = [new Item(), new Item()];
      itemRepoMock.find.mockResolvedValue(items);

      const result = await itemRepository.getUserItems(
        1,
        false,
        0,
        10,
        'search',
      );

      expect(result).toEqual(items);
    });

    it('should throw an error if fetching user items fails', async () => {
      itemRepoMock.find.mockRejectedValue(
        new Error('Error fetching user items'),
      );

      await expect(
        itemRepository.getUserItems(1, false, 0, 10, 'search'),
      ).rejects.toThrow('Failed to retrieve user items');
    });
  });

  describe('getUserItemSimpleForExchange', () => {
    it('should fetch simplified items for exchange', async () => {
      const items = [new Item(), new Item()];
      itemRepoMock.find.mockResolvedValue(items);

      const result = await itemRepository.getUserItemSimpleForExchange(
        1,
        false,
      );

      expect(result).toEqual(items);
    });

    it('should throw an error if fetching simplified items fails', async () => {
      itemRepoMock.find.mockRejectedValue(
        new Error('Error fetching simplified items'),
      );

      await expect(
        itemRepository.getUserItemSimpleForExchange(1, false),
      ).rejects.toThrow('Failed to fetch simplified items for exchange');
    });
  });

  describe('deleteItem', () => {
    it('should delete an item', async () => {
      const item = new Item();
      item.id = 1;

      itemRepoMock.findOne.mockResolvedValue(item);
      itemRepoMock.delete.mockResolvedValue({ affected: 1 });

      const result = await itemRepository.deleteItem(1);

      expect(itemRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['exchange', 'user'],
      });
      expect(itemRepoMock.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should throw an error if the item is part of an exchange', async () => {
      const item = new Item();
      item.id = 1;
      item.exchange = new database.Exchange();

      itemRepoMock.findOne.mockResolvedValue(item);

      await expect(itemRepository.deleteItem(1)).rejects.toThrow(
        'Item is part of an exchange and cannot be deleted.',
      );
    });

    it('should throw an error if the item is not found', async () => {
      itemRepoMock.findOne.mockResolvedValue(null);

      await expect(itemRepository.deleteItem(1)).rejects.toThrow(
        'Item not found.',
      );
    });

    it('should throw an error if the item cannot be deleted', async () => {
      const item = new Item();
      item.id = 1;

      itemRepoMock.findOne.mockResolvedValue(item);
      itemRepoMock.delete.mockResolvedValue({ affected: 0 });

      await expect(itemRepository.deleteItem(1)).rejects.toThrow(
        'Item could not be deleted.',
      );
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

      const item = new Item();
      item.id = 5;
      item.friend = new User({
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
      item.friend.id = 2;
      item.user = new User({
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
      item.user.id = 1;

      itemRepoMock.findOne.mockResolvedValue(item);
      itemRepoMock.save.mockResolvedValue(item);

      const result = await itemRepository.updateItem(updateItemDto);

      expect(itemRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: updateItemDto.id },
        relations: ['friend', 'user'],
      });
      expect(itemRepoMock.save).toHaveBeenCalledWith(
        expect.objectContaining(updateItemDto),
      );
      expect(result).toEqual(expect.any(ItemDto));
    });

    it('should throw an error if the item is not found', async () => {
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

      itemRepoMock.findOne.mockResolvedValue(null);

      await expect(itemRepository.updateItem(updateItemDto)).rejects.toThrow(
        'Item not found.',
      );
    });
  });

  describe('uploadItemImage', () => {
    it('should upload an item image', async () => {
      const uploadItemImageDto: UploadItemImageDto = {
        file: 'test-file',
        itemId: '1',
      };

      const item = new Item();
      item.id = 1;

      itemRepoMock.findOneBy.mockResolvedValue(item);
      itemRepoMock.save.mockResolvedValue(item);

      await itemRepository.uploadItemImage(uploadItemImageDto, false);

      expect(database.uploadFileToFirebase).toHaveBeenCalledWith(
        uploadItemImageDto.file,
        uploadItemImageDto.itemId,
        'Items',
      );
      expect(itemRepoMock.save).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: 'new-image-url' }),
      );
    });

    it('should throw an error if the item is not found', async () => {
      const uploadItemImageDto: UploadItemImageDto = {
        file: 'test-file',
        itemId: '1',
      };

      itemRepoMock.findOneBy.mockResolvedValue(null);

      await expect(
        itemRepository.uploadItemImage(uploadItemImageDto, false),
      ).rejects.toThrow('Item not found.');
    });
  });

  describe('getItem', () => {
    it('should fetch an item by ID', async () => {
      const item = new Item();
      item.id = 1;

      itemRepoMock.findOne.mockResolvedValue(item);

      const result = await itemRepository.getItem(1);

      expect(itemRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['user', 'friend'],
      });
      expect(result).toEqual(item);
    });

    it('should throw an error if the item is not found', async () => {
      itemRepoMock.findOne.mockResolvedValue(null);

      await expect(itemRepository.getItem(1)).rejects.toThrow(
        'Item not found.',
      );
    });
  });

  describe('retrieveItemSizesAndCheckExchange', () => {
    it('should fetch item sizes and check exchange status', async () => {
      const items = [new Item(), new Item()];
      items[0].exchange = null;
      items[1].exchange = null;

      itemRepoMock.find.mockResolvedValue(items);

      const result = await itemRepository.retrieveItemSizesAndCheckExchange(
        [1, 2],
        false,
      );

      expect(result).toEqual(items);
    });

    it('should throw an error if any item is in an exchange and not updating', async () => {
      const items = [new Item(), new Item()];
      items[0].exchange = null;
      items[1].exchange = new database.Exchange();

      itemRepoMock.find.mockResolvedValue(items);

      await expect(
        itemRepository.retrieveItemSizesAndCheckExchange([1, 2], false),
      ).rejects.toThrow('One or more items are already in an exchange');
    });
  });

  describe('addExchangeToItems', () => {
    it('should add exchange to items', async () => {
      const addExchangeToItemDto: ToggleExchangeToItemDto = {
        exchange: new database.Exchange(),
        itemIds: [1, 2],
      };

      const items = [new Item(), new Item()];
      itemRepoMock.findByIds.mockResolvedValue(items);

      const result =
        await itemRepository.addExchangeToItems(addExchangeToItemDto);

      expect(itemRepoMock.findByIds).toHaveBeenCalledWith(
        addExchangeToItemDto.itemIds,
      );
      expect(result).toEqual(items);
    });

    it('should throw an error if no items are found', async () => {
      itemRepoMock.findByIds.mockResolvedValue([]);

      await expect(
        itemRepository.addExchangeToItems({
          exchange: new database.Exchange(),
          itemIds: [1, 2],
        }),
      ).rejects.toThrow('No items found.');
    });
  });

  describe('deleteExchangeFromItems', () => {
    it('should delete exchange from items', async () => {
      const items = [new Item(), new Item()];
      items[0].exchange = new database.Exchange();
      items[1].exchange = new database.Exchange();

      itemRepoMock.findByIds.mockResolvedValue(items);
      itemRepoMock.save.mockResolvedValue(items);

      const result = await itemRepository.deleteExchangeFromItems(
        [1, 2],
        false,
      );

      expect(itemRepoMock.findByIds).toHaveBeenCalledWith([1, 2]);
      expect(itemRepoMock.save).toHaveBeenCalledWith(
        expect.arrayContaining(
          items.map((item) => ({ ...item, exchange: null })),
        ),
      );
      expect(result).toBe(true);
    });

    it('should remove items if exchange is done', async () => {
      const items = [new Item(), new Item()];

      itemRepoMock.findByIds.mockResolvedValue(items);
      itemRepoMock.remove.mockResolvedValue(items);

      const result = await itemRepository.deleteExchangeFromItems([1, 2], true);

      expect(itemRepoMock.findByIds).toHaveBeenCalledWith([1, 2]);
      expect(itemRepoMock.remove).toHaveBeenCalledWith(items);
      expect(result).toBe(true);
    });

    it('should throw an error if no items are found', async () => {
      itemRepoMock.findByIds.mockResolvedValue([]);

      await expect(
        itemRepository.deleteExchangeFromItems([1, 2], false),
      ).rejects.toThrow('No items found.');
    });
  });

  describe('getSavedItemd', () => {
    it('should retrieve saved item by ID', async () => {
      const item = new Item();
      item.id = 1;

      itemRepoMock.findOne.mockResolvedValue(item);

      const result = await itemRepository.getSavedItemd(1);

      expect(itemRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['user', 'friend'],
      });
      expect(result).toEqual(item);
    });
  });
});
