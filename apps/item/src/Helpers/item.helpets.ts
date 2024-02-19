import { CreateItemDto } from 'libs/dtos/itemDtos/create.item.dto';
import { CreateItemIntDto } from 'libs/dtos/itemDtos/create.item.int.dto';

export function transformCreateItemToIntDto(
  createItemDto: CreateItemDto,
): CreateItemIntDto {
  return {
    length: parseInt(createItemDto.length, 10) || 0,
    width: parseInt(createItemDto.width, 10) || 0,
    height: parseInt(createItemDto.height, 10) || 0,
    name: createItemDto.name,
    userId: parseInt(createItemDto.userId, 10) || 0,
    friendId: parseInt(createItemDto.friendId, 10) || 0,
    weight: parseInt(createItemDto.weight, 10) || 0,
    images: createItemDto.images,
  };
}
