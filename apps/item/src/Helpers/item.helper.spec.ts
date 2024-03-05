import { CreateUpdateItemIntDto } from 'libs/dtos/itemDtos/create.udpate.item.int.dto';
import {
  toItemDto,
  toItemSimpleDto,
  transformCreateItemToIntDto,
} from './item.helpers';
import { CreateUpdateItemDto } from 'libs/dtos/itemDtos/create.update.item.dto';
import { Item } from '../../../../libs/database/src/entities/item.entity';
import { User } from '../../../../libs/database/src/entities/user.entity';
import { ItemDto } from '../../../../libs/dtos/itemDtos/item.dto';
import { Exchange } from '../../../../libs/database/src/entities/exchange.entity';
import { ItemSimpleDto } from 'libs/dtos/itemDtos/item.simple.dto';

describe('transformCreateItemToIntDto', () => {
  it('should correctly transform and parse all string fields to integers', () => {
    const input: CreateUpdateItemDto = {
      id: '1',
      name: 'Test Item',
      userId: '1',
      friendId: '2',
      weight: '5',
      length: '10',
      width: '20',
      height: '15',
      images: [],
    };
    const expected: CreateUpdateItemIntDto = {
      length: 10,
      width: 20,
      height: 15,
      name: 'Test Item',
      userId: 1,
      friendId: 2,
      weight: 5,
      images: [],
      id: 1,
    };

    const result = transformCreateItemToIntDto(input);
    expect(result).toEqual(expected);
  });

  it('should assign 0 to integer fields if input is invalid or empty strings', () => {
    const input: CreateUpdateItemDto = {
      length: '',
      width: '',
      height: '',
      name: 'Test Item',
      userId: '',
      friendId: '',
      weight: '',
      images: ['image1.jpg'],
    };

    const expected: CreateUpdateItemIntDto = {
      length: 0,
      width: 0,
      height: 0,
      name: 'Test Item',
      userId: 0,
      friendId: 0,
      weight: 0,
      images: ['image1.jpg'],
    };

    const result = transformCreateItemToIntDto(input);
    expect(result).toEqual(expected);
  });
});

describe('toItemDto', () => {
  it('should correctly transform an Item entity to ItemDto', () => {
    const user1 = new User({
      id: 1,
      name: 'User 1',
      email: 'user1@example.com',
      password: 'password1',
    });

    const user2 = new User({
      id: 2,
      name: 'User 2',
      email: 'user2@example.com',
      password: 'password2',
    });

    user1.friends = [user2];
    user2.friends = [user1];

    const item: Item = {
      id: 1,
      name: 'Test Item',
      user: user1,
      friend: user2,
      weight: 5,
      length: 10,
      width: 20,
      height: 15,
      imageUrl: 'itemImage.jpg',
      exchange: new Exchange(),
    };

    const expected: ItemDto = new ItemDto(
      'Test Item',
      'User 2',
      1,
      2,
      5,
      1,
      10,
      20,
      15,
      'itemImage.jpg',
    );

    const result = toItemDto(item);
    expect(result).toEqual(expected);
  });

  describe('toItemSimpleDto', () => {
    it('should correctly transform an Item entity to ItemSimpleDto', () => {
      const user = new User({
        id: 1,
        name: 'User 1',
        email: 'user1@example.com',
        password: 'password1',
      });

      const friend = new User({
        id: 2,
        name: 'User 2',
        email: 'user2@example.com',
        password: 'password2',
      });

      user.friends = [friend];
      friend.friends = [user];

      const item: Item = {
        id: 1,
        name: 'Test Item',
        user: user,
        friend: friend,
        weight: 5,
        length: 10,
        width: 20,
        height: 15,
        imageUrl: 'itemImage.jpg',
        exchange: new Exchange(),
      };

      const expected = new ItemSimpleDto(
        item.name,
        item.weight,
        item.id,
        item.length,
        item.width,
        item.height,
      );

      const result = toItemSimpleDto(item);

      expect(result).toEqual(expected);
    });
  });
});
