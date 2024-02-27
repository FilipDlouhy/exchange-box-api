import { ToggleFriendDto } from 'libs/dtos/userDtos/toggle.friend.dto';
import { UserDto } from 'libs/dtos/userDtos/user.dto';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@app/database/entities/user.entity';
import { Like, Not, Repository } from 'typeorm';
import { FriendRequest } from '@app/database/entities/friend.request.entity';
import { NotFoundError } from 'rxjs';
import { FriendRequestDto } from 'libs/dtos/userDtos/friend.request.dto';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { sendNotification } from './user.helper';

@Injectable()
export class UserFriendService {
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
      const user = await this.fetchUserAndValidate(id);
      const page = parseInt(query.page, 10) || 1;
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
   * This method adds a new friend connection to the 'users_friend' table.
   * It first checks if a friendship between the given user IDs already exists to avoid duplicates.
   * If the friendship doesn't exist, it proceeds to insert a new record.
   * @param {ToggleFriendDto} toggleFriendDto - Data Transfer Object containing user_id and friend_id.
   * @returns {Promise<boolean>} - A promise that resolves to true if the operation is successful.
   */
  private async addFriend(toggleFriendDto: ToggleFriendDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: toggleFriendDto.userId },
        relations: ['friends'],
      });
      const friend = await this.userRepository.findOne({
        where: { id: toggleFriendDto.friendId },
        relations: ['friends'],
      });

      if (!user || !friend) {
        throw new NotFoundException('User or friend not found.');
      }

      if (user.friends.some((f) => f.id === friend.id)) {
        throw new ConflictException('Friendship already exists.');
      }

      user.friends = [...(user.friends || []), friend];
      friend.friends = [...(friend.friends || []), user];

      await this.userRepository.save(user);
      await this.userRepository.save(friend);
    } catch (err) {
      console.error(`Error adding friend: ${err.message}`);
      if (
        err instanceof NotFoundException ||
        err instanceof ConflictException
      ) {
        throw err;
      } else {
        throw new InternalServerErrorException(
          'Unable to add friend. Please try again.',
        );
      }
    }
  }

  /**
    Removes a friendship connection between two users in the system within a transaction.
    If the friend is found in the user's list of friends, they are removed from each other's lists.
    @param {number} userId - Initiating user's ID.
    @param {number} friendId - Friend's ID to be removed.
    @throws {NotFoundException} - If user or friend is not found.
    @throws {InternalServerErrorException} - If any other error occurs.
    @returns {Promise<void>} - Resolves if the operation is successful.
    */
  async removeFriend(userId: number, friendId: number) {
    try {
      await this.friendRequestRepository.manager.transaction(
        async (entityManager) => {
          const user = await entityManager.findOne(User, {
            where: { id: userId },
            relations: ['friends'],
          });

          if (!user) {
            throw new NotFoundException('User not found.');
          }

          const initialFriendCount = user.friends.length;
          user.friends = user.friends.filter(
            (friend) => friend.id !== friendId,
          );

          if (initialFriendCount === user.friends.length) {
            throw new NotFoundException(
              "Friend not found in user's friends list.",
            );
          }

          await entityManager.save(user);

          const friend = await entityManager.findOne(User, {
            where: { id: friendId },
            relations: ['friends'],
          });

          if (!friend) {
            throw new NotFoundException('Friend user not found.');
          }

          friend.friends = friend.friends.filter(
            (friend) => friend.id !== userId,
          );
          await entityManager.save(friend);
        },
      );
    } catch (err) {
      console.error(`Error removing friend: ${err.message}`);
      if (err instanceof NotFoundException) {
        throw err;
      } else {
        throw new InternalServerErrorException(
          'Failed to remove friend. Please try again.',
        );
      }
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
        throw new NotFoundException('User not found.');
      }

      // Find the friend by ID
      const friend = await this.userRepository.findOne({
        where: { id: friendId },
      });
      if (!friend) {
        throw new NotFoundException('Friend not found.');
      }

      // Check if the found friend is in the user's friends list
      const isFriend = user.friends.some((f) => f.id === friendId);
      if (isFriend) {
        throw new ConflictException('The specified users are friends.');
      }

      return false;
    } catch (err) {
      console.error(`Error in checking friendship status: ${err.message}`);
      if (
        err instanceof NotFoundException ||
        err instanceof ConflictException
      ) {
        throw err; // Re-throw specific exceptions
      } else {
        throw new InternalServerErrorException(
          'Failed to check friendship status. Please try again.',
        );
      }
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
      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 10;

      const friendRequests = await this.friendRequestRepository.find({
        where: {
          userId: id,
          accepted: null,
          userName: Like(`%${query.search}%`),
          friendName: Like(`%${query.search}%`),
        },
        skip: (page - 1) * limit,
        take: limit,
      });

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
        const friend = await entityManager.findOne(User, {
          where: {
            id: toggleFriendDto.friendId,
          },
        });

        const user = await entityManager.findOne(User, {
          where: {
            id: toggleFriendDto.userId,
          },
        });

        const newFriendRequest = new FriendRequest();
        newFriendRequest.friendId = toggleFriendDto.userId;
        newFriendRequest.userId = toggleFriendDto.friendId;
        newFriendRequest.accepted = false;
        newFriendRequest.friendImageUrl = friend.imageUrl;
        newFriendRequest.userName = user.name;
        newFriendRequest.friendName = friend.name;

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7);
        newFriendRequest.expirationDate = expirationDate;
        newFriendRequest.createdAt = new Date();

        await entityManager.save(newFriendRequest);

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
   * Accepts a friend request in the database.
   *
   * @param toggleFriendDto - The DTO containing data for accepting the friend request.
   * @returns A Promise that resolves to the accepted friend request, or rejects with an error.
   */
  async accepOrDenytFriendRequest(
    toggleFriendDto: ToggleFriendDto,
    isAcepted: boolean,
  ): Promise<FriendRequest> {
    return await this.friendRequestRepository.manager
      .transaction(async (entityManager) => {
        const friendRequest = await entityManager.findOne(FriendRequest, {
          where: {
            friendId: toggleFriendDto.friendId,
            userId: toggleFriendDto.userId,
          },
        });

        if (!friendRequest) {
          throw new NotFoundError('Friend request not found.');
        }

        friendRequest.accepted = isAcepted;

        if (isAcepted) {
          await this.addFriend(toggleFriendDto);

          sendNotification(this.notificationClient, {
            userId: friendRequest.friendId.toString(),
            nameOfTheService: 'user-service',
            text: `${friendRequest.userName} Acepted your friend request`,
            initials: 'FR',
          });
        }

        await entityManager.save(friendRequest);

        return friendRequest;
      })
      .catch((error) => {
        console.error(
          `Error while accepting a friend request: ${error.message}`,
        );
        throw new Error(
          `Error while accepting a friend request: ${error.message}`,
        );
      });
  }

  /**
   * Fetches a user with the provided ID along with their friends and validates its existence.
   * @param {number} id - The ID of the user to fetch and validate.
   * @returns {Promise<User>} - A promise that resolves to the fetched user if found.
   * @throws {NotFoundException} - If the user with the provided ID is not found.
   */
  private async fetchUserAndValidate(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: id },
      relations: ['friends'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
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
  private async getNonFriendUsers(
    id: number,
    query: any,
    page: number,
    limit: number,
  ): Promise<UserDto[]> {
    try {
      const allUsers = await this.userRepository.find({
        where: {
          id: Not(id),
          name: Like(`%${query.search}%`),
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      const friendRequests = await this.friendRequestRepository.find();
      const friendRequestIds = friendRequests.map((request) =>
        request.friendId === id ? request.userId : request.friendId,
      );

      const friendIds = (await this.fetchUserAndValidate(id)).friends.map(
        (user) => user.id,
      );

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
    const startIndex = (page - 1) * limit;
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
