import { CreateUserDto } from '@app/dtos/userDtos/create.user.dto';
import { ToggleFriendDto } from '@app/dtos/userDtos/toggle.friend.dto';
import { UpdateUserDto } from '@app/dtos/userDtos/update.user.dto';
import { UploadUserImageDto } from '@app/dtos/userDtos/upload.user.image.dto';
import { UserDto } from '@app/dtos/userDtos/user.dto';
import {
  deleteFileFromFirebase,
  getImageUrlFromFirebase,
  supabase,
  updateFileInFirebase,
  uploadFileToFirebase,
} from '@app/database';
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
        .select('id, name, email, image_url');
      if (error) throw error;

      const users: UserDto[] = data.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        imageURL: user.image_url,
      }));

      return users;
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
      const { error } = await supabase.from('user').delete().match({ id });

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
      const { error } = await supabase
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

  /**
   * Retrieves two users based on the provided user_id and friend_id.
   * Returns user details except for the password.
   *
   * @param {number} user_id - The unique identifier of the first user.
   * @param {number} friend_id - The unique identifier of the second user (friend).
   * @returns {Promise<{ user: UserDto, friend: UserDto }>} - DTOs of the retrieved users.
   */
  async getUserWithFriend(
    user_id: number,
    friend_id: number,
  ): Promise<{ user: UserDto; friend: UserDto }> {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('id, name, email')
        .in('id', [user_id, friend_id]);

      if (error) throw error;

      const userData = data.find((user) => user.id === user_id);
      const friendData = data.find((user) => user.id === friend_id);

      if (!userData || !friendData) {
        throw new Error('One or both users not found');
      }

      const user = new UserDto(userData.name, userData.email, userData.id);
      const friend = new UserDto(
        friendData.name,
        friendData.email,
        friendData.id,
      );

      return { user, friend };
    } catch (err) {
      console.error('Error retrieving users:', err);
      throw new Error('Error retrieving users');
    }
  }

  /**
   * Uploads or updates a user image in Firebase Storage based on the 'update' flag.
   * If 'update' is true, it updates the existing image, otherwise, it uploads a new one.
   *
   * @param uploadUserImageDto - Data transfer object containing the file to upload and the user ID.
   * @param update - A boolean flag that determines whether to update an existing image (true) or upload a new image (false).
   * @throws - Propagates any errors that occur during file upload or update.
   *           Errors may occur due to file upload issues, Firebase Storage operations, or database update operations.
   */
  async uploadUserImage(
    uploadUserImageDto: UploadUserImageDto,
    update: boolean,
  ) {
    try {
      const imageUrl = update
        ? await updateFileInFirebase(
            uploadUserImageDto.file,
            uploadUserImageDto.user_id,
            'Users',
          )
        : await uploadFileToFirebase(
            uploadUserImageDto.file,
            uploadUserImageDto.user_id,
            'Users',
          );

      await supabase
        .from('user')
        .update({
          image_url: imageUrl,
          updated_at: new Date(),
        })
        .eq('id', uploadUserImageDto.user_id);
    } catch (error) {
      // Handle or rethrow the error appropriately
      console.error('Error uploading user image:', error);
      throw error;
    }
  }

  /**
   * Retrieves the URL of a user's image from Firebase Storage.
   *
   * @param id - The ID of the user whose image URL is to be retrieved.
   * @returns - The URL of the user's image.
   * @throws - Propagates any errors that occur during URL retrieval.
   */
  async getUserImage(id: number): Promise<string> {
    try {
      return await getImageUrlFromFirebase(id.toString(), 'Users');
    } catch (error) {
      // Handle or rethrow the error appropriately
      console.error('Error getting user image URL:', error);
      throw error;
    }
  }

  /**
   * Deletes a user's image from Firebase Storage.
   *
   * @param id - The ID of the user whose image is to be deleted.
   * @throws - Propagates any errors that occur during image deletion.
   */
  async deleteUserImage(id: number) {
    try {
      await deleteFileFromFirebase(id.toString(), 'Users');
    } catch (error) {
      // Handle or rethrow the error appropriately
      console.error('Error deleting user image:', error);
      throw error;
    }
  }
}
