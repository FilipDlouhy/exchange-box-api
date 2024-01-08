import { CreateUserDto } from '@app/dtos/userDtos/create.user.dto';
import { ToggleFriendDto } from '@app/dtos/userDtos/toggle.friend.dto';
import { UpdateUserDto } from '@app/dtos/userDtos/update.user.dto';
import { UserDto } from '@app/dtos/userDtos/user.dto';
import { supabase } from '@app/tables';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  /**
   * Creates a new user in the 'user' table using the provided CreateUserDto.
   * It hashes the password before storing it in the database.
   * After insertion, it retrieves and returns the newly created user details, except for the password.
   * @param {CreateUserDto} createUserDto - The DTO containing the new user data.
   * @returns {Promise<UserDto>} - The DTO of the newly created user.
   */
  async createUser(createUserDto: CreateUserDto): Promise<UserDto> {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const { data, error } = await supabase
        .from('user')
        .insert([
          {
            name: createUserDto.name,
            email: createUserDto.email,
            password: hashedPassword,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ])
        .select('id, name, email')
        .single();

      if (error) throw error;

      const newUser = new UserDto(data.name, data.email, data.id);
      return newUser;
    } catch (err) {
      console.error('Error creating user:', err);
      throw new Error('Error creating user');
    }
  }

  /**
   * Retrieves a single user based on the provided ID.
   * Returns user details except for the password.
   * @param {number} id - The unique identifier of the user to retrieve.
   * @returns {Promise<UserDto>} - The DTO of the retrieved user.
   */
  async getUser(id: number): Promise<UserDto> {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('id, name, email')
        .eq('id', id)
        .single();

      if (error) throw error;

      const foundUser = new UserDto(data.name, data.email, data.id);
      return foundUser;
    } catch (err) {
      console.error('Error retrieving user:', err);
      throw new Error('Error retrieving user');
    }
  }

  /**
   * Updates a user in the 'user' table using the provided UpdateUserDto.
   * Hashes the new password before updating it in the database.
   * After the update, it retrieves and returns the updated user details, except for the password.
   * @param {UpdateUserDto} updateUserDto - The DTO containing the updated user data.
   * @returns {Promise<UserDto>} - The DTO of the updated user.
   */
  async updateUser(updateUserDto: UpdateUserDto): Promise<UserDto> {
    try {
      const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);

      const { data, error } = await supabase
        .from('user')
        .update({
          name: updateUserDto.name,
          email: updateUserDto.email,
          password: hashedPassword,
          updated_at: new Date(),
        })
        .eq('id', updateUserDto.id)
        .select('id, name, email')
        .single();

      if (error) throw error;

      const updatedUser = new UserDto(data.name, data.email, data.id);
      return updatedUser;
    } catch (err) {
      console.error('Error updating user:', err);
      throw new Error('Error updating user');
    }
  }

  /**
   * Retrieves all users from the 'user' table.
   * Returns a list of user details except for their passwords.
   * @returns {Promise<UserDto[]>} - An array of UserDto representing all users.
   */
  async getUsers(): Promise<UserDto[]> {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('id, name, email'); // Exclude the password for security

      if (error) throw error;

      return data;
    } catch (err) {
      console.error('Error fetching users:', err);
      throw new Error('Error retrieving users');
    }
  }

  /**
   * Attempts to delete a user from the 'user' table by the given ID.
   * It uses the 'match' method to target the specific user row for deletion.
   * If the operation is successful, it returns true.
   * If the operation fails, it logs the error and throws an exception.
   * @param {number} id - The unique identifier of the user to be deleted.
   * @returns {Promise<boolean>} - A promise that resolves to true if the deletion is successful.
   */
  async deleteUser(id: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user')
        .delete()
        .match({ id });

      if (error) {
        throw new Error(`Error deleting user with ID ${id}: ${error.message}`);
      }

      return true;
    } catch (err) {
      throw new Error(
        `An error occurred during the deleteUser operation:  ${err.message}`,
      );
    }
  }

  /**
   * This method adds a new friend connection to the 'users_friend' table.
   * It first checks if a friendship between the given user IDs already exists to avoid duplicates.
   * If the friendship doesn't exist, it proceeds to insert a new record.
   * @param {ToggleFriendDto} toggleFriendDto - Data Transfer Object containing user_id and friend_id.
   * @returns {Promise<boolean>} - A promise that resolves to true if the operation is successful.
   */
  async addFriend(toggleFriendDto: ToggleFriendDto): Promise<boolean> {
    try {
      // Check for an existing friendship
      const { data: existing, error: existingError } = await supabase
        .from('users_friend')
        .select('*')
        .eq('user_id', toggleFriendDto.user_id)
        .eq('friend_id', toggleFriendDto.friend_id);

      if (existingError) {
        throw new Error(
          `Error checking for existing friendship: ${existingError.message}`,
        );
      }

      if (existing && existing.length > 0) {
        throw new Error('Friendship already exists.');
      }

      const { data, error } = await supabase.from('users_friend').insert([
        {
          user_id: toggleFriendDto.user_id,
          friend_id: toggleFriendDto.friend_id,
        },
      ]);

      if (error) {
        throw new Error(`Error adding new friend: ${error.message}`);
      }

      return true;
    } catch (err) {
      console.error(
        `An error occurred during the addFriend operation: ${err.message}`,
      );
      throw new Error('Friendship already exitsts. Please try again.');
    }
  }

  /**
   * This method attempts to remove a friend connection from the 'users_friend' table.
   * It takes an ID as an argument, which represents the unique identifier of the friend connection to remove.
   * If the operation is successful, it returns true. If it fails, it throws an error.
   * @param {number} id - The ID of the friend connection to remove.
   * @returns {Promise<boolean>} - A promise that resolves to true if the operation is successful.
   */
  async removeFriend(id: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users_friend')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(
          `Unable to delete friend with ID: ${id}. Error: ${error.message}`,
        );
      }

      return true;
    } catch (err) {
      console.error(
        `An error occurred during the removeFriend operation: ${err.message}`,
      );
      throw new Error('Failed to remove friend. Please try again.');
    }
  }

  /**
   * Asynchronously checks if two users are friends by querying the 'users_friend' table in the Supabase database.
   *
   * @param user_id - The ID of the first user.
   * @param friend_id - The ID of the second user.
   * @returns A boolean indicating whether the two users are friends.
   */
  async checkIfFriends(user_id: number, friend_id: number): Promise<boolean> {
    try {
      const { data: existing, error: existingError } = await supabase
        .from('users_friend')
        .select('*')
        .eq('user_id', user_id)
        .eq('friend_id', friend_id);

      if (existingError) {
        throw new Error(`Database query error: ${existingError.message}`);
      }

      return existing && existing.length > 0;
    } catch (error) {
      console.error('Error in checking friendship status:', error);

      throw new Error('Failed to check friendship status. Please try again.');
    }
  }
}
