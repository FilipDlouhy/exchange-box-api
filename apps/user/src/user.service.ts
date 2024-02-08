import { CreateUserDto } from 'libs/dtos/userDtos/create.user.dto';
import { ToggleFriendDto } from 'libs/dtos/userDtos/toggle.friend.dto';
import { UpdateUserDto } from 'libs/dtos/userDtos/update.user.dto';
import { UploadUserImageDto } from 'libs/dtos/userDtos/upload.user.image.dto';
import { UserDto } from 'libs/dtos/userDtos/user.dto';
import { friendStatusEnum } from 'libs/dtos/userEnums/friend.enum';
import {
  deleteFileFromFirebase,
  getImageUrlFromFirebase,
  updateFileInFirebase,
  uploadFileToFirebase,
} from '@app/database';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@app/database/entities/user.entity';
import { Repository } from 'typeorm';
import { FriendRequest } from '@app/database/entities/friend.request.entity';
import { UserProfileFriendDto } from 'libs/dtos/userDtos/user.profile.friend.dto';
import { UserProfileItemDto } from 'libs/dtos/userDtos/user.profile.item.dto';
import { UserProfileDto } from 'libs/dtos/userDtos/user.profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
  ) {}

  /**
   * Creates a new user in the 'user' table using the provided CreateUserDto.
   * It hashes the password before storing it in the database.
   * After insertion, it retrieves and returns the newly created user details, except for the password.
   * @param {CreateUserDto} createUserDto - The DTO containing the new user data.
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

      if (!user) {
        throw new NotFoundException(`User not found`);
      }

      return new UserDto(user.name, user.email, user.id, user.imageUrl);
    } catch (err) {
      console.error('Error retrieving user:', err);
      throw new Error('Error retrieving user');
    }
  }

  /**
   * Retrieve a user for updating an item based on their ID.
   *
   * @param {number} id - The ID of the user to retrieve.
   * @returns {Promise<User>} A Promise that resolves to the retrieved user.
   * @throws {Error} If there's an error while retrieving the user.
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
        throw new NotFoundException(
          `User with ID ${updateUserDto.id} not found`,
        );
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
      if (err instanceof NotFoundException) {
        throw err;
      } else {
        throw new BadRequestException('Error updating user');
      }
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

      const userDtos: UserDto[] = users.map(
        (user) =>
          new UserDto(
            user.name,
            user.email,
            user.id,
            user.telephone,
            user.address,
            user.imageUrl,
          ),
      );

      return userDtos;
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
   * Uploads or updates a user image in Firebase Storage based on the 'update' flag.
   * If 'update' is true, it updates the existing image, otherwise, it uploads a new one.
   *
   * @param uploadUserImageDto - Data transfer object containing the file to upload and the user ID.
   * @param update - A boolean flag that determines whether to update an existing image (true) or upload a new image (false).
   * @throws - Propagates any errors that occur during file upload or update.
   *Errors may occur due to file upload issues, Firebase Storage operations, or database update operations.
   */
  async uploadUserImage(
    uploadUserImageDto: UploadUserImageDto,
    update: boolean,
  ) {
    try {
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

      const user = await this.userRepository.findOne({
        where: { id: parseInt(uploadUserImageDto.userId) },
      });

      if (!user) {
        throw new NotFoundException(
          `User with ID ${uploadUserImageDto.userId} not found`,
        );
      }

      user.imageUrl = imageUrl;
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
   * Retrieves the URL of a user's image from Firebase Storage.
   *
   * @param id - The ID of the user whose image URL is to be retrieved.
   * @returns - The URL of the user's image.
   * @throws - Propagates any errors that occur during URL retrieval.
   */
  async getUserImage(id: number): Promise<string> {
    try {
      const imageUrl = await getImageUrlFromFirebase(id.toString(), 'Users');

      if (!imageUrl) {
        throw new NotFoundException(`User image not found for ID ${id}`);
      }

      return imageUrl;
    } catch (error) {
      console.error(`Error getting user image URL: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new InternalServerErrorException(
          'Failed to get user image URL. Please try again.',
        );
      }
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
   * Retrieves and enriches the profile data of a specified user.
   * This method fetches a user and their friend's profile, including pending friend requests,
   * and enriches the profile with items and friends' details.
   *
   * @param toggleFriendDto - DTO containing userId and friendId for which profile data is to be retrieved.
   * @returns A promise of UserProfileDto containing detailed profile info, items, and friends.
   */
  async getUserForProfile(
    toggleFriendDto: ToggleFriendDto,
  ): Promise<UserProfileDto> {
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
        relations: ['friends', 'items'],
      });

      const [user, friendRequests, profileUser] = await Promise.all([
        userPromise,
        friendRequestsPromise,
        profileUserPromise,
      ]);

      if (!user) throw new Error('User not found.');
      if (!profileUser) throw new Error('Profile user not found.');

      const userFriendIds = new Set(user.friends.map((friend) => friend.id));
      const friendRequestSentIds = new Set();
      const friendRequestReceivedIds = new Set();

      friendRequests.forEach((request) => {
        if (request.userId === userId)
          friendRequestSentIds.add(request.friendId);
        else friendRequestReceivedIds.add(request.userId);
      });

      const getFriendStatus = (id) =>
        userFriendIds.has(id)
          ? friendStatusEnum.IsFriend
          : friendRequestSentIds.has(id) || friendRequestReceivedIds.has(id)
            ? friendStatusEnum.FriendRequestSentRecieved
            : friendStatusEnum.NotFriend;

      const profileUserFriends = profileUser.friends.map(
        (friend) =>
          new UserProfileFriendDto(
            friend.name,
            friend.email,
            friend.id,
            friend.imageUrl,
            friend.address,
            friend.telephone,
            getFriendStatus(friend.id),
          ),
      );

      const profileUserItems = profileUser.items.map(
        (item) =>
          new UserProfileItemDto(
            item.name,
            item.weight,
            item.id,
            item.length,
            item.width,
            item.height,
            item.imageUrl,
          ),
      );

      const friendStatus = getFriendStatus(profileUser.id);

      return new UserProfileDto(
        profileUser.name,
        profileUser.email,
        profileUser.id,
        profileUserItems,
        profileUserFriends,
        profileUser.imageUrl,
        profileUser.address,
        profileUser.telephone,
        friendStatus,
      );
    } catch (error) {
      console.error('Failed to retrieve user profile:', error);
      throw error;
    }
  }
}
