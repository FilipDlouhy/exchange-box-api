import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from './notification.repository';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { CreateNotificationDto } from 'libs/dtos/notificationDtos/create.notification.dto';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from '../../../libs/database/src/entities/user.entity';
import { Notification } from '../../../libs/database/src/entities/notification.entity';
import { of, throwError } from 'rxjs';
import { NotificationDto } from 'libs/dtos/notificationDtos/notification.dto';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: NotificationRepository;
  let schedulerRegistry: SchedulerRegistry;
  let userClient: ClientProxy;
  let client: ClientProxy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        NotificationRepository,
        SchedulerRegistry,
        {
          provide: 'USER_CLIENT',
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: 'CLIENT_PROXY',
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get<NotificationRepository>(
      NotificationRepository,
    );
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry);
    userClient = module.get<ClientProxy>('USER_CLIENT');
    client = module.get<ClientProxy>('CLIENT_PROXY');
  });

  describe('onModuleInit', () => {
    it('should schedule deletion for all seen notifications', async () => {
      const notifications = [new Notification({}), new Notification({})];
      jest
        .spyOn(notificationRepository, 'findAllSeenNotifications')
        .mockResolvedValue(notifications);
      jest
        .spyOn(service as any, 'scheduleNotificationDeletion')
        .mockImplementation();

      await service.onModuleInit();

      expect(
        notificationRepository.findAllSeenNotifications,
      ).toHaveBeenCalled();
      notifications.forEach((notification) => {
        expect(
          (service as any).scheduleNotificationDeletion,
        ).toHaveBeenCalledWith(notification.id);
      });
    });
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const createNotificationDto: CreateNotificationDto = {
        userId: 1,
        text: 'Test notification',
        nameOfTheService: 'test',
        initials: 'TN',
      };
      const user: User = { id: 1 } as User;
      jest.spyOn(userClient, 'send').mockReturnValue(of(user));
      jest
        .spyOn(notificationRepository, 'createNotification')
        .mockResolvedValue(new Notification({}));
      jest
        .spyOn(notificationRepository, 'countUnseenNotifications')
        .mockResolvedValue(1);
      jest.spyOn(client, 'emit').mockImplementation();

      await service.createNotification(createNotificationDto);

      expect(userClient.send).toHaveBeenCalledWith(
        { cmd: 'getUserById' },
        { userId: 1 },
      );
      expect(notificationRepository.createNotification).toHaveBeenCalled();
      expect(
        notificationRepository.countUnseenNotifications,
      ).toHaveBeenCalledWith(1);
      expect(client.emit).toHaveBeenCalledWith('newNotification', {
        notificationCount: 1,
      });
    });

    it('should throw BadRequestException if creation fails', async () => {
      const createNotificationDto: CreateNotificationDto = {
        userId: 1,
        text: 'Test notification',
        initials: 'TN',
        nameOfTheService: 'test',
      };
      jest
        .spyOn(userClient, 'send')
        .mockReturnValue(throwError(new Error('User not found')));

      await expect(
        service.createNotification(createNotificationDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getNotifications', () => {
    it('should return an array of notifications', async () => {
      const notifications = [new Notification({}), new Notification({})];
      jest
        .spyOn(notificationRepository, 'findUserNotifications')
        .mockResolvedValue(notifications);

      const result = await service.getNotifications(1, { page: 0, limit: 10 });

      expect(notificationRepository.findUserNotifications).toHaveBeenCalledWith(
        1,
        0,
        10,
      );
      expect(result).toEqual(
        notifications.map(
          (notification) =>
            new NotificationDto(
              notification.id,
              notification.createdAt,
              notification.user.id,
              notification.text,
              notification.initials,
              notification.seen,
            ),
        ),
      );
    });

    it('should throw an error if retrieval fails', async () => {
      jest
        .spyOn(notificationRepository, 'findUserNotifications')
        .mockRejectedValue(new Error('Failed to fetch notification'));

      await expect(service.getNotifications(1)).rejects.toThrow(
        'Failed to fetch notification',
      );
    });
  });

  describe('getNotification', () => {
    it('should return a notification', async () => {
      const notification = new Notification({});
      jest
        .spyOn(notificationRepository, 'findOneNotification')
        .mockResolvedValue(notification);

      const result = await service.getNotification(1);

      expect(notificationRepository.findOneNotification).toHaveBeenCalledWith(
        1,
      );
      expect(result).toEqual(
        new NotificationDto(
          notification.id,
          notification.createdAt,
          notification.user.id,
          notification.text,
          notification.initials,
          notification.seen,
        ),
      );
    });

    it('should throw an error if notification is not found', async () => {
      jest
        .spyOn(notificationRepository, 'findOneNotification')
        .mockResolvedValue(undefined);

      await expect(service.getNotification(1)).rejects.toThrow(
        'Notification not found',
      );
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification successfully', async () => {
      jest
        .spyOn(notificationRepository, 'findOneNotification')
        .mockResolvedValue(new Notification({}));
      jest
        .spyOn(notificationRepository, 'deleteNotification')
        .mockResolvedValue();

      await service.deleteNotification(1);

      expect(notificationRepository.findOneNotification).toHaveBeenCalledWith(
        1,
      );
      expect(notificationRepository.deleteNotification).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if notification is not found', async () => {
      jest
        .spyOn(notificationRepository, 'findOneNotification')
        .mockResolvedValue(undefined);

      await expect(service.deleteNotification(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException if deletion fails', async () => {
      jest
        .spyOn(notificationRepository, 'findOneNotification')
        .mockResolvedValue(new Notification({}));
      jest
        .spyOn(notificationRepository, 'deleteNotification')
        .mockRejectedValue(new Error('Delete error'));

      await expect(service.deleteNotification(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('changeNotificationSeenState', () => {
    it('should mark a notification as seen and schedule deletion', async () => {
      const notification = new Notification({});
      jest
        .spyOn(notificationRepository, 'findOneNotification')
        .mockResolvedValue(notification);
      jest
        .spyOn(notificationRepository, 'saveNotification')
        .mockResolvedValue(notification);
      jest
        .spyOn(service as any, 'scheduleNotificationDeletion')
        .mockImplementation();

      await service.changeNotificationSeenState(1);

      expect(notificationRepository.findOneNotification).toHaveBeenCalledWith(
        1,
      );
      expect(notificationRepository.saveNotification).toHaveBeenCalledWith(
        notification,
      );
      expect(
        (service as any).scheduleNotificationDeletion,
      ).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if notification is not found', async () => {
      jest
        .spyOn(notificationRepository, 'findOneNotification')
        .mockResolvedValue(undefined);

      await expect(service.changeNotificationSeenState(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException if update fails', async () => {
      jest
        .spyOn(notificationRepository, 'findOneNotification')
        .mockResolvedValue(new Notification({}));
      jest
        .spyOn(notificationRepository, 'saveNotification')
        .mockRejectedValue(new Error('Save error'));

      await expect(service.changeNotificationSeenState(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getNumberOfNotifications', () => {
    it('should return the count of unseen notifications', async () => {
      jest
        .spyOn(notificationRepository, 'countUnseenNotifications')
        .mockResolvedValue(5);

      const result = await service.getNumberOfNotifications(1);

      expect(
        notificationRepository.countUnseenNotifications,
      ).toHaveBeenCalledWith(1);
      expect(result).toBe(5);
    });

    it('should throw an error if count retrieval fails', async () => {
      jest
        .spyOn(notificationRepository, 'countUnseenNotifications')
        .mockRejectedValue(new Error('Count error'));

      await expect(service.getNumberOfNotifications(1)).rejects.toThrow();
    });
  });
});
