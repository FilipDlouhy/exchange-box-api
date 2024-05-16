import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from '../../../libs/database/src/entities/notification.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { CreateNotificationDto } from 'libs/dtos/notificationDtos/create.notification.dto';
import { User } from '../../../libs/database/src/entities/user.entity';
import { of } from 'rxjs';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: Repository<Notification>;
  let userClient: ClientProxy;
  let client: ClientProxy;
  let schedulerRegistry: SchedulerRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useClass: Repository,
        },
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
        SchedulerRegistry,
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    userClient = module.get<ClientProxy>('USER_CLIENT');
    client = module.get<ClientProxy>('CLIENT_PROXY');
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a new notification', async () => {
      const createNotificationDto: CreateNotificationDto = {
        userId: 1,
        text: 'New notification',
        initials: 'NN',
      };
      const user: User = {
        id: 1,
        username: 'test',
        email: 'test@test.com',
      } as User;

      jest.spyOn(userClient, 'send').mockReturnValue(of(user));
      jest
        .spyOn(notificationRepository, 'save')
        .mockResolvedValue({ id: 1 } as Notification);
      jest.spyOn(notificationRepository, 'count').mockResolvedValue(1);
      jest.spyOn(client, 'emit').mockImplementation();

      await service.createNotification(createNotificationDto);

      expect(userClient.send).toHaveBeenCalledWith(
        { cmd: 'getUserById' },
        { userId: createNotificationDto.userId },
      );
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('newNotification', {
        notificationCount: 1,
      });
    });

    it('should throw BadRequestException if an error occurs', async () => {
      const createNotificationDto: CreateNotificationDto = {
        userId: 1,
        text: 'New notification',
        initials: 'NN',
      };

      jest.spyOn(userClient, 'send').mockReturnValue(of(null));
      jest
        .spyOn(notificationRepository, 'save')
        .mockRejectedValue(new Error('Test error'));

      await expect(
        service.createNotification(createNotificationDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getNotifications', () => {
    it('should return an array of NotificationDto', async () => {
      const notifications = [
        {
          id: 1,
          createdAt: new Date(),
          user: { id: 1 },
          text: 'Test notification',
          initials: 'TN',
          seen: false,
        },
      ] as Notification[];

      jest
        .spyOn(notificationRepository, 'find')
        .mockResolvedValue(notifications);

      const result = await service.getNotifications(1, { page: 0, limit: 10 });

      expect(result).toEqual([
        {
          id: 1,
          createdAt: notifications[0].createdAt,
          userId: 1,
          text: 'Test notification',
          initials: 'TN',
          seen: false,
        },
      ]);
    });

    it('should throw an error if an error occurs during retrieval', async () => {
      jest
        .spyOn(notificationRepository, 'find')
        .mockRejectedValue(new Error('Test error'));

      await expect(
        service.getNotifications(1, { page: 0, limit: 10 }),
      ).rejects.toThrow(Error);
    });
  });

  describe('getNotification', () => {
    it('should return a NotificationDto', async () => {
      const notification = {
        id: 1,
        createdAt: new Date(),
        user: { id: 1 },
        text: 'Test notification',
        initials: 'TN',
        seen: false,
      } as Notification;

      jest
        .spyOn(notificationRepository, 'findOne')
        .mockResolvedValue(notification);

      const result = await service.getNotification(1);

      expect(result).toEqual({
        id: 1,
        createdAt: notification.createdAt,
        userId: 1,
        text: 'Test notification',
        initials: 'TN',
        seen: false,
      });
    });

    it('should throw an error if the notification is not found', async () => {
      jest.spyOn(notificationRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getNotification(1)).rejects.toThrow(Error);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      jest
        .spyOn(notificationRepository, 'delete')
        .mockResolvedValue({ affected: 1 } as any);

      await service.deleteNotification(1);

      expect(notificationRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if notification is not found', async () => {
      jest
        .spyOn(notificationRepository, 'delete')
        .mockResolvedValue({ affected: 0 } as any);

      await expect(service.deleteNotification(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException if an error occurs during deletion', async () => {
      jest
        .spyOn(notificationRepository, 'delete')
        .mockRejectedValue(new Error('Test error'));

      await expect(service.deleteNotification(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('changeNotificationSeenState', () => {
    it('should mark a notification as seen and schedule its deletion', async () => {
      const notification = {
        id: 1,
        seen: false,
      } as Notification;

      jest
        .spyOn(notificationRepository, 'findOne')
        .mockResolvedValue(notification);
      jest
        .spyOn(notificationRepository, 'save')
        .mockResolvedValue(notification);
      jest.spyOn(service, 'scheduleNotificationDeletion').mockImplementation();

      await service.changeNotificationSeenState(1);

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(service.scheduleNotificationDeletion).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if notification is not found', async () => {
      jest.spyOn(notificationRepository, 'findOne').mockResolvedValue(null);

      await expect(service.changeNotificationSeenState(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException if an error occurs during update', async () => {
      jest
        .spyOn(notificationRepository, 'findOne')
        .mockRejectedValue(new Error('Test error'));

      await expect(service.changeNotificationSeenState(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getNumberOfNotifications', () => {
    it('should return the number of unseen notifications for a user', async () => {
      jest.spyOn(notificationRepository, 'count').mockResolvedValue(5);

      const result = await service.getNumberOfNotifications(1);

      expect(result).toBe(5);
    });

    it('should throw an error if an error occurs during retrieval', async () => {
      jest
        .spyOn(notificationRepository, 'count')
        .mockRejectedValue(new Error('Test error'));

      await expect(service.getNumberOfNotifications(1)).rejects.toThrow(Error);
    });
  });
});
