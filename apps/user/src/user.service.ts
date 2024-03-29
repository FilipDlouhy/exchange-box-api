import { CreateUserDto } from 'libs/dtos/userDtos/create.user.dto';
import { ToggleFriendDto } from 'libs/dtos/userDtos/toggle.friend.dto';

import { UploadUserImageDto } from 'libs/dtos/userDtos/upload.user.image.dto';
import { UserDto } from 'libs/dtos/userDtos/user.dto';
import { friendStatusEnum } from 'libs/dtos/userEnums/friend.enum';
import {
  deleteFileFromFirebase,
  getImageUrlFromFirebase,
  updateFileInFirebase,
  uploadFileToFirebase,
} from '../../../libs/database/src/firabase-storage';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../../libs/database/src/entities/user.entity';
import { Repository } from 'typeorm';
import { FriendRequest } from '../../../libs/database/src/entities/friend.request.entity';
import { UserProfileFriendDto } from 'libs/dtos/userDtos/user.profile.friend.dto';
import { UserProfileItemDto } from 'libs/dtos/userDtos/user.profile.item.dto';
import { UserProfileDto } from 'libs/dtos/userDtos/user.profile.dto';
import { ChangePasswordDto } from 'libs/dtos/userDtos/change.password.dto';
import { CurrentUserDto } from 'libs/dtos/userDtos/current.user.dto';
import { UpdateCurrentUserDto } from 'libs/dtos/userDtos/update.current.user.dto';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { sendNotification } from '../../../libs/tcp/src/notifications/notification.helper';
import { CreateItemUserDto } from 'libs/dtos/userDtos/create.item.user.dto';
import { FriendSimpleDto } from 'libs/dtos/userDtos/friend.simple.dto';
import { UserProfileExhnageDto } from 'libs/dtos/userDtos/user.profile.exhcange.dto';
import { Exchange } from '@app/database';

