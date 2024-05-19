import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from '../../../libs/database/src/entities/user.entity';
import { ToggleFriendDto } from 'libs/dtos/userDtos/toggle.friend.dto';
import { UpdateCurrentUserDto } from 'libs/dtos/userDtos/update.current.user.dto';
import { CreateUserDto } from 'libs/dtos/userDtos/create.user.dto';
import { UserProfileDto } from 'libs/dtos/userDtos/user.profile.dto';
import { FriendSimpleDto } from 'libs/dtos/userDtos/friend.simple.dto';
import { CreateItemUserDto } from 'libs/dtos/userDtos/create.item.user.dto';
import { CurrentUserDto } from 'libs/dtos/userDtos/current.user.dto';
import { ChangePasswordDto } from 'libs/dtos/userDtos/change.password.dto';
import { UserDto } from 'libs/dtos/userDtos/user.dto';
import {
  getImageUrlFromFirebase,
  deleteFileFromFirebase,
} from '../../../libs/database/src/firabase-storage';
import { sendNotification } from '../../../libs/tcp/src/notifications/notification.helper';

jest.mock('../../../libs/tcp/src/notifications/notification.helper');
jest.mock('../../../libs/database/src/firabase-storage');

describe('UserService', () => {
  let service: UserService;
  let userRepository: UserRepository;
  let mockNotificationClient: any;

  beforeEach(async () => {
    mockNotificationClient = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            createUser: jest.fn(),
            getCurrentUserProfile: jest.fn(),
            getUserForItemUpdate: jest.fn(),
            updateCurentUser: jest.fn(),
            getUsers: jest.fn(),
            getUserWithFriends: jest.fn(),
            deleteUser: jest.fn(),
            deleteUserImage: jest.fn(),
            getUserByEmail: jest.fn(),
            getUserForProfile: jest.fn(),
            changePasswordDto: jest.fn(),
            findUser: jest.fn(),
            uploadUserImage: jest.fn(),
          },
        },
        {
          provide: 'NOTIFICATION_CLIENT',
          useValue: mockNotificationClient,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<UserRepository>(UserRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password',
      };
      await expect(service.createUser(createUserDto)).resolves.toBeUndefined();
      expect(userRepository.createUser).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw an error if creating user fails', async () => {
      const createUserDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password',
      };
      jest
        .spyOn(userRepository, 'createUser')
        .mockRejectedValueOnce(new Error());

      await expect(service.createUser(createUserDto)).rejects.toThrow(Error);
    });
  });

  describe('getCurrentUserProfile', () => {
    it('should return the current user profile', async () => {
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

      jest
        .spyOn(userRepository, 'getCurrentUserProfile')
        .mockResolvedValue(user);

      const result = await service.getCurrentUserProfile(1);

      expect(result).toBeInstanceOf(CurrentUserDto);
      expect(userRepository.getCurrentUserProfile).toHaveBeenCalledWith(1);
    });

    it('should throw an error if retrieving user profile fails', async () => {
      jest
        .spyOn(userRepository, 'getCurrentUserProfile')
        .mockRejectedValueOnce(new Error());

      await expect(service.getCurrentUserProfile(1)).rejects.toThrow(Error);
    });
  });

  describe('getUserForItemUpdate', () => {
    it('should return the user for item update', async () => {
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

      jest
        .spyOn(userRepository, 'getUserForItemUpdate')
        .mockResolvedValue(user);

      const result = await service.getUserForItemUpdate(1);

      expect(result).toBe(user);
      expect(userRepository.getUserForItemUpdate).toHaveBeenCalledWith(1);
    });

    it('should throw an error if retrieving user for item update fails', async () => {
      jest
        .spyOn(userRepository, 'getUserForItemUpdate')
        .mockRejectedValueOnce(new Error());

      await expect(service.getUserForItemUpdate(1)).rejects.toThrow(Error);
    });
  });

  describe('updateCurentUser', () => {
    it('should update the current user', async () => {
      const updateCurrentUserDto: UpdateCurrentUserDto = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        telephone: '1234567890',
        address: '123 Main St',
        images: [],
      };

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

      jest.spyOn(userRepository, 'findUser').mockResolvedValue(user);

      await expect(
        service.updateCurentUser(updateCurrentUserDto),
      ).resolves.toBeUndefined();

      expect(userRepository.findUser).toHaveBeenCalledWith(1);
      expect(userRepository.updateCurentUser).toHaveBeenCalledWith(
        updateCurrentUserDto,
        user,
      );
    });

    it('should throw an error if updating the current user fails', async () => {
      const updateCurrentUserDto: UpdateCurrentUserDto = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        telephone: '1234567890',
        address: '123 Main St',
        images: [],
      };

      jest.spyOn(userRepository, 'findUser').mockRejectedValueOnce(new Error());

      await expect(
        service.updateCurentUser(updateCurrentUserDto),
      ).rejects.toThrow(Error);
    });
  });

  describe('getUsers', () => {
    it('should return a list of users', async () => {
      const users = [
        new User({
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
        }),
      ];

      jest.spyOn(userRepository, 'getUsers').mockResolvedValue(users);

      const result = await service.getUsers();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(UserDto);
      expect(userRepository.getUsers).toHaveBeenCalled();
    });

    it('should throw an error if retrieving users fails', async () => {
      jest.spyOn(userRepository, 'getUsers').mockRejectedValueOnce(new Error());

      await expect(service.getUsers()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUsersFriendsSimple', () => {
    it("should return a list of user's friends", async () => {
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
        friends: [
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
        ],
        items: [],
        notifications: [],
      });

      jest.spyOn(userRepository, 'getUserWithFriends').mockResolvedValue(user);

      const result = await service.getUsersFriendsSimple(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(FriendSimpleDto);
      expect(userRepository.getUserWithFriends).toHaveBeenCalledWith(1);
    });

    it("should throw an error if retrieving user's friends fails", async () => {
      jest
        .spyOn(userRepository, 'getUserWithFriends')
        .mockRejectedValueOnce(new Error());

      await expect(service.getUsersFriendsSimple(1)).rejects.toThrow(Error);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      await expect(service.deleteUser(1)).resolves.toBeUndefined();
      expect(userRepository.deleteUser).toHaveBeenCalledWith(1);
    });

    it('should throw an error if deleting user fails', async () => {
      jest
        .spyOn(userRepository, 'deleteUser')
        .mockRejectedValueOnce(new Error());

      await expect(service.deleteUser(1)).rejects.toThrow(Error);
    });
  });

  describe('getUserImage', () => {
    it('should return the user image URL', async () => {
      const imageUrl = 'image_url';
      (getImageUrlFromFirebase as jest.Mock).mockResolvedValue(imageUrl);

      const result = await service.getUserImage(1);

      expect(result).toBe(imageUrl);
      expect(getImageUrlFromFirebase).toHaveBeenCalledWith('1', 'Users');
    });

    it('should throw NotFoundException if image is not found', async () => {
      (getImageUrlFromFirebase as jest.Mock).mockResolvedValue(null);

      await expect(service.getUserImage(1)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException for other errors', async () => {
      (getImageUrlFromFirebase as jest.Mock).mockRejectedValue(new Error());

      await expect(service.getUserImage(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteUserImage', () => {
    it('should delete the user image', async () => {
      await expect(service.deleteUserImage(1)).resolves.toBeUndefined();
      expect(deleteFileFromFirebase).toHaveBeenCalledWith('1', 'Users');
      expect(userRepository.deleteUserImage).toHaveBeenCalledWith(1);
    });

    it('should throw an error if deleting user image fails', async () => {
      (deleteFileFromFirebase as jest.Mock).mockRejectedValue(new Error());

      await expect(service.deleteUserImage(1)).rejects.toThrow(Error);
    });
  });

  describe('getUserByEmail', () => {
    it('should return a user by email', async () => {
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

      jest.spyOn(userRepository, 'getUserByEmail').mockResolvedValue(user);

      const result = await service.getUserByEmail('john@example.com');

      expect(result).toBe(user);
      expect(userRepository.getUserByEmail).toHaveBeenCalledWith(
        'john@example.com',
      );
    });

    it('should throw an error if retrieving user by email fails', async () => {
      jest
        .spyOn(userRepository, 'getUserByEmail')
        .mockRejectedValueOnce(new Error());

      await expect(service.getUserByEmail('john@example.com')).rejects.toThrow(
        Error,
      );
    });
  });

  describe('getUserForProfile', () => {
    it('should return a user profile', async () => {
      const toggleFriendDto: ToggleFriendDto = { userId: 1, friendId: 2 };
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

      const profileUser = new User({
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

      const friendRequests = [];

      jest
        .spyOn(userRepository, 'getUserForProfile')
        .mockResolvedValue([user, friendRequests, profileUser]);

      const result = await service.getUserForProfile(toggleFriendDto);

      expect(result).toBeInstanceOf(UserProfileDto);
      expect(userRepository.getUserForProfile).toHaveBeenCalledWith(
        toggleFriendDto,
      );
    });

    it('should throw an error if retrieving user profile fails', async () => {
      const toggleFriendDto: ToggleFriendDto = { userId: 1, friendId: 2 };
      jest
        .spyOn(userRepository, 'getUserForProfile')
        .mockRejectedValueOnce(new Error());

      await expect(service.getUserForProfile(toggleFriendDto)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('changePasswordDto', () => {
    it('should change the password and send a notification', async () => {
      const changePasswordDto: ChangePasswordDto = {
        email: 'test@emal.cz',
        newPassword: 'new_password',
        password: 'password',
      };

      jest.spyOn(userRepository, 'changePasswordDto').mockResolvedValue(1);

      await expect(
        service.changePasswordDto(changePasswordDto),
      ).resolves.toBeUndefined();

      expect(userRepository.changePasswordDto).toHaveBeenCalledWith(
        changePasswordDto,
      );
      expect(sendNotification).toHaveBeenCalledWith(
        service['notificationClient'],
        expect.objectContaining({
          userId: '1',
          text: 'You have changed password',
        }),
      );
    });

    it('should throw an error if changing password fails', async () => {
      const changePasswordDto: ChangePasswordDto = {
        email: 'test@emal.cz',
        newPassword: 'new_password',
        password: 'password',
      };

      jest
        .spyOn(userRepository, 'changePasswordDto')
        .mockRejectedValueOnce(new Error());

      await expect(
        service.changePasswordDto(changePasswordDto),
      ).rejects.toThrow(Error);
    });
  });

  describe('getUserById', () => {
    it('should return a user by ID', async () => {
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

      jest.spyOn(userRepository, 'findUser').mockResolvedValue(user);

      const result = await service.getUserById(1);

      expect(result).toBe(user);
      expect(userRepository.findUser).toHaveBeenCalledWith(1);
    });

    it('should throw an error if retrieving user by ID fails', async () => {
      jest.spyOn(userRepository, 'findUser').mockRejectedValueOnce(new Error());

      await expect(service.getUserById(1)).rejects.toThrow(Error);
    });
  });

  describe('getFriendsForItemCreation', () => {
    it('should return friends for item creation', async () => {
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
        friends: [
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
        ],
        items: [],
        notifications: [],
      });

      jest.spyOn(userRepository, 'getUserWithFriends').mockResolvedValue(user);

      const result = await service.getFriendsForItemCreation(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(CreateItemUserDto);
      expect(userRepository.getUserWithFriends).toHaveBeenCalledWith(1);
    });

    it('should throw an error if retrieving friends for item creation fails', async () => {
      jest
        .spyOn(userRepository, 'getUserWithFriends')
        .mockRejectedValueOnce(new Error());

      await expect(service.getFriendsForItemCreation(1)).rejects.toThrow(Error);
    });
  });
});
