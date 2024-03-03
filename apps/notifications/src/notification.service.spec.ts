import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from '../../../libs/database/src/entities/notification.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { userManagementCommands } from '../../../libs/tcp/src/userMessagePatterns/user.management.message.patterns';
import { CreateNotificationDto } from 'libs/dtos/notificationDtos/create.notification.dto';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const mockNotificationRepository = (): MockRepository<Notification> => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockImplementation((condition) => {
    if (condition.where && condition.where.id) {
      return Promise.resolve({ id: condition.where.id, seen: false });
    }
    return Promise.resolve(null);
  }),
  save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  count: jest.fn().mockResolvedValue(5),
});

const mockClientProxy = (): Partial<ClientProxy> => ({
  emit: jest.fn().mockResolvedValue({}),
  send: jest.fn().mockResolvedValue({ id: 1, name: 'Test User' }),
});
const mockSchedulerRegistry = (): Partial<SchedulerRegistry> => ({
  addTimeout: jest.fn(),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: MockRepository<Notification>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useFactory: mockNotificationRepository,
        },
        {
          provide: 'USER_CLIENT',
          useFactory: mockClientProxy,
        },
        {
          provide: SchedulerRegistry,
          useFactory: mockSchedulerRegistry,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get(getRepositoryToken(Notification));
  });

  describe('getNotifications', () => {
    it('should retrieve notifications for a user', async () => {
      const userId = 1;
      notificationRepository.find.mockResolvedValue([]);

      const result = await service.getNotifications(userId);

      expect(notificationRepository.find).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getNotification', () => {
    it('should throw an error if unable to fetch notification', async () => {
      notificationRepository.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getNotification(1)).rejects.toThrow(
        'Failed to fetch notification',
      );
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification by ID', async () => {
      const notificationId = 1;
      notificationRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteNotification(notificationId);

      expect(notificationRepository.delete).toHaveBeenCalledWith(
        notificationId,
      );
    });
  });

  describe('changeNotificationSeenState', () => {
    it('should mark a notification as seen', async () => {
      const notificationId = 1;
      notificationRepository.findOne.mockResolvedValue({
        id: notificationId,
        seen: false,
      });

      await service.changeNotificationSeenState(notificationId);

      expect(notificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('getNumberOfNotifications', () => {
    it('should get the number of unseen notifications for a user', async () => {
      const userId = 1;
      notificationRepository.count.mockResolvedValue(5);

      const count = await service.getNumberOfNotifications(userId);

      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { user: { id: userId }, seen: false },
      });
      expect(count).toEqual(5);
    });
  });
});
