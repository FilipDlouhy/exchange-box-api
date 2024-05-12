import { FriendRequest, User } from '@app/database';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ToggleFriendDto } from 'libs/dtos/userDtos/toggle.friend.dto';
import { NotFoundError } from 'rxjs';
import { EntityManager, Like, Not, Repository } from 'typeorm';

@Injectable()
export class UserFriendRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
  ) {}

  async addFriend(toggleFriendDto: ToggleFriendDto) {
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
   * Retrieves friend requests based on the provided criteria.
   * This method supports pagination and filtering by search terms.
   * @param {number} id - The ID of the user to fetch friend requests for.
   * @param {any} query - An optional object to filter friend requests by search term and pagination.
   * @returns {Promise<FriendRequest[]>} - Resolves to an array of friend requests matching the criteria.
   * @throws {Error} - Throws an error if the operation fails due to internal issues or if the friend requests cannot be retrieved.
   */
  async getFriendRequests(
    id: number,
    query: any = {},
  ): Promise<FriendRequest[]> {
    try {
      const page = parseInt(query.page, 10) || 0;
      const limit = parseInt(query.limit, 10) || 10;
      const friendRequests = await this.friendRequestRepository.find({
        where: {
          userId: id,
          accepted: null,
          userName: Like(`%${query.search}%`),
          friendName: Like(`%${query.search}%`),
        },
        skip: page * limit,
        take: limit,
      });

      return friendRequests;
    } catch (error) {
      console.error('Error retrieving friend requests:', error);
      throw new Error('Failed to retrieve friend requests');
    }
  }

  /**
   * Creates a new friend request between two users.
   * This method checks if a friend request already exists between the users, retrieves the users' details,
   * creates a new friend request entity, sets its properties, and saves it to the database.
   * @param {ToggleFriendDto} toggleFriendDto - An object containing the IDs of the two users involved in the friend request.
   * @param {EntityManager} entityManager - The TypeORM EntityManager instance used to interact with the database.
   * @returns {Promise<{user: User, friend: User}>} - Resolves to an object containing the user who initiated the friend request and the friend.
   * @throws {Error} - Throws an error if the friend request already exists, if the friend or user is not found, or if any other error occurs during the process.
   */
  async createFriendRequest(
    toggleFriendDto: ToggleFriendDto,
    entityManager: EntityManager,
  ): Promise<{ user: User; friend: User }> {
    try {
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

      return { user: user, friend: friend };
    } catch (error) {
      console.error('Error creating friend request:', error);
      throw new Error('Failed to create friend request');
    }
  }

  /**
   * Fetches a user with the provided ID along with their friends and validates its existence.
   * @param {number} id - The ID of the user to fetch and validate.
   * @returns {Promise<User>} - A promise that resolves to the fetched user if found.
   * @throws {NotFoundException} - If the user with the provided ID is not found.
   */
  async fetchUserAndValidate(id: number): Promise<User> {
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
   * Accepts or denies a friend request within a transaction to ensure data integrity.
   * This method updates the status of the friend request in the database and returns the updated friend request along with the acceptance status.
   * @param {ToggleFriendDto} toggleFriendDto - An object containing the IDs of the two users involved in the friend request.
   * @param {boolean} isAccepted - A boolean flag indicating whether to accept or deny the friend request.
   * @returns {Promise<{friendRequest: FriendRequest, isAccepted: boolean}>} - Resolves to an object containing the updated friend request and the acceptance status.
   * @throws {NotFoundError} - Throws an error if the friend request is not found.
   * @throws {Error} - Throws an error if any other issue occurs during the transaction.
   */
  async accepOrDenytFriendRequest(
    toggleFriendDto: ToggleFriendDto,
    isAcepted: boolean,
  ) {
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

        await entityManager.save(friendRequest);

        return { friendRequest: friendRequest, isAcepted: isAcepted };
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
   * Retrieves all users from the database with optional filtering by name and pagination.
   *
   * @param {number} id - The ID of the user to exclude from the results.
   * @param {string} query.search - An optional search term to filter users by name.
   * @param {number} page - The page number for pagination.
   * @param {number} limit - The number of items per page for pagination.
   * @returns {Promise<User[]>} - Resolves to an array of User entities matching the criteria.
   * @throws {Error} - Throws an error if the operation fails due to internal issues or if the users cannot be retrieved.
   */
  async getAllUsers(
    id: number,
    query: { search?: string },
    page: number,
    limit: number,
  ): Promise<User[]> {
    try {
      const allUsers = await this.userRepository.find({
        where: {
          id: Not(id),
          name: Like(`%${query.search || ''}%`),
        },
        skip: page * limit,
        take: limit,
      });

      return allUsers;
    } catch (error) {
      console.error('Error retrieving users:', error);
      throw new Error('Failed to retrieve users');
    }
  }
}
