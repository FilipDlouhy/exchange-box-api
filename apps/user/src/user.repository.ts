import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../libs/database/src/entities/user.entity';
import { CreateUserDto } from 'libs/dtos/userDtos/create.user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateCurrentUserDto } from 'libs/dtos/userDtos/update.current.user.dto';
import { UserProfileDto } from 'libs/dtos/userDtos/user.profile.dto';
import { ToggleFriendDto } from 'libs/dtos/userDtos/toggle.friend.dto';
import { FriendRequest } from '@app/database';
import { ChangePasswordDto } from 'libs/dtos/userDtos/change.password.dto';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
  ) {}

  /**
   * Creates a new user in the database using the provided user data.
   * @param createUserDto The data necessary to create the user.
   * @throws ConflictException if the email already exists.
   * @throws BadRequestException if there's an error creating the user.
   */
  async createUser(createUserDto: CreateUserDto) {
    try {
      createUserDto.password = await bcrypt.hash(createUserDto.password, 10);

      await this.userRepository.save(createUserDto);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Email already exists');
      }
      console.error('Error creating user:', err);
      throw new BadRequestException('Error creating user');
    }
  }

  /**
   * Retrieves the profile of the current user based on the provided ID.
   * @param id The ID of the current user.
   * @returns A Promise that resolves to the user object with related entities loaded.
   * @throws NotFoundException if the user is not found.
   * @throws Error if there's an issue retrieving the user.
   */
  async getCurrentUserProfile(id: number): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: [
          'friends',
          'items',
          'exchanges',
          'exchanges.friend',
          'exchanges.items',
          'exchanges.user',
        ],
      });

      if (!user) {
        throw new NotFoundException(`User not found`);
      }

      delete user.password;

      return user;
    } catch (err) {
      console.error('Error retrieving user:', err);
      throw new Error('Error retrieving user');
    }
  }

  /**
   * Retrieves a user from the database based on the provided ID for updating an item.
   * @param id The ID of the user to retrieve.
   * @returns A Promise that resolves to the user object.
   * @throws Error if there's an issue retrieving the user.
   */
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
   * Finds a user in the database based on the provided ID.
   * @param id The ID of the user to find.
   * @returns A Promise that resolves to the user object, or rejects with an error.
   */
  async findUser(id: number): Promise<User> {
    try {
      return await this.userRepository.findOne({
        where: { id: id },
      });
    } catch (error) {
      console.error('Error finding user:', error);
      throw new Error('Failed to find user'); // Or a more specific error message
    }
  }

  /**
   * Updates the current user's information in the database based on the provided data.
   * @param updateCurrentUserDto The data necessary to update the current user.
   * @param user The current user object to update.
   * @returns A Promise that resolves when the current user is successfully updated.
   */
  async updateCurentUser(
    updateCurrentUserDto: UpdateCurrentUserDto,
    user: User,
  ): Promise<void> {
    Object.assign(user, {
      name: updateCurrentUserDto.name,
      telephone: updateCurrentUserDto.telephone,
      address: updateCurrentUserDto.address,
      email: updateCurrentUserDto.email,
      longitude: updateCurrentUserDto.longitude,
      latitude: updateCurrentUserDto.latitude,
    });

    await this.userRepository.save(user);
  }

  /**
   * Retrieves a list of users with selected fields from the database.
   * @returns A Promise that resolves to an array of User objects containing selected fields.
   * @throws NotFoundException if no users are found.
   * @throws InternalServerErrorException if there's an error retrieving users.
   */
  async getUsers(): Promise<User[]> {
    try {
      const users = await this.userRepository.find({
        select: [
          'id',
          'name',
          'email',
          'imageUrl',
          'email',
          'address',
          'telephone',
        ],
      });

      if (!users || users.length === 0) {
        throw new NotFoundException('No users found');
      }

      return users;
    } catch (err) {
      console.error('Error fetching users:', err);
      if (err instanceof NotFoundException) {
        throw err;
      } else {
        throw new InternalServerErrorException('Error retrieving users');
      }
    }
  }

  /**
   * Retrieves a user with their friends from the database based on the provided ID.
   * @param id The ID of the user to retrieve.
   * @returns A Promise that resolves to the user object with related friends loaded.
   * @throws An error if the user is not found or there's an issue retrieving the user.
   */
  async getUserWithFriends(id: number): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: id },
        relations: ['friends'],
      });

      if (!user) {
        throw new Error(`User with id ${id} not found.`);
      }

      return user;
    } catch (err) {
      console.error('Failed to get user friends:', err);
      throw err;
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
  async deleteUser(id: number) {
    try {
      const result = await this.userRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    } catch (err) {
      console.error(`Error deleting user with ID ${id}:`, err);
      if (err instanceof NotFoundException) {
        throw err;
      } else {
        throw new InternalServerErrorException(
          `An error occurred during the deleteUser operation: ${err.message}`,
        );
      }
    }
  }

  /**
   * Uploads a user image URL to the user record in the database.
   * @param id The ID of the user.
   * @param imageUrl The URL of the image to be uploaded.
   * @param isBackground Indicates whether the image is a background image.
   * @throws NotFoundException if the user is not found.
   * @throws InternalServerErrorException if there's an error uploading the image.
   */
  async uploadUserImage(id: number, imageUrl: string, isBackground: boolean) {
    try {
      const user = await this.findUser(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      if (isBackground) {
        user.backgroundImageUrl = imageUrl;
      } else {
        user.imageUrl = imageUrl;
      }

      await this.userRepository.save(user);
    } catch (error) {
      console.error(`Error uploading user image: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new InternalServerErrorException(
          'Failed to upload user image. Please try again.',
        );
      }
    }
  }

  /**
   * Deletes the user's image URL from the user record in the database.
   * @param id The ID of the user.
   * @throws NotFoundException if the user is not found.
   * @throws InternalServerErrorException if there's an error deleting the image.
   */
  async deleteUserImage(id: number) {
    try {
      const updateResult = await this.userRepository.update(id, {
        imageUrl: null,
      });

      if (updateResult.affected === 0) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    } catch (error) {
      console.error(`Error deleting user image: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new InternalServerErrorException(
          'Failed to delete user image. Please try again.',
        );
      }
    }
  }

  /**
   * Retrieves a user from the database based on the provided email address.
   * @param userEmail The email address of the user to retrieve.
   * @returns A Promise that resolves to the user object.
   * @throws NotFoundException if the user is not found.
   * @throws InternalServerErrorException if there's an error retrieving the user.
   */
  async getUserByEmail(userEmail: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: userEmail },
      });

      if (!user) {
        throw new NotFoundException(`User with email ${userEmail} not found`);
      }

      return user;
    } catch (error) {
      console.error(`Error retrieving user by email: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new InternalServerErrorException(
          'Failed to retrieve user by email. Please try again.',
        );
      }
    }
  }

  /**
   * Retrieves the current user, friend requests, and profile user for displaying a user's profile.
   * @param toggleFriendDto The data necessary to retrieve the user profile.
   * @returns A Promise that resolves to an array containing the current user, friend requests, and profile user.
   * @throws Error if there's an issue retrieving the user profile.
   */
  async getUserForProfile(
    toggleFriendDto: ToggleFriendDto,
  ): Promise<[User, FriendRequest[], User]> {
    try {
      const { userId, friendId } = toggleFriendDto;
      const userPromise = this.userRepository.findOne({
        where: { id: userId },
        relations: ['friends'],
      });

      const friendRequestsPromise = this.friendRequestRepository.find({
        where: [
          { friendId: userId, accepted: null },
          { userId, accepted: null },
        ],
      });

      const profileUserPromise = this.userRepository.findOne({
        where: { id: friendId },
        relations: [
          'friends',
          'items',
          'exchanges',
          'exchanges.friend',
          'exchanges.items',
          'exchanges.user',
        ],
      });

      return await Promise.all([
        userPromise,
        friendRequestsPromise,
        profileUserPromise,
      ]);
    } catch (error) {
      console.error('Failed to retrieve user profile:', error);
      throw error;
    }
  }

  /**
   * Changes the password for a user based on the provided data.
   * @param changePasswordDto The data necessary to change the password.
   * @returns The ID of the user whose password was changed.
   * @throws Error if the user is not found, the current password is invalid, or the new password is the same as the old one.
   */
  async changePasswordDto(changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: changePasswordDto.email },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new Error('Invalid password.');
    }

    const isNewPasswordSameAsOld = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password,
    );

    if (isNewPasswordSameAsOld) {
      throw new Error(
        'New password must be different from the current password.',
      );
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    user.password = hashedPassword;

    await this.userRepository.save(user);
    return user.id;
  }
}
