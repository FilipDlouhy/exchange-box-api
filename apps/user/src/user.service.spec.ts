import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../../libs/database/src/entities/user.entity';
import { FriendRequest } from '../../../libs/database/src/entities/friend.request.entity';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { UpdateCurrentUserDto } from 'libs/dtos/userDtos/update.current.user.dto';
import { CreateItemUserDto } from 'libs/dtos/userDtos/create.item.user.dto';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const mockUserRepository = () => ({
  find: jest.fn(),
  delete: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

const mockFriendRequestRepository = () => ({
  find: jest.fn(),
});

describe('UserService', () => {
  let userService: UserService;
  let userRepository: MockRepository<User>;
  let friendRequestRepository: MockRepository<FriendRequest>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        {
          provide: getRepositoryToken(FriendRequest),
          useFactory: mockFriendRequestRepository,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get<MockRepository<User>>(getRepositoryToken(User));
    friendRequestRepository = module.get<MockRepository<FriendRequest>>(
      getRepositoryToken(FriendRequest),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should successfully create a user', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'Test1234',
        name: 'test',
      };

      userRepository.save.mockResolvedValue({ id: 1, ...createUserDto });

      await userService.createUser(createUserDto);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createUserDto.email,
        }),
      );
    });

    it('should throw a ConflictException if the email already exists', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'Test1234',
        name: 'test',
      };

      userRepository.save.mockRejectedValue({ code: 'ER_DUP_ENTRY' });

      await expect(userService.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getCurrentUserProfile', () => {
    it('should return current user profile', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        name: 'User',
        friends: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.getCurrentUserProfile(userId);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['friends', 'items', 'exchanges'],
      });
      expect(result).toBeDefined();
      expect(result.email).toEqual(mockUser.email);
    });

    it('should throw Error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(userService.getCurrentUserProfile(1)).rejects.toThrow(Error);
    });
  });

  describe('updateCurrentUser', () => {
    it('should update current user', async () => {
      const updateCurrentUserDto: UpdateCurrentUserDto =
        new UpdateCurrentUserDto();

      updateCurrentUserDto.email = 'test@example.com';
      updateCurrentUserDto.name = 'test';
      updateCurrentUserDto.address = 'Test';
      updateCurrentUserDto.id = 1;
      updateCurrentUserDto.latitude = 1;
      updateCurrentUserDto.longitude = 1;
      updateCurrentUserDto.telephone = '654 54654 ';
      updateCurrentUserDto.images = [];
      const mockUser = {
        id: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockImplementation((user) =>
        Promise.resolve({ ...user }),
      );

      await userService.updateCurentUser(updateCurrentUserDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: updateCurrentUserDto.id },
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: updateCurrentUserDto.name,
        }),
      );
    });
  });

  describe('getUsers', () => {
    it('should return an array of user DTOs when users are found', async () => {
      userRepository.find.mockResolvedValue([
        { id: 1, name: 'Test User', email: 'test@example.com' },
      ]);
      const users = await userService.getUsers();
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('Test User');
    });

    it('should throw NotFoundException when no users are found', async () => {
      userRepository.find.mockResolvedValue([]);
      await expect(userService.getUsers()).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on unexpected errors', async () => {
      userRepository.find.mockRejectedValue(new Error('Unexpected error'));
      await expect(userService.getUsers()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete a user when the user exists', async () => {
      userRepository.delete.mockResolvedValue({ affected: 1 });
      await expect(userService.deleteUser(1)).resolves.not.toThrow();
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      userRepository.delete.mockResolvedValue({ affected: 0 });
      await expect(userService.deleteUser(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on unexpected errors', async () => {
      userRepository.delete.mockRejectedValue(new Error('Unexpected error'));
      await expect(userService.deleteUser(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete a user when the user exists', async () => {
      userRepository.delete.mockResolvedValue({ affected: 1 });
      await expect(userService.deleteUser(1)).resolves.not.toThrow();
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      userRepository.delete.mockResolvedValue({ affected: 0 });
      await expect(userService.deleteUser(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on unexpected errors', async () => {
      userRepository.delete.mockRejectedValue(new Error('Unexpected error'));
      await expect(userService.deleteUser(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should return a user when a matching email is found', async () => {
      const userEmail = 'test@example.com';
      const mockUser = {
        id: 1,
        email: userEmail,
        name: 'Test User',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail(userEmail);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: userEmail },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if no user is found with the provided email', async () => {
      const userEmail = 'test@example.com';

      userRepository.findOne.mockResolvedValue(null);

      await expect(userService.getUserByEmail(userEmail)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on unexpected errors', async () => {
      const userEmail = 'test@example.com';
      const error = new Error('Unexpected error');

      userRepository.findOne.mockRejectedValue(error);

      await expect(userService.getUserByEmail(userEmail)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserForProfile', () => {
    it('should return a user profile for a valid friend ID', async () => {
      const toggleFriendDto = { userId: 1, friendId: 2 };
      const mockUser = {
        id: 1,
        friends: [{ id: 2, name: 'Friend User', email: 'friend@example.com' }],
      };
      const mockProfileUser = {
        id: 2,
        name: 'Profile User',
        email: 'profile@example.com',
        friends: [],
        items: [],
        imageUrl: 'profileImage.jpg',
        backgroundImageUrl: 'backgroundImage.jpg',
        address: 'Some Address',
        telephone: '123456789',
      };
      const mockFriendRequests = [];

      userRepository.findOne.mockImplementation(({ where: { id } }) =>
        Promise.resolve(
          id === toggleFriendDto.userId ? mockUser : mockProfileUser,
        ),
      );
      friendRequestRepository.find.mockResolvedValue(mockFriendRequests);

      const result = await userService.getUserForProfile(toggleFriendDto);

      expect(result).toBeDefined();
      expect(result.id).toEqual(mockProfileUser.id);
      expect(result.email).toEqual(mockProfileUser.email);
      expect(userRepository.findOne).toHaveBeenCalledTimes(2);
      expect(friendRequestRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the user is not found', async () => {
      const toggleFriendDto = { userId: 1, friendId: 2 };

      userRepository.findOne.mockResolvedValue(null);
      await expect(
        userService.getUserForProfile(toggleFriendDto),
      ).rejects.toThrow(Error);
    });

    it('should throw an error if the profile user is not found', async () => {
      const toggleFriendDto = { userId: 1, friendId: 2 };
      const mockUser = { id: 1, friends: [] };

      userRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      await expect(
        userService.getUserForProfile(toggleFriendDto),
      ).rejects.toThrow(Error);
    });
  });

  describe('getUserById', () => {
    it('should return a user if found', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.getUserById(1);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(userService.getUserById(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFriendsForItemCreation', () => {
    it('should return an array of CreateItemUserDto for user friends', async () => {
      const mockFriends = [
        { id: 2, name: 'Friend One' },
        { id: 3, name: 'Friend Two' },
      ];
      const mockUser = { id: 1, friends: mockFriends };
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.getFriendsForItemCreation(1);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['friends'],
      });
      expect(result).toEqual(
        mockFriends.map((friend) => new CreateItemUserDto(friend)),
      );
    });

    it('should throw Error if user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(userService.getFriendsForItemCreation(999)).rejects.toThrow(
        Error,
      );
    });
  });
});
