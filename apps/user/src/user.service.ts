import { CreateUserDto } from '@app/dtos/userDtos/create.user.dto';
import { ToggleFriendDto } from '@app/dtos/userDtos/toggle.friend.dto';
import { UpdateUserDto } from '@app/dtos/userDtos/update.user.dto';
import { UploadUserImageDto } from '@app/dtos/userDtos/upload.user.image.dto';
import { UserDto } from '@app/dtos/userDtos/user.dto';
import {
  deleteFileFromFirebase,
  getImageUrlFromFirebase,
  updateFileInFirebase,
  uploadFileToFirebase,
} from '@app/database';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@app/database/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  /**
   * Creates a new user in the 'user' table using the provided CreateUserDto.
   * It hashes the password before storing it in the database.
   * After insertion, it retrieves and returns the newly created user details, except for the password.
   * @param {CreateUserDto} createUserDto - The DTO containing the new user data.
   * @returns {Promise<UserDto>} - The DTO of the newly created user.
   */
  async createUser(createUserDto: CreateUserDto): Promise<UserDto> {
    try {
      createUserDto.password = await bcrypt.hash(createUserDto.password, 10);

      const user = await this.userRepository.save(createUserDto);
      const newUserDto = new UserDto(user.name, user.email, user.id);
      return newUserDto;
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
      const user = await this.userRepository.findOne({
        where: { id },
      });

      return new UserDto(user.name, user.email, user.id, user.imageUrl);
    } catch (err) {
      console.error('Error retrieving user:', err);
      throw new Error('Error retrieving user');
    }
  }

  async getUserForItemUpdate(id: number): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
      });

      return user;
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

      // Find the user first
      const user = await this.userRepository.findOne({
        where: { id: updateUserDto.id },
      });
      if (!user) {
        throw new Error('User not found');
      }

      // Update user properties
      user.name = updateUserDto.name;
      user.email = updateUserDto.email;
      user.password = hashedPassword;

      // Save the updated user
      await this.userRepository.save(user);

      // Return the updated user data (omit sensitive fields like password)
      const updatedUser = new UserDto(user.name, user.email, user.id);
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
      const users = await this.userRepository.find({
        select: ['id', 'name', 'email', 'imageUrl'],
      });

      const userDtos: UserDto[] = users.map(
        (user) => new UserDto(user.name, user.email, user.id, user.imageUrl),
      );

      return userDtos;
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
      const result = await this.userRepository.delete(id);

      if (result.affected === 0) {
        throw new Error(`No user found with ID ${id}`);
      }

      return true;
    } catch (err) {
      throw new Error(
        `An error occurred during the deleteUser operation: ${err.message}`,
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
      // Get user and friend from the database with their friends loaded
      const user = await this.userRepository.findOne({
        where: { id: toggleFriendDto.userId },
        relations: ['friends'],
      });
      const friend = await this.userRepository.findOne({
        where: { id: toggleFriendDto.friendId },
        relations: ['friends'],
      });

      if (!user || !friend) {
        throw new Error('User or friend not found.');
      }

      // Check if the friendship already exists
      if (user.friends.some((f) => f.id === friend.id)) {
        throw new Error('Friendship already exists.');
      }

      // Add each user to the other's friends list
      user.friends = [...(user.friends || []), friend];
      friend.friends = [...(friend.friends || []), user];

      // Save the updated user entities
      await this.userRepository.save(user);
      await this.userRepository.save(friend);

      return true;
    } catch (err) {
      console.error(
        `An error occurred during the addFriend operation: ${err.message}`,
      );
      throw new Error('Unable to add friend. Please try again.');
    }
  }

  /**
   * This method attempts to remove a friend connection from the 'users_friend' table.
   * It takes an ID as an argument, which represents the unique identifier of the friend connection to remove.
   * If the operation is successful, it returns true. If it fails, it throws an error.
   * @param {number} id - The ID of the friend connection to remove.
   * @returns {Promise<boolean>} - A promise that resolves to true if the operation is successful.
   */
  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['friends'],
      });

      if (!user) {
        throw new Error('User not found.');
      }

      user.friends = user.friends.filter((friend) => friend.id !== friendId);

      await this.userRepository.save(user);

      return true;
    } catch (err) {
      console.error(
        `An error occurred during the removeFriend operation: ${err.message}`,
      );
      throw new Error('Failed to remove friend. Please try again.');
    }
  }

  /**
   * Asynchronously checks if two users are friends by querying the 'users_friend' table in the  database.
   *
   * @param userId - The ID of the first user.
   * @param friendId - The ID of the second user.
   * @returns A boolean indicating whether the two users are friends.
   */
  async checkIfFriends(userId: number, friendId: number): Promise<boolean> {
    try {
      // Find the user by ID
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['friends'],
      });
      if (!user) {
        throw new Error('User not found.');
      }

      // Find the friend by ID
      const friend = await this.userRepository.findOne({
        where: { id: friendId },
      });
      if (!friend) {
        throw new Error('Friend not found.');
      }

      // Check if the found friend is in the user's friends list
      const isFriend = user.friends.some((f) => f.id === friendId);
      if (!isFriend) {
        throw new Error('The specified users are not friends.');
      }

      return true;
    } catch (err) {
      console.error(`Error in checking friendship status: ${err.message}`);
      throw new Error('Failed to check friendship status. Please try again.');
    }
  }

  /**
   * Retrieves two users based on the provided user_id and friend_id.
   * Returns user details except for the password.
   *
   * @param {number} userId - The unique identifier of the first user.
   * @param {number} friendId - The unique identifier of the second user (friend).
   * @returns {Promise<{ user: User, friend: User }>} - DTOs of the retrieved users.
   */
  async getUserWithFriend(
    userId: number,
    friendId: number,
  ): Promise<{ user: User; friend: User }> {
    try {
      // Fetch both users from the database
      const users = await this.userRepository.findByIds([userId, friendId]);

      // Extract the user and friend data
      const userEntity = users.find((user) => user.id === userId);
      const friendEntity = users.find((user) => user.id === friendId);

      if (!userEntity || !friendEntity) {
        throw new Error('One or both users not found');
      }

      return { user: userEntity, friend: friendEntity };
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
  ): Promise<boolean> {
    try {
      // Upload image to Firebase and get the URL
      const imageUrl = update
        ? await updateFileInFirebase(
            uploadUserImageDto.file,
            uploadUserImageDto.userId,
            'Users',
          )
        : await uploadFileToFirebase(
            uploadUserImageDto.file,
            uploadUserImageDto.userId,
            'Users',
          );

      // Find the user by ID
      const user = await this.userRepository.findOne({
        where: { id: parseInt(uploadUserImageDto.userId) },
      });

      // If user does not exist, throw an error
      if (!user) {
        throw new Error(`User with ID ${uploadUserImageDto.userId} not found`);
      }

      // Update the user's image URL
      user.imageUrl = imageUrl;
      await this.userRepository.save(user);

      return true;
    } catch (error) {
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
   * Deletes a user's image from Firebase Storage and updates the user's imageUrl to null in the database.
   *
   * @param id - The ID of the user whose image is to be deleted.
   * @throws - Propagates any errors that occur during image deletion or database update.
   */
  async deleteUserImage(id: number) {
    try {
      await deleteFileFromFirebase(id.toString(), 'Users');

      await this.userRepository.update(id, { imageUrl: null });
    } catch (error) {
      console.error('Error deleting user image:', error);
      throw error;
    }
  }

  /**
   * Retrieves a user from the database based on their email.
   *
   * @param userEmail - The email of the user to retrieve.
   * @returns A Promise that resolves to the user if found, or rejects with an error.
   */
  async getUserByEmail(userEmail: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: userEmail },
      });

      return user;
    } catch (err) {
      console.error('Error retrieving user:', err);
      throw new Error('Error retrieving user');
    }
  }
}
