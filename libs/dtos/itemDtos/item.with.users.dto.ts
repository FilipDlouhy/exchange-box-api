import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ItemDto } from './item.dto';
import { User } from '@app/database/entities/user.entity';

class UserDto {
  // Define the properties of the User DTO as needed
  // For example: id, username, email, etc.
  constructor(
    public id: number,
    public username: string,
    public email: string,
    // ...other properties
  ) {}
}

export class ItemWithUsersDto {
  @ValidateNested()
  @Type(() => ItemDto)
  item: ItemDto;

  @ValidateNested()
  @Type(() => UserDto)
  creator: UserDto;

  @ValidateNested()
  @Type(() => UserDto)
  pickUpPerson: UserDto;

  constructor(item: ItemDto, creator: User, pickUpPerson: User) {
    this.item = item;
    this.creator = new UserDto(creator.id, creator.name, creator.email);
    this.pickUpPerson = new UserDto(
      pickUpPerson.id,
      pickUpPerson.name,
      pickUpPerson.email,
    );
  }
}
