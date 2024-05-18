import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserFriendService } from './user.friend.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RpcException } from '@nestjs/microservices';
import { CreateUserDto } from 'libs/dtos/userDtos/create.user.dto';
import { CurrentUserDto } from 'libs/dtos/userDtos/current.user.dto';
import { UpdateCurrentUserDto } from 'libs/dtos/userDtos/update.current.user.dto';
import { User } from '@app/database';
import { ChangePasswordDto } from 'libs/dtos/userDtos/change.password.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;
  let userFriendService: UserFriendService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockUserService = {
    createUser: jest.fn(),
    getCurrentUserProfile: jest.fn(),
    updateCurentUser: jest.fn(),
    getUserById: jest.fn(),
    getUsers: jest.fn(),
    deleteUser: jest.fn(),
    getUserImage: jest.fn(),
    deleteUserImage: jest.fn(),
    getUserForItemUpdate: jest.fn(),
    getUserForProfile: jest.fn(),
    changePasswordDto: jest.fn(),
    getFriendsForItemCreation: jest.fn(),
    getUserByEmail: jest.fn(),
    getUsersFriendsSimple: jest.fn(),
  };

  const mockUserFriendService = {
    removeFriend: jest.fn(),
    checkIfFriends: jest.fn(),
    getUserWithFriend: jest.fn(),
    getFriendRequests: jest.fn(),
    createFriendRequest: jest.fn(),
    getFriendsOrNonFriends: jest.fn(),
    accepOrDenytFriendRequest: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: UserFriendService,
          useValue: mockUserFriendService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
    userFriendService = module.get<UserFriendService>(UserFriendService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  it('should be defined', () => {
    expect(userFriendService).toBeDefined();
  });

  it('should be defined', () => {
    expect(cacheManager).toBeDefined();
  });

  describe('createUser', () => {
    it('should successfully create a user', async () => {
      const createUserDto = new CreateUserDto();
      createUserDto.email = 'test@example.com';
      createUserDto.password = '123456789';
      createUserDto.name = 'test';
      mockUserService.createUser.mockResolvedValue('Expected Result');

      expect(await controller.createUser(createUserDto)).toEqual(
        'Expected Result',
      );
      expect(userService.createUser).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw an error if the user service throws an error', async () => {
      const createUserDto = new CreateUserDto();
      mockUserService.createUser.mockRejectedValue(new Error('Service Error'));

      await expect(controller.createUser(createUserDto)).rejects.toThrow(
        RpcException,
      );
      expect(userService.createUser).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('getUser', () => {
    const id = 1;
    const user: CurrentUserDto = {
      id,
      email: 'test@example.com',
      name: 'Test User',
      address: 'Tets',
      latitude: 6,
      longitude: 6,
      telephone: '54545454',
      backgroundImageUrl: '',
      imageUrl: '',
      exchanges: undefined,
      friends: undefined,
      items: undefined,
    };

    it('should return the user from cache if available', async () => {
      mockCacheManager.get.mockResolvedValue(user);

      expect(await controller.getUser({ id })).toEqual(user);
      expect(mockCacheManager.get).toHaveBeenCalledWith('getUser');
      expect(mockUserService.getCurrentUserProfile).not.toHaveBeenCalled();
    });

    it('should fetch the user from userService if not available in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockUserService.getCurrentUserProfile.mockResolvedValue(user);

      expect(await controller.getUser({ id })).toEqual(user);
      expect(mockCacheManager.get).toHaveBeenCalledWith('getUser');
      expect(mockUserService.getCurrentUserProfile).toHaveBeenCalledWith(id);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'getCurrentUserProfile',
        user,
        18000,
      );
    });

    it('should throw an RpcException if an error occurs', async () => {
      mockCacheManager.get.mockRejectedValue(
        new Error('Error fetching from cache'),
      );

      await expect(controller.getUser({ id })).rejects.toThrow(RpcException);
    });
  });

  describe('updateCurentUser', () => {
    const updateUserDto = new UpdateCurrentUserDto();
    updateUserDto.email = 'test@example.com';
    updateUserDto.name = 'test';
    updateUserDto.address = 'Test';
    updateUserDto.id = 1;
    updateUserDto.latitude = 1;
    updateUserDto.longitude = 1;
    updateUserDto.telephone = '654 54654 ';

    it('should successfully update a user', async () => {
      mockUserService.updateCurentUser.mockResolvedValue('Expected Result');

      expect(await controller.updateCurentUser(updateUserDto)).toEqual(
        'Expected Result',
      );
      expect(userService.updateCurentUser).toHaveBeenCalledWith(updateUserDto);
    });

    it('should throw an error if the user service throws an error', async () => {
      mockUserService.updateCurentUser.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(controller.updateCurentUser(updateUserDto)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getUserById', () => {
    const id = 1;
    const user: User = {
      id,
      email: 'test@example.com',
      name: 'Test User',
      address: 'Test',
      password: 'AFASF',
      latitude: 6,
      longitude: 6,
      telephone: '54545454',
      backgroundImageUrl: '',
      imageUrl: '',
      exchanges: undefined,
      friends: undefined,
      items: undefined,
      notifications: undefined,
      events: [],
    };

    it('should return the user from cache if available', async () => {
      mockCacheManager.get.mockResolvedValue(user);

      expect(await controller.getUserById({ userId: id })).toEqual(user);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`getUserById${id}`);
    });

    it('should fetch the user from userService if not available in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockUserService.getUserById.mockResolvedValue(user);

      expect(await controller.getUserById({ userId: id })).toEqual(user);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`getUserById${id}`);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `getUserById${id}`,
        user,
        18000,
      );
    });

    it('should throw an RpcException if an error occurs', async () => {
      mockCacheManager.get.mockRejectedValue(
        new Error('Error fetching from cache'),
      );

      await expect(controller.getUserById({ userId: id })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getUsers', () => {
    it('should return users from cache if available', async () => {
      const cachedUsers = [{ id: 1, name: 'Test User' }];
      mockCacheManager.get.mockResolvedValue(cachedUsers);

      const result = await controller.getUsers();

      expect(result).toEqual(cachedUsers);
      expect(mockCacheManager.get).toHaveBeenCalledWith('getUsers');
      expect(userService.getUsers).not.toHaveBeenCalled();
    });

    it('should fetch users from userService and cache them if not available in cache', async () => {
      const usersFromService = [{ id: 2, name: 'New User' }];
      mockCacheManager.get.mockResolvedValue(null);
      mockUserService.getUsers.mockResolvedValue(usersFromService);

      const result = await controller.getUsers();

      expect(result).toEqual(usersFromService);
      expect(mockCacheManager.get).toHaveBeenCalledWith('getUsers');
      expect(userService.getUsers).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'getUsers',
        usersFromService,
        18000,
      );
    });

    it('should throw RpcException on error', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      await expect(controller.getUsers()).rejects.toThrow(RpcException);
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete a user', async () => {
      const userId = 1;
      mockUserService.deleteUser.mockResolvedValue({ message: 'User deleted' });

      const result = await controller.deleteUser({ id: userId });

      expect(result).toEqual({ message: 'User deleted' });
      expect(userService.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should throw RpcException if userService throws an error', async () => {
      const userId = 1;
      mockUserService.deleteUser.mockRejectedValue(new Error('Delete error'));

      await expect(controller.deleteUser({ id: userId })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('removeFriend', () => {
    const toggleFriendDto = { userId: 1, friendId: 2 };

    it('should successfully remove a friend and clear relevant cache', async () => {
      mockUserFriendService.removeFriend.mockResolvedValue({
        message: 'Friend removed',
      });

      const result = await controller.removeFriend(toggleFriendDto);

      expect(result).toEqual({ message: 'Friend removed' });
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `getFriends:${toggleFriendDto.userId}`,
      );
      expect(userFriendService.removeFriend).toHaveBeenCalledWith(
        toggleFriendDto.userId,
        toggleFriendDto.friendId,
      );
    });

    it('should throw RpcException if userFriendService throws an error', async () => {
      mockUserFriendService.removeFriend.mockRejectedValue(
        new Error('Remove friend error'),
      );

      await expect(controller.removeFriend(toggleFriendDto)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('checkIfFriends', () => {
    const toggleFriendDto = { userId: 1, friendId: 2 };

    it('should return true if users are friends', async () => {
      mockUserFriendService.checkIfFriends.mockResolvedValue(true);

      const result = await controller.checkIfFriends(toggleFriendDto);

      expect(result).toBe(true);
      expect(mockUserFriendService.checkIfFriends).toHaveBeenCalledWith(1, 2);
    });

    it('should throw RpcException on service error', async () => {
      mockUserFriendService.checkIfFriends.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(controller.checkIfFriends(toggleFriendDto)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('getUserWithFriend', () => {
    const toggleFriendDto = { userId: 1, friendId: 2 };
    const userWithFriend = {
      user: { id: 1, name: 'User 1' },
      friend: { id: 2, name: 'User 2' },
    };

    it('should return user and friend data', async () => {
      mockUserFriendService.getUserWithFriend.mockResolvedValue(userWithFriend);

      const result = await controller.getUserWithFriend(toggleFriendDto);

      expect(result).toEqual(userWithFriend);
      expect(mockUserFriendService.getUserWithFriend).toHaveBeenCalledWith(
        1,
        2,
      );
    });

    it('should throw RpcException on service error', async () => {
      mockUserFriendService.getUserWithFriend.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(
        controller.getUserWithFriend(toggleFriendDto),
      ).rejects.toThrow(Error);
    });
  });

  describe('getUserImage', () => {
    const userId = 1;
    const userImage = 'http://example.com/image.jpg';

    it('should return user image from cache if available', async () => {
      mockCacheManager.get.mockResolvedValue(userImage);

      const result = await controller.getUserImage({ id: userId });

      expect(result).toEqual(userImage);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`userImage:${userId}`);
      expect(mockUserService.getUserImage).not.toHaveBeenCalled();
    });

    it('should fetch user image from userService and cache it if not available in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockUserService.getUserImage.mockResolvedValue(userImage);

      const result = await controller.getUserImage({ id: userId });

      expect(result).toEqual(userImage);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `userImage:${userId}`,
        userImage,
        18000,
      );
    });

    it('should throw RpcException on error', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache Error'));

      await expect(controller.getUserImage({ id: userId })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('deleteUserImage', () => {
    it('should successfully delete a user image', async () => {
      const userId = 1;
      mockUserService.deleteUserImage.mockResolvedValue({
        message: 'Image deleted',
      });

      const result = await controller.deleteUserImage({ id: userId });

      expect(result).toEqual({ message: 'Image deleted' });
      expect(mockUserService.deleteUserImage).toHaveBeenCalledWith(userId);
    });

    it('should throw RpcException if userService throws an error', async () => {
      const userId = 1;
      mockUserService.deleteUserImage.mockRejectedValue(
        new Error('Delete image error'),
      );

      await expect(controller.deleteUserImage({ id: userId })).rejects.toThrow(
        Error,
      );
    });
  });

  describe('getUserForItemUpdate', () => {
    it('should successfully retrieve a user for item update', async () => {
      const friendId = 2;
      const expectedUser = { id: friendId, name: 'Friend Name' };
      mockUserService.getUserForItemUpdate.mockResolvedValue(expectedUser);

      const result = await controller.getUserForItemUpdate({ friendId });

      expect(result).toEqual(expectedUser);
      expect(mockUserService.getUserForItemUpdate).toHaveBeenCalledWith(
        friendId,
      );
    });

    it('should throw RpcException if userService throws an error', async () => {
      const friendId = 2;
      mockUserService.getUserForItemUpdate.mockRejectedValue(
        new Error('User retrieval error'),
      );

      await expect(
        controller.getUserForItemUpdate({ friendId }),
      ).rejects.toThrow(Error);
    });
  });

  describe('getUserByEmail', () => {
    it('should successfully retrieve a user by email', async () => {
      const userEmail = 'test@example.com';
      const expectedUser = { id: 1, email: userEmail, name: 'Test User' };
      mockUserService.getUserByEmail.mockResolvedValue(expectedUser);

      const result = await controller.getUserByEmail({ userEmail });

      expect(result).toEqual(expectedUser);
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(userEmail);
    });

    it('should throw RpcException if userService throws an error', async () => {
      const userEmail = 'test@example.com';
      mockUserService.getUserByEmail.mockRejectedValue(
        new Error('User email retrieval error'),
      );

      await expect(controller.getUserByEmail({ userEmail })).rejects.toThrow(
        Error,
      );
    });
  });

  describe('getFriends', () => {
    const userId = 1;
    const query = null;
    const userFriends = [{ id: 2, name: 'Friend' }];
    const cacheKey = `getFriends:${userId}`;

    it('should return friends from cache if available and query is null', async () => {
      mockCacheManager.get.mockResolvedValue(userFriends);

      const result = await controller.getFriends({ id: userId, query });

      expect(result).toEqual(userFriends);
      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(
        mockUserFriendService.getFriendsOrNonFriends,
      ).not.toHaveBeenCalled();
    });

    it('should fetch friends from userService and cache them if not available in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockUserFriendService.getFriendsOrNonFriends.mockResolvedValue(
        userFriends,
      );

      const result = await controller.getFriends({ id: userId, query });

      expect(result).toEqual(userFriends);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        cacheKey,
        userFriends,
        18000,
      );
      expect(mockUserFriendService.getFriendsOrNonFriends).toHaveBeenCalledWith(
        userId,
        true,
        query,
      );
    });

    it('should throw RpcException on error', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      await expect(
        controller.getFriends({ id: userId, query }),
      ).rejects.toThrow(Error);
    });
  });

  describe('getFriendRequests', () => {
    const userId = 1;
    const query = null;
    const friendRequests = [{ id: 2, name: 'Friend Request' }];
    const cacheKey = `getFriendRequests:${userId}`;

    it('should return friend requests from cache if available and query is null', async () => {
      mockCacheManager.get.mockResolvedValue(friendRequests);

      const result = await controller.getFriendRequests({ id: userId, query });

      expect(result).toEqual(friendRequests);
      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(mockUserFriendService.getFriendRequests).not.toHaveBeenCalled();
    });

    it('should fetch friend requests from userFriendService and cache them if not available in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockUserFriendService.getFriendRequests.mockResolvedValue(friendRequests);

      const result = await controller.getFriendRequests({ id: userId, query });

      expect(result).toEqual(friendRequests);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        cacheKey,
        friendRequests,
        18000,
      );
      expect(mockUserFriendService.getFriendRequests).toHaveBeenCalledWith(
        userId,
        query,
      );
    });

    it('should throw RpcException on error', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      await expect(
        controller.getFriendRequests({ id: userId, query }),
      ).rejects.toThrow(Error);
    });
  });

  describe('createFriendRequest', () => {
    const toggleFriendDto = { userId: 1, friendId: 2 };
    const cacheKey = `getNewFriends:${toggleFriendDto.friendId}`;

    it('should successfully create a friend request and clear relevant cache', async () => {
      mockUserFriendService.createFriendRequest.mockResolvedValue({
        message: 'Friend request sent',
      });

      const result = await controller.createFriendRequest(toggleFriendDto);

      expect(result).toEqual({ message: 'Friend request sent' });
      expect(mockCacheManager.del).toHaveBeenCalledWith(cacheKey);
      expect(mockUserFriendService.createFriendRequest).toHaveBeenCalledWith(
        toggleFriendDto,
      );
    });

    it('should throw RpcException if userFriendService throws an error', async () => {
      mockUserFriendService.createFriendRequest.mockRejectedValue(
        new Error('Create friend request error'),
      );

      await expect(
        controller.createFriendRequest(toggleFriendDto),
      ).rejects.toThrow(Error);
    });
  });

  describe('acceptFriendRequest', () => {
    const toggleFriendDto = { userId: 1, friendId: 2 };

    it('should successfully accept a friend request', async () => {
      mockUserFriendService.accepOrDenytFriendRequest.mockResolvedValue({
        message: 'Friend request accepted',
      });

      const result = await controller.acceptFriendRequest(toggleFriendDto);

      expect(result).toEqual({ message: 'Friend request accepted' });
      expect(
        mockUserFriendService.accepOrDenytFriendRequest,
      ).toHaveBeenCalledWith(toggleFriendDto, true);
    });

    it('should throw RpcException if userFriendService throws an error', async () => {
      mockUserFriendService.accepOrDenytFriendRequest.mockRejectedValue(
        new RpcException('Accept friend request error'),
      );

      await expect(
        controller.acceptFriendRequest(toggleFriendDto),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('denyFriendRequest', () => {
    const toggleFriendDto = { userId: 1, friendId: 2 };

    it('should successfully deny a friend request', async () => {
      mockUserFriendService.accepOrDenytFriendRequest.mockResolvedValue({
        message: 'Friend request denied',
      });

      const result = await controller.denyFriendRequest(toggleFriendDto);

      expect(result).toEqual({ message: 'Friend request denied' });
      expect(
        mockUserFriendService.accepOrDenytFriendRequest,
      ).toHaveBeenCalledWith(toggleFriendDto, false);
    });

    it('should throw RpcException if userFriendService throws an error', async () => {
      const toggleFriendDto = { userId: 1, friendId: 2 };
      mockUserFriendService.accepOrDenytFriendRequest.mockRejectedValue(
        new Error(),
      );

      await expect(
        controller.acceptFriendRequest(toggleFriendDto),
      ).rejects.toThrow(Error);
    });
  });
  describe('getUserForProfile', () => {
    it('should successfully retrieve user for profile', async () => {
      const toggleFriendDto = { userId: 1, friendId: 2 };
      const expectedResponse = { id: 1, name: 'Test User' };
      mockUserService.getUserForProfile.mockResolvedValue(expectedResponse);

      const result = await controller.getUserForProfile(toggleFriendDto);

      expect(result).toEqual(expectedResponse);
      expect(mockUserService.getUserForProfile).toHaveBeenCalledWith(
        toggleFriendDto,
      );
    });

    it('should throw Error on service error', async () => {
      const toggleFriendDto = { userId: 1, friendId: 2 };
      mockUserService.getUserForProfile.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(
        controller.getUserForProfile(toggleFriendDto),
      ).rejects.toThrow(Error);
    });
  });

  describe('changePassword', () => {
    it("should successfully change the user's password", async () => {
      const changePasswordDto: ChangePasswordDto = {
        newPassword: 'newPass',
        email: 'test@example.com',
        password: 'newPassword',
      };
      const expectedResponse = { message: 'Password changed successfully' };
      mockUserService.changePasswordDto.mockResolvedValue(expectedResponse);

      const result = await controller.changePassword(changePasswordDto);

      expect(result).toEqual(expectedResponse);
      expect(mockUserService.changePasswordDto).toHaveBeenCalledWith(
        changePasswordDto,
      );
    });

    it('should throw RpcException on service error', async () => {
      const changePasswordDto = {
        newPassword: 'newPass',
        email: 'test@example.com',
        password: 'newPassword',
      };
      mockUserService.changePasswordDto.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(
        controller.changePassword(changePasswordDto),
      ).rejects.toThrow(Error);
    });
  });

  describe('getFriendsForItemCreation', () => {
    it('should successfully retrieve friends for item creation', async () => {
      const id = 1;
      const expectedResponse = [{ id: 2, name: 'Friend User' }];
      mockUserService.getFriendsForItemCreation.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.getFriendsForItemCreation({ id });

      expect(result).toEqual(expectedResponse);
      expect(mockUserService.getFriendsForItemCreation).toHaveBeenCalledWith(
        id,
      );
    });

    it('should throw RpcException on service error', async () => {
      const id = 1;
      mockUserService.getFriendsForItemCreation.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(
        controller.getFriendsForItemCreation({ id }),
      ).rejects.toThrow(Error);
    });
  });

  describe('getUsersFriendsSimple', () => {
    it('should return a list of user friends when given a valid user id', async () => {
      const userId = 1;
      const mockFriends = [
        { id: 2, name: 'Alice' },
        { id: 3, name: 'Bob' },
      ];
      mockUserService.getUsersFriendsSimple.mockResolvedValue(mockFriends);

      const result = await controller.getUsersFriendsSimple({ id: userId });

      expect(mockUserService.getUsersFriendsSimple).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toEqual(mockFriends);
    });

    it('should throw an RpcException when the userService throws an error', async () => {
      const userId = 1;
      const errorMessage = 'Service failed';
      mockUserService.getUsersFriendsSimple.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.getUsersFriendsSimple({ id: userId }),
      ).rejects.toThrow(Error);
    });
  });
});
