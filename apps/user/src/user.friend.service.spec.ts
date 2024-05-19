import { Test, TestingModule } from '@nestjs/testing';
import { UserFriendService } from './user.friend.service';
import { UserFriendRepository } from './user.friend.repository';
import { User } from '../../../libs/database/src/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FriendRequest } from '../../../libs/database/src/entities/friend.request.entity';
import { ToggleFriendDto } from 'libs/dtos/userDtos/toggle.friend.dto';
import { UserDto } from 'libs/dtos/userDtos/user.dto';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FriendRequestDto } from 'libs/dtos/userDtos/friend.request.dto';

describe('UserFriendService', () => {
  let service: UserFriendService;
  let userRepository: Repository<User>;
  let friendRequestRepository: Repository<FriendRequest>;
  let userFriendRepository: UserFriendRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserFriendService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(FriendRequest),
          useClass: Repository,
        },
        {
          provide: UserFriendRepository,
          useValue: {
            fetchUserAndValidate: jest.fn(),
            addFriend: jest.fn(),
            removeFriend: jest.fn(),
            checkIfFriends: jest.fn(),
            getAllUsers: jest.fn(),
            getFriendRequests: jest.fn(),
            createFriendRequest: jest.fn(),
            accepOrDenytFriendRequest: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserFriendService>(UserFriendService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    friendRequestRepository = module.get<Repository<FriendRequest>>(
      getRepositoryToken(FriendRequest),
    );
    userFriendRepository =
      module.get<UserFriendRepository>(UserFriendRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFriendsOrNonFriends', () => {
    it('should return friends of the user', async () => {
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
      user.friends = [
        new User({
          id: 2,
          name: 'Jane Doe',
          telephone: '0987654321',
          address: '456 Elm St',
          email: 'jane@example.com',
          longitude: 40,
          latitude: 30,
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
      jest
        .spyOn(userFriendRepository, 'fetchUserAndValidate')
        .mockResolvedValue(user);

      const result = await service.getFriendsOrNonFriends(1, true);

      expect(result).toHaveLength(1);
      expect(userFriendRepository.fetchUserAndValidate).toHaveBeenCalledWith(1);
    });

    it('should return non-friends of the user', async () => {
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
      user.friends = [];
      jest
        .spyOn(userFriendRepository, 'fetchUserAndValidate')
        .mockResolvedValue(user);
      jest
        .spyOn(service, 'getNonFriendUsers')
        .mockResolvedValue([new UserDto('test', 'test@email.cz', 5)]);

      const result = await service.getFriendsOrNonFriends(1, false);

      expect(result).toHaveLength(1);
      expect(userFriendRepository.fetchUserAndValidate).toHaveBeenCalledWith(1);
      expect(service.getNonFriendUsers).toHaveBeenCalledWith(1, {}, 0, 10);
    });

    it('should throw an error if user is not found', async () => {
      jest
        .spyOn(userFriendRepository, 'fetchUserAndValidate')
        .mockRejectedValue(new NotFoundException());

      await expect(service.getFriendsOrNonFriends(1, true)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw an internal server error if there is another error', async () => {
      jest
        .spyOn(userFriendRepository, 'fetchUserAndValidate')
        .mockRejectedValue(new Error());

      await expect(service.getFriendsOrNonFriends(1, true)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('addFriend', () => {
    it('should add a friend', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest
        .spyOn(userFriendRepository, 'addFriend')
        .mockResolvedValue(undefined);

      await expect(
        service['addFriend'](toggleFriendDto),
      ).resolves.toBeUndefined();
      expect(userFriendRepository.addFriend).toHaveBeenCalledWith(
        toggleFriendDto,
      );
    });

    it('should throw an error if adding friend fails', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest
        .spyOn(userFriendRepository, 'addFriend')
        .mockRejectedValue(new Error());

      await expect(service['addFriend'](toggleFriendDto)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('removeFriend', () => {
    it('should remove a friend', async () => {
      jest
        .spyOn(userFriendRepository, 'removeFriend')
        .mockResolvedValue(undefined);

      await expect(service.removeFriend(1, 2)).resolves.toBeUndefined();
      expect(userFriendRepository.removeFriend).toHaveBeenCalledWith(1, 2);
    });

    it('should throw an error if removing friend fails', async () => {
      jest
        .spyOn(userFriendRepository, 'removeFriend')
        .mockRejectedValue(new Error());

      await expect(service.removeFriend(1, 2)).rejects.toThrow(Error);
    });
  });

  describe('checkIfFriends', () => {
    it('should return true if users are friends', async () => {
      jest
        .spyOn(userFriendRepository, 'checkIfFriends')
        .mockResolvedValue(true);

      const result = await service.checkIfFriends(1, 2);

      expect(result).toBe(true);
      expect(userFriendRepository.checkIfFriends).toHaveBeenCalledWith(1, 2);
    });

    it('should throw an error if checking friends fails', async () => {
      jest
        .spyOn(userFriendRepository, 'checkIfFriends')
        .mockRejectedValue(new Error());

      await expect(service.checkIfFriends(1, 2)).rejects.toThrow(Error);
    });
  });

  describe('getUserWithFriend', () => {
    it('should return user and friend', async () => {
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
        name: 'Jane Doe',
        telephone: '0987654321',
        address: '456 Elm St',
        email: 'jane@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url_2',
        backgroundImageUrl: 'background_image_url_2',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      });
      jest.spyOn(userRepository, 'findByIds').mockResolvedValue([user, friend]);

      const result = await service.getUserWithFriend(1, 2);

      expect(result).toEqual({ user, friend });
      expect(userRepository.findByIds).toHaveBeenCalledWith([1, 2]);
    });

    it('should throw a not found exception if users are not found', async () => {
      jest.spyOn(userRepository, 'findByIds').mockResolvedValue([]);

      await expect(service.getUserWithFriend(1, 2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw an internal server error if there is another error', async () => {
      jest.spyOn(userRepository, 'findByIds').mockRejectedValue(new Error());

      await expect(service.getUserWithFriend(1, 2)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getFriendRequests', () => {
    it('should return friend requests', async () => {
      const friendRequests = [new FriendRequest()];
      jest
        .spyOn(userFriendRepository, 'getFriendRequests')
        .mockResolvedValue(friendRequests);

      const result = await service.getFriendRequests(1);

      expect(result).toHaveLength(1);
      expect(userFriendRepository.getFriendRequests).toHaveBeenCalledWith(
        1,
        {},
      );
    });

    it('should throw an error if getting friend requests fails', async () => {
      jest
        .spyOn(userFriendRepository, 'getFriendRequests')
        .mockRejectedValue(new Error());

      await expect(service.getFriendRequests(1)).rejects.toThrow(Error);
    });
  });

  describe('createFriendRequest', () => {
    it('should create a friend request', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest
        .spyOn(userFriendRepository, 'checkIfFriends')
        .mockResolvedValue(false);
      jest
        .spyOn(friendRequestRepository.manager, 'findOne')
        .mockResolvedValue(null);
      jest
        .spyOn(userFriendRepository, 'createFriendRequest')
        .mockResolvedValue({
          user: new User({
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
          friend: new User({
            id: 2,
            name: 'Jane Doe',
            telephone: '0987654321',
            address: '456 Elm St',
            email: 'jane@example.com',
            longitude: 40,
            latitude: 30,
            password: 'password',
            imageUrl: 'image_url_2',
            backgroundImageUrl: 'background_image_url_2',
            events: [],
            exchanges: [],
            friends: [],
            items: [],
            notifications: [],
          }),
        });

      await expect(
        service.createFriendRequest(toggleFriendDto),
      ).resolves.toBeUndefined();
      expect(userFriendRepository.checkIfFriends).toHaveBeenCalledWith(
        toggleFriendDto.userId,
        toggleFriendDto.friendId,
      );
      expect(friendRequestRepository.manager.findOne).toHaveBeenCalled();
      expect(userFriendRepository.createFriendRequest).toHaveBeenCalled();
    });

    it('should throw an error if users are already friends', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest
        .spyOn(userFriendRepository, 'checkIfFriends')
        .mockResolvedValue(true);

      await expect(
        service.createFriendRequest(toggleFriendDto),
      ).rejects.toThrow(Error);
    });

    it('should throw an error if friend request already exists', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest
        .spyOn(userFriendRepository, 'checkIfFriends')
        .mockResolvedValue(false);
      jest
        .spyOn(friendRequestRepository.manager, 'findOne')
        .mockResolvedValue(new FriendRequest());

      await expect(
        service.createFriendRequest(toggleFriendDto),
      ).rejects.toThrow(Error);
    });

    it('should throw an error if creating friend request fails', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest
        .spyOn(userFriendRepository, 'checkIfFriends')
        .mockResolvedValue(false);
      jest
        .spyOn(friendRequestRepository.manager, 'findOne')
        .mockResolvedValue(null);
      jest
        .spyOn(userFriendRepository, 'createFriendRequest')
        .mockRejectedValue(new Error());

      await expect(
        service.createFriendRequest(toggleFriendDto),
      ).rejects.toThrow(Error);
    });
  });

  describe('acceptOrDenyFriendRequest', () => {
    it('should deny a friend request', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      const friendRequest = new FriendRequest();
      jest
        .spyOn(userFriendRepository, 'accepOrDenytFriendRequest')
        .mockResolvedValue({ friendRequest, isAcepted: false });

      await expect(
        service.acceptOrDenyFriendRequest(toggleFriendDto, false),
      ).resolves.toBe(friendRequest);
      expect(
        userFriendRepository.accepOrDenytFriendRequest,
      ).toHaveBeenCalledWith(toggleFriendDto, false);
    });

    it('should throw an error if accepting or denying friend request fails', async () => {
      const toggleFriendDto = new ToggleFriendDto();
      jest
        .spyOn(userFriendRepository, 'accepOrDenytFriendRequest')
        .mockRejectedValue(new Error());

      await expect(
        service.acceptOrDenyFriendRequest(toggleFriendDto, true),
      ).rejects.toThrow(Error);
    });
  });

  describe('getNonFriendUsers', () => {
    it('should return non-friend users', async () => {
      const allUsers = [
        new User({
          id: 3,
          name: 'Alice Smith',
          telephone: '1231231234',
          address: '789 Oak St',
          email: 'alice@example.com',
          longitude: 40,
          latitude: 30,
          password: 'password',
          imageUrl: 'image_url_3',
          backgroundImageUrl: 'background_image_url_3',
          events: [],
          exchanges: [],
          friends: [],
          items: [],
          notifications: [],
        }),
        new User({
          id: 4,
          name: 'Bob Brown',
          telephone: '9876543210',
          address: '321 Pine St',
          email: 'bob@example.com',
          longitude: 40,
          latitude: 30,
          password: 'password',
          imageUrl: 'image_url_4',
          backgroundImageUrl: 'background_image_url_4',
          events: [],
          exchanges: [],
          friends: [],
          items: [],
          notifications: [],
        }),
      ];
      const friendRequests = [new FriendRequest()];
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
            name: 'Jane Doe',
            telephone: '0987654321',
            address: '456 Elm St',
            email: 'jane@example.com',
            longitude: 40,
            latitude: 30,
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
      jest
        .spyOn(userFriendRepository, 'getAllUsers')
        .mockResolvedValue(allUsers);
      jest
        .spyOn(friendRequestRepository, 'find')
        .mockResolvedValue(friendRequests);
      jest
        .spyOn(userFriendRepository, 'fetchUserAndValidate')
        .mockResolvedValue(user);

      const result = await service.getNonFriendUsers(1, {}, 0, 10);

      expect(result).toHaveLength(2);
      expect(userFriendRepository.getAllUsers).toHaveBeenCalledWith(
        1,
        {},
        0,
        10,
      );
      expect(friendRequestRepository.find).toHaveBeenCalled();
      expect(userFriendRepository.fetchUserAndValidate).toHaveBeenCalledWith(1);
    });

    it('should throw an internal server error if getting non-friend users fails', async () => {
      jest
        .spyOn(userFriendRepository, 'getAllUsers')
        .mockRejectedValue(new Error());

      await expect(service.getNonFriendUsers(1, {}, 0, 10)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getFriendDtos', () => {
    it('should return friend DTOs', () => {
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
            name: 'Jane Doe',
            telephone: '0987654321',
            address: '456 Elm St',
            email: 'jane@example.com',
            longitude: 40,
            latitude: 30,
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
      const result = service['getFriendDtos'](user, {}, 0, 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(UserDto);
    });

    it('should return empty array if start index exceeds total friends', () => {
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
            name: 'Jane Doe',
            telephone: '0987654321',
            address: '456 Elm St',
            email: 'jane@example.com',
            longitude: 40,
            latitude: 30,
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
      const result = service['getFriendDtos'](user, {}, 10, 10);

      expect(result).toHaveLength(0);
    });
  });
});
