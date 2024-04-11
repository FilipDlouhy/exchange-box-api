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
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  private readonly notificationClient;
  constructor(
    @InjectRepository(User)
    @InjectRepository(FriendRequest)
    private readonly userRepository: UserRepository,
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
   * Creates a new user in the database based on the provided data.
   * @param createUserDto The data necessary to create the user.
   * @throws Error if there's an issue creating the user.
   */
  async createUser(createUserDto: CreateUserDto) {
    try {
      await this.userRepository.createUser(createUserDto);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Retrieves the profile of the current user based on the provided ID.
   * @param id The ID of the current user.
   * @returns A Promise that resolves to a CurrentUserDto object containing the user's profile data.
   * @throws An error if there's an issue retrieving the user profile.
   */
  async getCurrentUserProfile(id: number): Promise<CurrentUserDto> {
    try {
      const user = await this.userRepository.getCurrentUserProfile(id);

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
   * Retrieves a user for updating an item based on the provided ID.
   * @param id The ID of the user to retrieve.
   * @returns A Promise that resolves to the user object for updating an item.
   * @throws Error if there's an issue retrieving the user for updating an item.
   */
  async getUserForItemUpdate(id: number): Promise<User> {
    try {
      return await this.userRepository.getUserForItemUpdate(id);
    } catch (error) {
      console.error('Error retrieving user for updating item:', error);
      throw error;
    }
  }

  /**
   * Updates the current user's information based on the provided data.
   * @param updateCurrentUserDto The data necessary to update the current user.
   * @returns A Promise that resolves when the current user is successfully updated.
   */
  async updateCurentUser(
    updateCurrentUserDto: UpdateCurrentUserDto,
  ): Promise<void> {
    const user = await this.userRepository.findUser(updateCurrentUserDto.id);
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

    await this.userRepository.updateCurentUser(updateCurrentUserDto, user);
  }

  /**
   * Retrieves a list of users from the database.
   * @returns A Promise that resolves to an array of UserDto objects containing user data.
   * @throws NotFoundException if no users are found.
   * @throws InternalServerErrorException if there's an error retrieving users.
   */
  async getUsers(): Promise<UserDto[]> {
    try {
      const users = await this.userRepository.getUsers();

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
   * Retrieves the friends of a user based on the provided user ID.
   * @param id The ID of the user whose friends are to be retrieved.
   * @returns A Promise that resolves to an array of FriendSimpleDto objects containing basic information about the user's friends.
   * @throws An error if there's an issue retrieving the user's friends.
   */
  async getUsersFriendsSimple(id: number): Promise<FriendSimpleDto[]> {
    try {
      const user = await this.userRepository.getUserWithFriends(id);

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
   * Deletes a user from the database based on the provided ID.
   * @param id The ID of the user to delete.
   * @returns A Promise that resolves when the user is successfully deleted.
   * @throws Error if there's an issue deleting the user.
   */
  async deleteUser(id: number) {
    try {
      await this.userRepository.deleteUser(id);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

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
   * Deletes a user's image from Firebase storage and removes the image URL from the user record in the database.
   * @param id The ID of the user whose image is to be deleted.
   * @throws Error if there's an issue deleting the image or updating the user record.
   */
  async deleteUserImage(id: number) {
    try {
      await deleteFileFromFirebase(id.toString(), 'Users');
      await this.userRepository.deleteUserImage(id);
    } catch (error) {
      console.error('Error deleting user image:', error);
      throw error;
    }
  }

  /**
   * Retrieves a user from the database based on the provided email address.
   * @param userEmail The email address of the user to retrieve.
   * @returns A Promise that resolves to the user object.
   * @throws Error if there's an issue retrieving the user.
   */
  async getUserByEmail(userEmail: string): Promise<User> {
    try {
      return await this.userRepository.getUserByEmail(userEmail);
    } catch (error) {
      console.error('Error retrieving user by email:', error);
      throw error;
    }
  }

  /**
   * Retrieves the profile of a user for display on the user's profile page.
   * @param toggleFriendDto The data necessary to retrieve the user profile.
   * @returns A Promise that resolves to a UserProfileDto object containing the user's profile information.
   * @throws An error if there's an issue retrieving the user profile.
   */
  async getUserForProfile(
    toggleFriendDto: ToggleFriendDto,
  ): Promise<UserProfileDto> {
    try {
      const { userId } = toggleFriendDto;

      const [user, friendRequests, profileUser] =
        await this.userRepository.getUserForProfile(toggleFriendDto);

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
   * Changes the password of a user based on the provided data.
   * @param changePasswordDto The data necessary to change the user's password.
   * @throws Error if there's an issue changing the password or sending the notification.
   */
  async changePasswordDto(changePasswordDto: ChangePasswordDto) {
    try {
      const userId =
        await this.userRepository.changePasswordDto(changePasswordDto);

      sendNotification(this.notificationClient, {
        userId: userId.toString(),
        nameOfTheService: 'user-service',
        text: 'You have changed password',
        initials: 'CHP',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Retrieves a user from the database based on the provided ID.
   * @param id The ID of the user to retrieve.
   * @returns A Promise that resolves to the user object.
   * @throws An error if there's an issue retrieving the user.
   */
  async getUserById(id: number): Promise<User> {
    try {
      return await this.userRepository.findUser(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves friends of a user for item creation based on the provided user ID.
   * @param id The ID of the user whose friends are to be retrieved.
   * @returns A Promise that resolves to an array of CreateItemUserDto objects containing information about the user's friends.
   * @throws An error if there's an issue retrieving the user's friends or if the user is not found.
   */
  async getFriendsForItemCreation(id: number): Promise<CreateItemUserDto[]> {
    try {
      const user = await this.userRepository.getUserWithFriends(id);
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

  /**
   * Uploads a user image to Firebase storage.
   * @param uploadUserImageDto The data necessary to upload the user image.
   * @param update Indicates whether to update an existing image.
   * @param folderName The name of the folder in Firebase storage to upload the image to.
   * @param isBackground Indicates whether the image is a background image.
   * @throws NotFoundException if the user or image is not found.
   * @throws InternalServerErrorException if there's an error during the image upload process.
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

      await this.userRepository.uploadUserImage(
        parseInt(uploadUserImageDto.userId),
        imageUrl,
        isBackground,
      );
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
}