@Injectable()
export class UserService {
  private readonly notificationClient;
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
  ) {
    this.notificationClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3011,
      },
    });
  }

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
   * Retrieves a single user profile based on the provided ID.
   * Returns user details including friends, items, and exchanges.
   * @param {number} id - The unique identifier of the user to retrieve.
   * @returns {Promise<CurrentUserDto>} - The DTO representing the user profile.
   * @throws {NotFoundException} If the user with the provided ID is not found.
   * @throws {Error} If there is an error retrieving the user profile.
   */
  async getCurrentUserProfile(id: number): Promise<CurrentUserDto> {
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

      const exchanges = this.toUserProfileExhnageDto(user.exchanges);

      const currentUser = new CurrentUserDto(user);
      currentUser.exchanges = exchanges;

      return currentUser;
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
   * Updates user details and handles image uploads inline, without separate DTO preparation.
   * No explicit return, focuses on updating user and handling image uploads by type (background or profile).
   *
   * @param {UpdateCurrentUserDto} updateCurrentUserDto - The DTO containing the updated user data, including any new images.
   */
  async updateCurentUser(
    updateCurrentUserDto: UpdateCurrentUserDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: updateCurrentUserDto.id },
    });

    updateCurrentUserDto.images.forEach((image) => {
      const isBackgroundImage = image.originalname
        .toLocaleLowerCase()
        .includes('background');
      const uploadImageDto = new UploadUserImageDto();
      uploadImageDto.file = image;
      uploadImageDto.userId = updateCurrentUserDto.id.toString();

      const imageCategory = isBackgroundImage ? 'BackgroundImages' : 'Users';
      const shouldReplace = isBackgroundImage
        ? !!user.backgroundImageUrl
        : !!user.imageUrl;

      this.uploadUserImage(
        uploadImageDto,
        shouldReplace,
        imageCategory,
        isBackgroundImage,
      );
    });

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

      const userDtos: UserDto[] = users.map((user) => {
        return this.toUserDto(user);
      });

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
   * Retrieves a simplified list of friends for a given user by their ID.
   * @param {Object} param - An object parameter.
   * @param {number} param.id - The ID of the user whose friends are to be retrieved.
   * @returns {Promise<FriendSimpleDto[]>} A promise that resolves to an array of FriendSimpleDto.
   */
  async getUsersFriendsSimple(id: number): Promise<FriendSimpleDto[]> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: id },
        relations: ['friends'],
      });

      if (!user) {
        throw new Error(`User with id ${id} not found.`);
      }

      const simpleFriendsDtos = user.friends.map((friend) => {
        return new FriendSimpleDto(friend.id, friend.name);
      });

      return simpleFriendsDtos;
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
   * Uploads or updates a user image in Firebase Storage based on the 'update' flag.
   * If 'update' is true, it updates the existing image, otherwise, it uploads a new one.
   *
   * @param uploadUserImageDto - Data transfer object containing the file to upload and the user ID.
   * @param update - A boolean flag that determines whether to update an existing image (true) or upload a new image (false).
   * @throws - Propagates any errors that occur during file upload or update.
   *Errors may occur due to file upload issues, Firebase Storage operations, or database update operations.
   */
  private async uploadUserImage(
    uploadUserImageDto: UploadUserImageDto,
    update: boolean,
    folderName: string,
    isBackground: boolean,
  ) {
    try {
      const imageUrl = update
        ? await updateFileInFirebase(
            uploadUserImageDto.file,
            uploadUserImageDto.userId,
            folderName,
          )
        : await uploadFileToFirebase(
            uploadUserImageDto.file,
            uploadUserImageDto.userId,
            folderName,
          );

      const user = await this.userRepository.findOne({
        where: { id: parseInt(uploadUserImageDto.userId) },
      });

      if (!user) {
        throw new NotFoundException(
          `User with ID ${uploadUserImageDto.userId} not found`,
        );
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
        relations: [
          'friends',
          'items',
          'exchanges',
          'exchanges.friend',
          'exchanges.items',
          'exchanges.user',
        ],
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

      const profileUserExchanges = this.toUserProfileExhnageDto(
        profileUser.exchanges,
      );

      const friendStatus = getFriendStatus(profileUser.id);
      return new UserProfileDto(
        profileUser.name,
        profileUser.email,
        profileUser.id,
        profileUserItems,
        profileUserFriends,
        profileUserExchanges,
        profileUser.imageUrl,
        profileUser.backgroundImageUrl,
        profileUser.address,
        profileUser.telephone,
        friendStatus,
      );
    } catch (error) {
      console.error('Failed to retrieve user profile:', error);
      throw error;
    }
  }

  /**
    Changes the user's password after validating the current password and ensuring it's different from the new one.
    @param changePasswordDto - DTO containing email, current password, and new password.
    @throws Error if user not found, current password invalid, or new password same as current.
    @returns Promise resolved with no value upon successful password change.
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

    sendNotification(this.notificationClient, {
      userId: user.id.toString(),
      nameOfTheService: 'user-service',
      text: 'You have changed password',
      initials: 'CHP',
    });
  }

  /**
   * Fetches a user by their ID from the database.
   * @param id - The ID of the user to fetch.
   * @throws NotFoundException if the user is not found.
   * @returns Promise<User> resolved with the User entity upon successful retrieval.
   */
  async getUserById(id: number): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetches friends of a specific user by the user's ID, transforming each friend into a CreateItemUserDto.
   * @param id - The unique identifier of the user whose friends are to be fetched.
   * @throws Error - Throws an error if the user is not found or if there's a failure in retrieving data.
   * @returns A Promise resolved with an array of CreateItemUserDto, each representing a friend of the user.
   */
  async getFriendsForItemCreation(id: number): Promise<CreateItemUserDto[]> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['friends'],
      });

      if (!user) {
        throw new Error('User not found');
      }

      const createItemUserDtos = user.friends.map(
        (friend) => new CreateItemUserDto(friend),
      );

      return createItemUserDtos;
    } catch (error) {
      console.error('Failed to get friends for item creation:', error);
      throw error;
    }
  }

  /**
   * Converts a User entity to a UserDto object.
   * @param user - The User entity to be converted.
   * @returns A UserDto object containing the user's details.
   */
  private toUserDto(user: User): UserDto {
    return new UserDto(
      user.name,
      user.email,
      user.id,
      user.telephone,
      user.address,
      user.imageUrl,
    );
  }

  /**
   * Maps an array of Exchange entities to an array of UserProfileExchangeDto objects.
   * @param exchanges - An array of Exchange entities to be mapped.
   * @returns An array of UserProfileExchangeDto objects containing the exchange details.
   */
  private toUserProfileExhnageDto(
    exchanges: Exchange[],
  ): UserProfileExhnageDto[] {
    return exchanges.map((exchange) => {
      return new UserProfileExhnageDto(
        exchange.user.id,
        exchange.friend.id,
        exchange.items.length,
        exchange.id,
        exchange.pickUpDate,
        exchange.friend.name,
        exchange.name,
        exchange.exchangeState,
      );
    });
  }
}
