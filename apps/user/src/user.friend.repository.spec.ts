import { Test, TestingModule } from '@nestjs/testing';
import { UserFriendRepository } from './user.friend.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager, Like, Not } from 'typeorm';
import { User, FriendRequest } from '@app/database';
import { ToggleFriendDto } from 'libs/dtos/userDtos/toggle.friend.dto';
import {
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { NotFoundError } from 'rxjs';

describe('UserFriendRepository', () => {
  let repository: UserFriendRepository;
  let userRepository: Repository<User>;
  let friendRequestRepository: Repository<FriendRequest>;
  let entityManager: EntityManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserFriendRepository,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(FriendRequest),
          useClass: Repository,
        },
        {
          provide: EntityManager,
          useValue: {
            transaction: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<UserFriendRepository>(UserFriendRepository);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    friendRequestRepository = module.get<Repository<FriendRequest>>(
      getRepositoryToken(FriendRequest),
    );
    entityManager = module.get<EntityManager>(EntityManager);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('addFriend', () => {
    it('should add a friend', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      const user = new User({
        id: 1,
        name: 'John Doe',
        telephone: '1234567890',
        address: '123 Main St',
        email: 'john@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url_1',
        backgroundImageUrl: 'background_image_url_1',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      });

      const friend = new User({
        id: 2,
        name: 'Jane Smith',
        telephone: '0987654321',
        address: '456 Elm St',
        email: 'jane@example.com',
        longitude: 42,
        latitude: 32,
        password: 'password',
        imageUrl: 'image_url_2',
        backgroundImageUrl: 'background_image_url_2',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      });

      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(user);
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(friend);
      jest.spyOn(userRepository, 'save').mockResolvedValueOnce(user);
      jest.spyOn(userRepository, 'save').mockResolvedValueOnce(friend);

      await expect(
        repository.addFriend(toggleFriendDto),
      ).resolves.toBeUndefined();

      expect(userRepository.findOne).toHaveBeenCalledTimes(2);
      expect(userRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if user or friend is not found', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(repository.addFriend(toggleFriendDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if friendship already exists', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      const user = new User({
        id: 1,
        name: 'John Doe',
        telephone: '1234567890',
        address: '123 Main St',
        email: 'john@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url_1',
        backgroundImageUrl: 'background_image_url_1',
        events: [],
        exchanges: [],
        friends: [{ id: 2 } as User],
        items: [],
        notifications: [],
      });

      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(user);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce({ id: 2 } as User);

      await expect(repository.addFriend(toggleFriendDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException for other errors', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest.spyOn(userRepository, 'findOne').mockRejectedValueOnce(new Error());

      await expect(repository.addFriend(toggleFriendDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('removeFriend', () => {
    it('should remove a friend', async () => {
      const userId = 1;
      const friendId = 2;
      const user = new User({
        id: userId,
        name: 'John Doe',
        telephone: '1234567890',
        address: '123 Main St',
        email: 'john@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url_1',
        backgroundImageUrl: 'background_image_url_1',
        events: [],
        exchanges: [],
        friends: [{ id: friendId } as User],
        items: [],
        notifications: [],
      });
      const friend = new User({
        id: friendId,
        name: 'Jane Smith',
        telephone: '0987654321',
        address: '456 Elm St',
        email: 'jane@example.com',
        longitude: 42,
        latitude: 32,
        password: 'password',
        imageUrl: 'image_url_2',
        backgroundImageUrl: 'background_image_url_2',
        events: [],
        exchanges: [],
        friends: [{ id: userId } as User],
        items: [],
        notifications: [],
      });

      jest.spyOn(entityManager, 'transaction').mockImplementation(async () => {
        await entityManager;
      });
      jest.spyOn(entityManager, 'findOne').mockResolvedValueOnce(user);
      jest.spyOn(entityManager, 'findOne').mockResolvedValueOnce(friend);
      jest.spyOn(entityManager, 'save').mockResolvedValueOnce(user);
      jest.spyOn(entityManager, 'save').mockResolvedValueOnce(friend);

      await expect(
        repository.removeFriend(userId, friendId),
      ).resolves.toBeUndefined();

      expect(entityManager.findOne).toHaveBeenCalledTimes(2);
      expect(entityManager.save).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if user is not found', async () => {
      const userId = 1;
      const friendId = 2;

      jest.spyOn(entityManager, 'transaction').mockImplementation(async () => {
        await entityManager;
      });
      jest.spyOn(entityManager, 'findOne').mockResolvedValueOnce(null);

      await expect(repository.removeFriend(userId, friendId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException if friend is not found in user's friends list", async () => {
      const userId = 1;
      const friendId = 2;
      const user = new User({
        id: userId,
        name: 'John Doe',
        telephone: '1234567890',
        address: '123 Main St',
        email: 'john@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url_1',
        backgroundImageUrl: 'background_image_url_1',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      });

      jest.spyOn(entityManager, 'transaction').mockImplementation(async () => {
        await entityManager;
      });
      jest.spyOn(entityManager, 'findOne').mockResolvedValueOnce(user);

      await expect(repository.removeFriend(userId, friendId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException for other errors', async () => {
      const userId = 1;
      const friendId = 2;

      jest
        .spyOn(entityManager, 'transaction')
        .mockRejectedValueOnce(new Error());

      await expect(repository.removeFriend(userId, friendId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('checkIfFriends', () => {
    it('should return true if users are friends', async () => {
      const userId = 1;
      const friendId = 2;
      const user = new User({
        id: userId,
        name: 'John Doe',
        telephone: '1234567890',
        address: '123 Main St',
        email: 'john@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url_1',
        backgroundImageUrl: 'background_image_url_1',
        events: [],
        exchanges: [],
        friends: [{ id: friendId } as User],
        items: [],
        notifications: [],
      });

      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(user);

      const result = await repository.checkIfFriends(userId, friendId);

      expect(result).toBe(true);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['friends'],
      });
    });

    it('should throw NotFoundException if user is not found', async () => {
      const userId = 1;
      const friendId = 2;

      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(repository.checkIfFriends(userId, friendId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if friend is not found', async () => {
      const userId = 1;
      const friendId = 2;
      const user = new User({
        id: userId,
        name: 'John Doe',
        telephone: '1234567890',
        address: '123 Main St',
        email: 'john@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url_1',
        backgroundImageUrl: 'background_image_url_1',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      });

      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(user);
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(repository.checkIfFriends(userId, friendId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException for other errors', async () => {
      const userId = 1;
      const friendId = 2;

      jest.spyOn(userRepository, 'findOne').mockRejectedValueOnce(new Error());

      await expect(repository.checkIfFriends(userId, friendId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getFriendRequests', () => {
    it('should return friend requests', async () => {
      const id = 1;
      const friendRequests = [new FriendRequest()];
      jest
        .spyOn(friendRequestRepository, 'find')
        .mockResolvedValue(friendRequests);

      const result = await repository.getFriendRequests(id);

      expect(result).toHaveLength(1);
      expect(friendRequestRepository.find).toHaveBeenCalledWith({
        where: {
          userId: id,
          accepted: null,
          userName: Like(`%`),
          friendName: Like(`%`),
        },
        skip: 0,
        take: 10,
      });
    });

    it('should throw an error if retrieving friend requests fails', async () => {
      const id = 1;
      jest
        .spyOn(friendRequestRepository, 'find')
        .mockRejectedValue(new Error());

      await expect(repository.getFriendRequests(id)).rejects.toThrow(Error);
    });
  });

  describe('createFriendRequest', () => {
    it('should create a friend request', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      const user = new User({
        id: 1,
        name: 'John Doe',
        telephone: '1234567890',
        address: '123 Main St',
        email: 'john@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url_1',
        backgroundImageUrl: 'background_image_url_1',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      });
      const friend = new User({
        id: 2,
        name: 'Jane Smith',
        telephone: '0987654321',
        address: '456 Elm St',
        email: 'jane@example.com',
        longitude: 42,
        latitude: 32,
        password: 'password',
        imageUrl: 'image_url_2',
        backgroundImageUrl: 'background_image_url_2',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      });

      jest.spyOn(entityManager, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(entityManager, 'findOne').mockResolvedValueOnce(friend);
      jest.spyOn(entityManager, 'findOne').mockResolvedValueOnce(user);
      jest
        .spyOn(entityManager, 'save')
        .mockResolvedValueOnce(new FriendRequest());

      const result = await repository.createFriendRequest(
        toggleFriendDto,
        entityManager,
      );

      expect(result).toEqual({ user, friend });
      expect(entityManager.findOne).toHaveBeenCalledTimes(3);
      expect(entityManager.save).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if friend request already exists', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest
        .spyOn(entityManager, 'findOne')
        .mockResolvedValueOnce(new FriendRequest());

      await expect(
        repository.createFriendRequest(toggleFriendDto, entityManager),
      ).rejects.toThrow(Error);
    });

    it('should throw an error if creating friend request fails', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest.spyOn(entityManager, 'findOne').mockRejectedValueOnce(new Error());

      await expect(
        repository.createFriendRequest(toggleFriendDto, entityManager),
      ).rejects.toThrow(Error);
    });
  });

  describe('fetchUserAndValidate', () => {
    it('should return user if found', async () => {
      const id = 1;
      const user = new User({
        id,
        name: 'John Doe',
        telephone: '1234567890',
        address: '123 Main St',
        email: 'john@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url_1',
        backgroundImageUrl: 'background_image_url_1',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      });

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);

      const result = await repository.fetchUserAndValidate(id);

      expect(result).toBe(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['friends'],
      });
    });

    it('should throw NotFoundException if user is not found', async () => {
      const id = 1;
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(repository.fetchUserAndValidate(id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('accepOrDenytFriendRequest', () => {
    it('should accept a friend request', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      const friendRequest = new FriendRequest();
      jest.spyOn(entityManager, 'transaction').mockImplementation(async () => {
        return entityManager;
      });
      jest.spyOn(entityManager, 'findOne').mockResolvedValueOnce(friendRequest);
      jest.spyOn(entityManager, 'save').mockResolvedValueOnce(friendRequest);

      const result = await repository.accepOrDenytFriendRequest(
        toggleFriendDto,
        true,
      );

      expect(result).toEqual({ friendRequest, isAcepted: true });
      expect(entityManager.findOne).toHaveBeenCalledWith(FriendRequest, {
        where: {
          friendId: toggleFriendDto.friendId,
          userId: toggleFriendDto.userId,
        },
      });
      expect(entityManager.save).toHaveBeenCalledWith(friendRequest);
    });

    it('should throw NotFoundError if friend request is not found', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest.spyOn(entityManager, 'transaction').mockImplementation(async () => {
        return entityManager;
      });
      jest.spyOn(entityManager, 'findOne').mockResolvedValueOnce(null);

      await expect(
        repository.accepOrDenytFriendRequest(toggleFriendDto, true),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw an error if accepting friend request fails', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest
        .spyOn(entityManager, 'transaction')
        .mockRejectedValueOnce(new Error());

      await expect(
        repository.accepOrDenytFriendRequest(toggleFriendDto, true),
      ).rejects.toThrow(Error);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const users = [
        new User({
          id: 2,
          name: 'Jane Smith',
          telephone: '0987654321',
          address: '456 Elm St',
          email: 'jane@example.com',
          longitude: 42,
          latitude: 32,
          password: 'password',
          imageUrl: 'image_url_2',
          backgroundImageUrl: 'background_image_url_2',
          events: [],
          exchanges: [],
          friends: [],
          items: [],
          notifications: [],
        }),
      ];
      jest.spyOn(userRepository, 'find').mockResolvedValue(users);

      const result = await repository.getAllUsers(1, { search: '' }, 0, 10);

      expect(result).toHaveLength(1);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: {
          id: Not(1),
          name: Like('%%'),
        },
        skip: 0,
        take: 10,
      });
    });

    it('should throw an error if retrieving all users fails', async () => {
      jest.spyOn(userRepository, 'find').mockRejectedValue(new Error());

      await expect(
        repository.getAllUsers(1, { search: '' }, 0, 10),
      ).rejects.toThrow(Error);
    });
  });
});
