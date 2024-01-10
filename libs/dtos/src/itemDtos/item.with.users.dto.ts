import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserDto } from '../userDtos/user.dto';
import { ItemDto } from './item.dto';

export class ItemWithUsersDto {
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  item: ItemDto;

  @ValidateNested()
  @Type(() => UserDto)
  creator: UserDto;

  @ValidateNested()
  @Type(() => UserDto)
  pickUpPerson: UserDto;

  constructor(item: ItemDto, creator: UserDto, pickUpPerson: UserDto) {
    this.item = item;
    this.creator = creator;
    this.pickUpPerson = pickUpPerson;
  }
}
