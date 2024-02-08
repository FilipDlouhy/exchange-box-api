import { IsInt, IsString, IsArray, IsNotEmpty } from 'class-validator';
import { User } from '@app/database/entities/user.entity';
import { Item } from '@app/database/entities/item.entity';

class UserDto {
  // Define the properties of the User DTO as needed
  // For example: username, email, etc.
  constructor(
    public id: number,
    public username: string,
    public email: string,
    // ...other properties
  ) {}
}

export class ExchangeWithUserDto {
  @IsNotEmpty()
  @IsInt()
  public creator: UserDto;

  @IsNotEmpty()
  @IsInt()
  public pickUpPerson: UserDto;

  @IsNotEmpty()
  @IsString()
  public boxSize: string;

  @IsNotEmpty()
  @IsArray()
  public items: Item[];

  @IsNotEmpty()
  @IsInt()
  public id: number;

  constructor(
    creator: User,
    pickUpPerson: User,
    boxSize: string,
    id: number,
    items: Item[],
  ) {
    // Create UserDto instances from the provided User objects
    this.creator = new UserDto(creator.id, creator.name, creator.email);
    this.pickUpPerson = new UserDto(
      pickUpPerson.id,
      pickUpPerson.name,
      pickUpPerson.email,
    );
    this.boxSize = boxSize;
    this.id = id;
    this.items = items;
  }
}
