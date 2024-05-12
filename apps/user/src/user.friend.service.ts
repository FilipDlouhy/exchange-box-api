import { ToggleFriendDto } from 'libs/dtos/userDtos/toggle.friend.dto';
import { UserDto } from 'libs/dtos/userDtos/user.dto';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../../libs/database/src/entities/user.entity';
import { Repository } from 'typeorm';
import { FriendRequest } from '../../../libs/database/src/entities/friend.request.entity';
import { FriendRequestDto } from 'libs/dtos/userDtos/friend.request.dto';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { sendNotification } from '../../../libs/tcp/src/notifications/notification.helper';
import { UserFriendRepository } from './user.friend.repository';

@Injectable()
export class UserFriendService {
  private readonly notificationClient;
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
    private readonly userFriendRepository: UserFriendRepository,
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
   * Retrieves either the friends or non-friend users of the provided user based on the specified condition.
   * @param {number} id - The ID of the user for whom friends or non-friends are being retrieved.
   * @param {boolean} isFriends - A boolean indicating whether to retrieve friends (true) or non-friends (false).
   * @param {any} query - The optional search query object.
   * @returns {Promise<UserDto[]>} - A promise that resolves to an array of UserDto objects representing friends or non-friends.
   * @throws {NotFoundException | InternalServerErrorException} - If there's an error fetching users.
   */
  async getFriendsOrNonFriends(
    id: number,
    isFriends: boolean,
    query: any = {},
  ): Promise<UserDto[]> {
    try {
      const user = await this.userFriendRepository.fetchUserAndValidate(id);
      const page = parseInt(query.page, 10) || 0;
      const limit = parseInt(query.limit, 10) || 10;

      if (!isFriends) {
        return await this.getNonFriendUsers(id, query, page, limit);
      } else {
        return this.getFriendDtos(user, query, page, limit);
      }
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
   * Adds a friendship connection between two users in the system.
   * This operation is performed within a transaction to ensure data integrity.
   * If the friend is successfully added to the initiating user's list of friends,
   * the friend's list of friends is also updated accordingly.
   *
   * @param {ToggleFriendDto} toggleFriendDto - An object containing the IDs of the two users involved in the friendship.
   * @throws {Error} - Throws an error if the operation fails due to internal issues or if the friend cannot be added.
   * @returns {Promise<void>} - Resolves if the operation is successful, indicating the friendship has been added.
   */
  private async addFriend(toggleFriendDto: ToggleFriendDto): Promise<void> {
    try {
      await this.userFriendRepository.addFriend(toggleFriendDto);
    } catch (error) {
      console.error('Error adding friend:', error);
      throw new Error('Failed to add friend');
    }
  }

  /**
   * Removes a friendship connection between two users in the system.
   * This operation is performed within a transaction to ensure data integrity.
   * If the friend is found in the user's list of friends, they are removed from each other's lists.
   *
   * @param {number} userId - Initiating user's ID.
   * @param {number} friendId - Friend's ID to be removed.
   * @returns {Promise<void>} - Resolves if the operation is successful.
   */
  async removeFriend(userId: number, friendId: number): Promise<void> {
    try {
      await this.userFriendRepository.removeFriend(userId, friendId);
    } catch (error) {
      console.error('Error removing friend:', error);
      throw new Error('Failed to remove friend');
    }
  }

  /**
   * Checks if two users are friends in the system.
   * This operation queries the user-friend repository to determine if a friendship exists between the given user and friend IDs.
   * @param {number} userId - The ID of the user to check.
   * @param {number} friendId - The ID of the friend to check against.
   * @returns {Promise<boolean>} - Resolves to true if the users are friends, false otherwise.
   */
  async checkIfFriends(userId: number, friendId: number): Promise<boolean> {
    try {
      return await this.userFriendRepository.checkIfFriends(userId, friendId);
    } catch (error) {
      console.error('Error checking if friends:', error);
      throw new Error('Failed to check if friends');
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
      const users = await this.userRepository.findByIds([userId, friendId]);

      const userEntity = users.find((user) => user.id === userId);
      const friendEntity = users.find((user) => user.id === friendId);

      if (!userEntity || !friendEntity) {
        throw new NotFoundException('One or both users not found');
      }

      return { user: userEntity, friend: friendEntity };
    } catch (err) {
      console.error(`Error retrieving users: ${err.message}`);
      if (err instanceof NotFoundException) {
        throw err;
      } else {
        throw new InternalServerErrorException(
          'Failed to retrieve users. Please try again.',
        );
      }
    }
  }

  /**
   * Retrieves friend requests for a user from the database.
   *
   * @param id - The ID of the user for whom to retrieve friend requests.
   * @returns A Promise that resolves to an array of friend requests if found, or rejects with an error.
   */
  async getFriendRequests(
    id: number,
    query: any = {},
  ): Promise<FriendRequestDto[]> {
    try {
      const friendRequests = await this.userFriendRepository.getFriendRequests(
        id,
        query,
      );

      const friendRequestDtos = friendRequests.map((friendRequest) => {
        return new FriendRequestDto(
          friendRequest.id.toString(),
          friendRequest.createdAt,
          friendRequest.friendId,
          friendRequest.userId,
          friendRequest.friendImageUrl,
          friendRequest.userName,
          friendRequest.friendName,
        );
      });

      return friendRequestDtos;
    } catch (error) {
      console.error(
        `Error while retrieving friend requests for id ${id}: ${error.message}`,
      );
      throw new Error(
        `Error while retrieving friend requests: ${error.message}`,
      );
    }
  }

  /**
   * Creates a new friend request in the database.
   *
   * @param toggleFriendDto - The DTO containing data for creating the friend request.
   * @returns A Promise that resolves to the created friend request, or rejects with an error.
   */
  async createFriendRequest(toggleFriendDto: ToggleFriendDto) {
    return await this.friendRequestRepository.manager
      .transaction(async (entityManager) => {
        const areTheyFriends = await this.checkIfFriends(
          toggleFriendDto.userId,
          toggleFriendDto.friendId,
        );

        if (areTheyFriends) {
          throw new Error('You are already friends.');
        }

        const friendRequestExists = await entityManager.findOne(FriendRequest, {
          where: {
            friendId: toggleFriendDto.userId,
            userId: toggleFriendDto.friendId,
          },
        });

        if (friendRequestExists) {
          throw new Error('Friend request already sent.');
        }
        const { friend, user } =
          await this.userFriendRepository.createFriendRequest(
            toggleFriendDto,
            entityManager,
          );

        sendNotification(this.notificationClient, {
          userId: friend.id.toString(),
          nameOfTheService: 'user-service',
          text: `You sent friend request to ${user.name}`,
          initials: 'FR',
        });

        sendNotification(this.notificationClient, {
          userId: user.id.toString(),
          nameOfTheService: 'user-service',
          text: `You Recieved friend request to ${friend.name}`,
          initials: 'FR',
        });
      })
      .catch((error) => {
        console.error(
          `Error while creating a friend request: ${error.message}`,
        );
        throw new Error(
          `Error while creating a friend request: ${error.message}`,
        );
      });
  }

  /**
   * Accepts or denies a friend request based on the provided boolean flag.
   * This method updates the status of the friend request in the repository,
   * adds the friend if the request is accepted, and sends a notification to the friend.
   * @param {ToggleFriendDto} toggleFriendDto - An object containing the IDs of the two users involved in the friend request.
   * @param {boolean} isAcceptedProp - A boolean flag indicating whether to accept or deny the friend request.
   * @returns {Promise<FriendRequest>} - Resolves to the updated friend request.
   * @throws {Error} - Throws an error if the operation fails due to internal issues, if the friend request is not found, or if any other error occurs during the process.
   */
  async acceptOrDenyFriendRequest(
    toggleFriendDto: ToggleFriendDto,
    isAcceptedProp: boolean,
  ): Promise<FriendRequest> {
    try {
      const { friendRequest, isAcepted } =
        await this.userFriendRepository.accepOrDenytFriendRequest(
          toggleFriendDto,
          isAcceptedProp,
        );

      if (isAcepted) {
        await this.addFriend(toggleFriendDto);

        sendNotification(this.notificationClient, {
          userId: friendRequest.friendId.toString(),
          nameOfTheService: 'user-service',
          text: `${friendRequest.userName} Accepted your friend request`,
          initials: 'FR',
        });
      }

      return friendRequest;
    } catch (error) {
      console.error('Error accepting or denying friend request:', error);
      throw new Error('Failed to accept or deny friend request');
    }
  }
  /**
   * Retrieves a list of non-friend users based on the provided user ID, search query, pagination parameters.
   * @param {number} id - The ID of the user for whom non-friend users are being retrieved.
   * @param {any} query - The search query object.
   * @param {number} page - The page number for pagination.
   * @param {number} limit - The maximum number of non-friend users to retrieve per page.
   * @returns {Promise<UserDto[]>} - A promise that resolves to an array of UserDto objects representing non-friend users.
   * @throws {Error} - If there's an error during the retrieval process.
   */
  async getNonFriendUsers(
    id: number,
    query: any,
    page: number,
    limit: number,
  ): Promise<UserDto[]> {
    try {
      const allUsers = await this.userFriendRepository.getAllUsers(
        id,
        query,
        page,
        limit,
      );

      const friendRequests = await this.friendRequestRepository.find();
      const friendRequestIds = friendRequests.map((request) =>
        request.friendId === id ? request.userId : request.friendId,
      );

      const friendIds = (
        await this.userFriendRepository.fetchUserAndValidate(id)
      ).friends.map((user) => user.id);

      const nonFriendUsers = allUsers.filter(
        (u) => !friendIds.includes(u.id) && !friendRequestIds.includes(u.id),
      );

      return nonFriendUsers.map(
        (u) =>
          new UserDto(
            u.name,
            u.email,
            u.id,
            u.telephone,
            u.address,
            u.imageUrl,
          ),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error when finding new possible friends.',
      );
    }
  }
  /**
   * Retrieves a list of friend DTOs based on the provided user, search query, pagination parameters.
   * @param {User} user - The user whose friends are being retrieved.
   * @param {any} query - The search query object.
   * @param {number} page - The page number for pagination.
   * @param {number} limit - The maximum number of friends to retrieve per page.
   * @returns {UserDto[]} - An array of UserDto objects representing the user's friends.
   */
  private getFriendDtos(
    user: User,
    query: any,
    page: number,
    limit: number,
  ): UserDto[] {
    const totalFriends = user.friends.length;
    const startIndex = page;
    if (startIndex >= totalFriends) {
      return [];
    }

    const friendDtos = user.friends
      .filter((friend) => !query.search || friend.name.includes(query.search))
      .slice(startIndex, startIndex + limit)
      .map(
        (friend) =>
          new UserDto(
            friend.name,
            friend.email,
            friend.id,
            friend.telephone,
            friend.address,
            friend.imageUrl,
          ),
      );

    return friendDtos;
  }
}
