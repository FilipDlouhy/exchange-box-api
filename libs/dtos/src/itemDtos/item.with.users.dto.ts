import { UserDto } from '../userDtos/user.dto';
import { ItemDto } from './item.dto';

export class ItemWithUsersDto {
  item: ItemDto;
  creator: UserDto;
  pickUpPerson: UserDto;

  constructor(item: ItemDto, creator: UserDto, pickUpPerson: UserDto) {
    this.item = item;
    this.creator = creator;
    this.pickUpPerson = pickUpPerson;
  }
}
