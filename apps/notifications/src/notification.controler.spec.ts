import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from 'libs/dtos/notificationDtos/create.notification.dto';
import { NotificationDto } from 'libs/dtos/notificationDtos/notification.dto';
import { RpcException } from '@nestjs/microservices';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn(),
            getNotification: jest.fn(),
            getNotifications: jest.fn(),
            deleteNotification: jest.fn(),
            changeNotificationSeenState: jest.fn(),
            getNumberOfNotifications: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createNotification', () => {
    it('should call service.createNotification and return result', async () => {
      const createNotificationDto: CreateNotificationDto = {
        userId: 1,
        nameOfTheService: 'Test Service',
        text: 'New notification',
        initials: 'NN',
      };
      const result: NotificationDto = {
        id: 1,
        initials: 'NN',
        userId: 1,
        text: 'New notification',
        createdAt: new Date(),
        seen: false,
      };

      jest.spyOn(service, 'createNotification').mockResolvedValue();

      expect(await controller.createNotification(createNotificationDto)).toBe(
        result,
      );
      expect(service.createNotification).toHaveBeenCalledWith(
        createNotificationDto,
      );
    });

    it('should throw RpcException on error', async () => {
      const createNotificationDto: CreateNotificationDto = {
        userId: 1,
        nameOfTheService: 'Test Service',
        text: 'New notification',
        initials: 'NN',
      };

      jest
        .spyOn(service, 'createNotification')
        .mockRejectedValue(new Error('Test error'));

      await expect(
        controller.createNotification(createNotificationDto),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('getNotification', () => {
    it('should call service.getNotification and return result', async () => {
      const result: NotificationDto = {
        id: 1,
        initials: 'TN',
        userId: 1,
        text: 'Test notification',
        createdAt: new Date(),
        seen: false,
      };

      jest.spyOn(service, 'getNotification').mockResolvedValue(result);

      expect(await controller.getNotification({ id: 1 })).toBe(result);
      expect(service.getNotification).toHaveBeenCalledWith(1);
    });

    it('should throw RpcException on error', async () => {
      jest
        .spyOn(service, 'getNotification')
        .mockRejectedValue(new Error('Test error'));

      await expect(controller.getNotification({ id: 1 })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getNotifications', () => {
    it('should call service.getNotifications and return result', async () => {
      const result: NotificationDto[] = [
        {
          id: 1,
          initials: 'TN',
          userId: 1,
          text: 'Test notification',
          createdAt: new Date(),
          seen: false,
        },
      ];

      jest.spyOn(service, 'getNotifications').mockResolvedValue(result);

      expect(await controller.getNotifications({ id: 1, query: {} })).toBe(
        result,
      );
      expect(service.getNotifications).toHaveBeenCalledWith(1, {});
    });

    it('should throw RpcException on error', async () => {
      jest
        .spyOn(service, 'getNotifications')
        .mockRejectedValue(new Error('Test error'));

      await expect(
        controller.getNotifications({ id: 1, query: {} }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('deleteNotification', () => {
    it('should call service.deleteNotification and return void', async () => {
      const result = { affected: 1 };

      jest.spyOn(service, 'deleteNotification').mockResolvedValue();

      await expect(
        controller.deleteNotification({ id: 1 }),
      ).resolves.toBeUndefined();
      expect(service.deleteNotification).toHaveBeenCalledWith(1);
    });

    it('should throw RpcException on error', async () => {
      jest
        .spyOn(service, 'deleteNotification')
        .mockRejectedValue(new Error('Test error'));

      await expect(controller.deleteNotification({ id: 1 })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('changeNotificationSeenState', () => {
    it('should call service.changeNotificationSeenState and return void', async () => {
      jest
        .spyOn(service, 'changeNotificationSeenState')
        .mockResolvedValue(undefined);

      await expect(
        controller.changeNotificationSeenState({ id: 1 }),
      ).resolves.toBeUndefined();
      expect(service.changeNotificationSeenState).toHaveBeenCalledWith(1);
    });

    it('should throw RpcException on error', async () => {
      jest
        .spyOn(service, 'changeNotificationSeenState')
        .mockRejectedValue(new Error('Test error'));

      await expect(
        controller.changeNotificationSeenState({ id: 1 }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('getNumberOfNotifications', () => {
    it('should call service.getNumberOfNotifications and return result', async () => {
      const result = 5;

      jest.spyOn(service, 'getNumberOfNotifications').mockResolvedValue(result);

      expect(await controller.getNumberOfNotifications({ id: 1 })).toBe(result);
      expect(service.getNumberOfNotifications).toHaveBeenCalledWith(1);
    });

    it('should throw RpcException on error', async () => {
      jest
        .spyOn(service, 'getNumberOfNotifications')
        .mockRejectedValue(new Error('Test error'));

      await expect(
        controller.getNumberOfNotifications({ id: 1 }),
      ).rejects.toThrow(RpcException);
    });
  });
});
