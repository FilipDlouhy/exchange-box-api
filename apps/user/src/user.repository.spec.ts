import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../libs/database/src/entities/user.entity';
import { UserRepository } from './user.repository';
import { FriendRequest } from '@app/database';
import * as bcrypt from 'bcrypt';
import { UpdateCurrentUserDto } from 'libs/dtos/userDtos/update.current.user.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let userRepoMock: Partial<Record<keyof Repository<User>, jest.Mock>>;
  let friendRequestRepoMock: Partial<
    Record<keyof Repository<FriendRequest>, jest.Mock>
  >;

  beforeEach(async () => {
    userRepoMock = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    };
    friendRequestRepoMock = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: getRepositoryToken(User), useValue: userRepoMock },
        {
          provide: getRepositoryToken(FriendRequest),
          useValue: friendRequestRepoMock,
        },
      ],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should hash password and save the user', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'test',
      };
      await userRepository.createUser(createUserDto);
      expect(userRepoMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'hashedPassword',
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepoMock.save.mockRejectedValue({ code: 'ER_DUP_ENTRY' });
      await expect(
        userRepository.createUser({
          email: 'test@example.com',
          password: 'password123',
          name: 'test',
        }),
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('getCurrentUserProfile', () => {
    it('should return the user profile without password', async () => {
      const mockUser = {
        id: 1,
        password: 'password123',
        friends: [],
        items: [],
        exchanges: [],
      };
      userRepoMock.findOne.mockResolvedValue(mockUser);
      const result = await userRepository.getCurrentUserProfile(1);
      expect(userRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: [
          'friends',
          'items',
          'exchanges',
          'exchanges.friend',
          'exchanges.items',
          'exchanges.user',
        ],
      });
      expect(result.password).toBeUndefined();
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException if user is not found', async () => {
      userRepoMock.findOne.mockResolvedValue(null);
      await expect(userRepository.getCurrentUserProfile(1)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('getUserForItemUpdate', () => {
    it('should return a user for item update', async () => {
      const expectedUser = { id: 1 };
      userRepoMock.findOne.mockResolvedValue(expectedUser);
      const result = await userRepository.getUserForItemUpdate(1);
      expect(userRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should throw an error when database access fails', async () => {
      userRepoMock.findOne.mockRejectedValue(new Error('Database error'));
      await expect(userRepository.getUserForItemUpdate(1)).rejects.toThrow(
        'Error retrieving user',
      );
    });
  });

  describe('findUser', () => {
    it('should find a user by ID', async () => {
      const expectedUser = { id: 1 };
      userRepoMock.findOne.mockResolvedValue(expectedUser);
      const result = await userRepository.findUser(1);
      expect(userRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should throw an error when user is not found', async () => {
      userRepoMock.findOne.mockRejectedValue(new Error('User not found error'));
      await expect(userRepository.findUser(1)).rejects.toThrow(
        'Failed to find user',
      );
    });
  });

  describe('updateCurrentUser', () => {
    it('should update user data and save', async () => {
      const mockUser: User = {
        id: 1,
        name: 'Old Name',
        telephone: '0987654321',
        address: '123 Old Address',
        email: 'old@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url',
        backgroundImageUrl: 'background_image_url',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      };

      const updateData: UpdateCurrentUserDto = {
        id: 1,
        name: 'New Name',
        telephone: '1234567890',
        address: '123 New Address',
        email: 'new@example.com',
        longitude: 50,
        latitude: 40,
      };

      userRepoMock.save.mockResolvedValue(mockUser);
      await userRepository.updateCurentUser(updateData, mockUser);
      expect(userRepoMock.save).toHaveBeenCalledWith({
        ...mockUser,
        ...updateData,
      });
    });
  });

  describe('getUsers', () => {
    it('should return a list of users', async () => {
      const usersArray = [{ id: 1, name: 'John Doe' }];
      userRepoMock.find.mockResolvedValue(usersArray);
      const result = await userRepository.getUsers();
      expect(result).toEqual(usersArray);
    });

    it('should throw NotFoundException if no users are found', async () => {
      userRepoMock.find.mockResolvedValue([]);
      await expect(userRepository.getUsers()).rejects.toThrow('No users found');
    });
  });

  describe('getUserWithFriends', () => {
    it('should retrieve a user with friends', async () => {
      const mockUser = { id: 1, friends: [{ id: 2 }] };
      userRepoMock.findOne.mockResolvedValue(mockUser);
      const result = await userRepository.getUserWithFriends(1);
      expect(result).toEqual(mockUser);
    });

    it('should throw an error if user does not exist', async () => {
      userRepoMock.findOne.mockResolvedValue(null);
      await expect(userRepository.getUserWithFriends(1)).rejects.toThrow(
        'User with id 1 not found.',
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      userRepoMock.delete.mockResolvedValue({ affected: 1 });
      await userRepository.deleteUser(1);
      expect(userRepoMock.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if no user is deleted', async () => {
      userRepoMock.delete.mockResolvedValue({ affected: 0 });
      await expect(userRepository.deleteUser(1)).rejects.toThrow(
        'User with ID 1 not found',
      );
    });

    it('should handle errors during deletion', async () => {
      userRepoMock.delete.mockRejectedValue(new Error('Internal server error'));
      await expect(userRepository.deleteUser(1)).rejects.toThrow(
        'An error occurred during the deleteUser operation: Internal server error',
      );
    });
  });
  describe('uploadUserImage', () => {
    it('should upload an image URL to the user profile', async () => {
      const user = { id: 1, imageUrl: null };
      userRepoMock.save.mockResolvedValue(user);
      userRepoMock.findOne.mockResolvedValue(user);

      await userRepository.uploadUserImage(
        1,
        'http://example.com/image.jpg',
        false,
      );
      expect(user.imageUrl).toEqual('http://example.com/image.jpg');
      expect(userRepoMock.save).toHaveBeenCalledWith(user);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepoMock.findOne.mockResolvedValue(null);
      await expect(
        userRepository.uploadUserImage(
          1,
          'http://example.com/image.jpg',
          false,
        ),
      ).rejects.toThrow('User with ID 1 not found');
    });
  });

  describe('deleteUserImage', () => {
    it('should delete the user image URL', async () => {
      userRepoMock.update.mockResolvedValue({ affected: 1 });
      await userRepository.deleteUserImage(1);
      expect(userRepoMock.update).toHaveBeenCalledWith(1, { imageUrl: null });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepoMock.update.mockResolvedValue({ affected: 0 });
      await expect(userRepository.deleteUserImage(1)).rejects.toThrow(
        'User with ID 1 not found',
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should retrieve a user by their email', async () => {
      const user = { id: 1, email: 'test@example.com' };
      userRepoMock.findOne.mockResolvedValue(user);
      const result = await userRepository.getUserByEmail('test@example.com');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if the user email is not found', async () => {
      userRepoMock.findOne.mockResolvedValue(null);
      await expect(
        userRepository.getUserByEmail('test@example.com'),
      ).rejects.toThrow('User with email test@example.com not found');
    });
  });

  describe('getUserForProfile', () => {
    it('should retrieve user, friend requests, and profile user data', async () => {
      const user = { id: 1, friends: [] };
      const friendRequests = [{ userId: 1, friendId: 2 }];
      const profileUser = { id: 2, friends: [] };

      userRepoMock.findOne.mockImplementation((options) => {
        if (options.where.id === 1) return Promise.resolve(user);
        if (options.where.id === 2) return Promise.resolve(profileUser);
        return Promise.reject(new Error('User not found'));
      });
      friendRequestRepoMock.find.mockResolvedValue(friendRequests);

      const result = await userRepository.getUserForProfile({
        userId: 1,
        friendId: 2,
      });
      expect(result).toEqual([user, friendRequests, profileUser]);
    });

    it('should handle errors properly', async () => {
      userRepoMock.findOne.mockRejectedValue(
        new Error('Failed to retrieve user'),
      );
      await expect(
        userRepository.getUserForProfile({ userId: 1, friendId: 2 }),
      ).rejects.toThrow('Failed to retrieve user profile');
    });
  });
  describe('changePasswordDto', () => {
    const changePasswordDto = {
      email: 'user@example.com',
      password: 'oldPassword',
      newPassword: 'newPassword',
    };

    it('should change the user password when valid', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        password: 'hashedOldPassword',
      };
      userRepoMock.findOne.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockImplementation((input, hashed) => {
        if (input === 'oldPassword' && hashed === 'hashedOldPassword')
          return Promise.resolve(true);
        if (input === 'newPassword' && hashed === 'hashedOldPassword')
          return Promise.resolve(false);
        return Promise.resolve(false);
      });
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedNewPassword');

      const userId = await userRepository.changePasswordDto(changePasswordDto);
      expect(userId).toEqual(user.id);
      expect(user.password).toEqual('hashedNewPassword');
      expect(userRepoMock.save).toHaveBeenCalledWith({
        ...user,
        password: 'hashedNewPassword',
      });
    });

    it('should throw an error if user is not found', async () => {
      userRepoMock.findOne.mockResolvedValue(null);
      await expect(
        userRepository.changePasswordDto(changePasswordDto),
      ).rejects.toThrow('User not found.');
    });

    it('should throw an error if the old password is invalid', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        password: 'hashedOldPassword',
      };
      userRepoMock.findOne.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(
        userRepository.changePasswordDto(changePasswordDto),
      ).rejects.toThrow('Invalid password.');
    });

    it('should throw an error if the new password is the same as the old password', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        password: 'hashedOldPassword',
      };
      userRepoMock.findOne.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockImplementation((input, hashed) => {
        return Promise.resolve(true);
      });

      await expect(
        userRepository.changePasswordDto({
          ...changePasswordDto,
          newPassword: 'oldPassword',
        }),
      ).rejects.toThrow(
        'New password must be different from the current password.',
      );
    });
  });
});
