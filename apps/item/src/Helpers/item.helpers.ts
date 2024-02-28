import { CreateUpdateItemDto } from 'libs/dtos/itemDtos/create.update.item.dto';
import { CreateUpdateItemIntDto } from 'libs/dtos/itemDtos/create.udpate.item.int.dto';
import { ItemDto } from 'libs/dtos/itemDtos/item.dto';
import { Item } from '@app/database/entities/item.entity';

export function transformCreateItemToIntDto(
  createUpdateItemDto: CreateUpdateItemDto,
): CreateUpdateItemIntDto {
  const intDto: CreateUpdateItemIntDto = {
    length: parseInt(createUpdateItemDto.length, 10) || 0,
    width: parseInt(createUpdateItemDto.width, 10) || 0,
    height: parseInt(createUpdateItemDto.height, 10) || 0,
    name: createUpdateItemDto.name,
    userId: parseInt(createUpdateItemDto.userId, 10) || 0,
    friendId: parseInt(createUpdateItemDto.friendId, 10) || 0,
    weight: parseInt(createUpdateItemDto.weight, 10) || 0,
    images: createUpdateItemDto.images,
  };

  if (createUpdateItemDto.id !== undefined) {
    intDto.id = parseInt(createUpdateItemDto.id, 10) || undefined;
  }

  return intDto;
}

export function toItemDto(item: Item): ItemDto {
  return new ItemDto(
    item.name,
    item.friend.name,
    item.user.id,
    item.friend.id,
    item.weight,
    item.id,
    item.length,
    item.width,
    item.height,
    item.imageUrl,
  );
}
