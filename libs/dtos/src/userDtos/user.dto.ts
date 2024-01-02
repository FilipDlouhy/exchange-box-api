export class UserDto {
  name: string;
  email: string;
  id: number;

  constructor(name: string, email: string, id: number) {
    if (!name || !email || !id) {
      throw new Error('Missing required user information');
    }

    this.name = name;
    this.email = email;
    this.id = id;
  }
}
