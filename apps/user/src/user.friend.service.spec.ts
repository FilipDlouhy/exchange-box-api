import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from '../../../libs/database/src/entities/user.entity';
import { FriendRequest } from '../../../libs/database/src/entities/friend.request.entity';
import { UserFriendService } from './user.friend.service';
import { Repository } from 'typeorm';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const mockUserRepository = (): MockRepository<User> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  findByIds: jest.fn(),
});

const mockFriendRequestRepository = (): MockRepository<FriendRequest> => ({
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

describe('UserFriendService', () => {
  let service: UserFriendService;
  let userRepository: MockRepository<User>;
  let friendRequestRepository: MockRepository<FriendRequest>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserFriendService,
        {
          provide: getRepositoryToken(User),
          useFactory: mockUserRepository,
        },
        {
          provide: getRepositoryToken(FriendRequest),
          useFactory: mockFriendRequestRepository,
        },
      ],
    }).compile();

    service = module.get<UserFriendService>(UserFriendService);
    userRepository = module.get<MockRepository<User>>(getRepositoryToken(User));
    friendRequestRepository = module.get<MockRepository<FriendRequest>>(
      getRepositoryToken(FriendRequest),
    );

    Object.values(userRepository).forEach((mockFn) => mockFn.mockReset());
    Object.values(friendRequestRepository).forEach((mockFn) =>
      mockFn.mockReset(),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(userRepository).toBeDefined();
    expect(friendRequestRepository).toBeDefined();
  });

  describe('getFriendsOrNonFriends', () => {
    const mockUser: User = {
      id: 1,
      name: 'Test User',
      friends: [],
      address: 'asd',
      backgroundImageUrl: 'test',
      email: 'test@test.com',
      exchanges: [],
      imageUrl: 'test',
      password: 'test',
      items: [],
      latitude: 54,
      longitude: 54,
      notifications: [],
      telephone: '654',
    };
    it('should return an empty array', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.find.mockResolvedValue([mockUser]);

      const result = await service.getFriendsOrNonFriends(1, true);

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['friends'],
      });
    });
  });

  describe('UserFriendService - checkIfFriends', () => {
    const mockUser: User = {
      id: 1,
      name: 'John Doe',
      friends: [
        {
          id: 2,
          name: 'Jane Doe',
          friends: [],
          address: '123 Main St',
          backgroundImageUrl: 'url-to-image',
          email: 'jane@example.com',
          exchanges: [],
          imageUrl: 'url-to-avatar',
          password: 'securepassword',
          items: [],
          latitude: 40.7128,
          longitude: -74.006,
          notifications: [],
          telephone: '123-456-7890',
        },
      ],
      address: '456 Elm St',
      backgroundImageUrl: 'url-to-background',
      email: 'john@example.com',
      exchanges: [],
      imageUrl: 'url-to-avatar',
      password: 'anothersecurepassword',
      items: [],
      latitude: 40.7128,
      longitude: -74.006,
      notifications: [],
      telephone: '098-765-4321',
    };

    it('should throw ConflictException when users are friends', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.checkIfFriends(mockUser.id, mockUser.friends[0].id),
      ).rejects.toThrow('The specified users are friends.');
    });

    it('should throw ConflictException when users are friends', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.checkIfFriends(mockUser.id, mockUser.friends[0].id),
      ).rejects.toThrow('The specified users are friends.');
    });

    it('should return false when users are not friends', async () => {
      const nonFriendUser = { ...mockUser, friends: [] };
      userRepository.findOne.mockResolvedValue(nonFriendUser);

      await expect(service.checkIfFriends(1, 2)).resolves.toBe(false);
    });
  });

  describe('UserFriendService - getUserWithFriend', () => {
    const mockUser: User = {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'hashedpassword123',
      imageUrl: 'https://example.com/path/to/image.jpg',
      backgroundImageUrl: 'https://example.com/path/to/background.jpg',
      address: '123 Main St, Anytown, AT 12345',
      telephone: '123-456-7890',
      latitude: 40.7128,
      longitude: -74.006,
      friends: [],
      items: [],
      exchanges: [],
      notifications: [],
    };

    const mockFriend: User = {
      ...mockUser,
      id: 2,
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      imageUrl: 'https://example.com/path/to/another/image.jpg',
    };

    it('should return both user and friend when both are found', async () => {
      userRepository.findByIds.mockResolvedValue([mockUser, mockFriend]);

      const result = await service.getUserWithFriend(
        mockUser.id,
        mockFriend.id,
      );
      expect(result).toEqual({ user: mockUser, friend: mockFriend });
    });

    it('should throw NotFoundException if one or both users are not found', async () => {
      userRepository.findByIds.mockResolvedValue([mockUser]);

      await expect(service.getUserWithFriend(1, 3)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on unexpected errors', async () => {
      userRepository.findByIds.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(service.getUserWithFriend(1, 2)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
