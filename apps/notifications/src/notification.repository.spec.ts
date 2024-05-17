import { Test, TestingModule } from '@nestjs/testing';
import { NotificationRepository } from './notification.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../../libs/database/src/entities/notification.entity';

describe('NotificationRepository', () => {
  let notificationRepository: NotificationRepository;
  let repository: Repository<Notification>;

  const mockNotification = new Notification({});
  mockNotification.id = 1;
  mockNotification.text = 'Test notification';
  mockNotification.initials = 'TN';
  mockNotification.seen = false;
  mockNotification.createdAt = new Date();

  const notificationsArray = [mockNotification, { ...mockNotification, id: 2 }];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRepository,
        {
          provide: getRepositoryToken(Notification),
          useClass: Repository,
        },
      ],
    }).compile();

    notificationRepository = module.get<NotificationRepository>(
      NotificationRepository,
    );
    repository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
  });

  describe('findAllSeenNotifications', () => {
    it('should return all seen notifications', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue(notificationsArray);

      const result = await notificationRepository.findAllSeenNotifications();
      expect(result).toEqual(notificationsArray);
      expect(repository.find).toHaveBeenCalledWith({ where: { seen: true } });
    });
  });

  describe('createNotification', () => {
    it('should create and return a notification', async () => {
      jest.spyOn(repository, 'save').mockResolvedValue(mockNotification);

      const result =
        await notificationRepository.createNotification(mockNotification);
      expect(result).toEqual(mockNotification);
      expect(repository.save).toHaveBeenCalledWith(mockNotification);
    });
  });

  describe('findUserNotifications', () => {
    it('should return user notifications with pagination', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue(notificationsArray);

      const result = await notificationRepository.findUserNotifications(
        1,
        0,
        10,
      );
      expect(result).toEqual(notificationsArray);
      expect(repository.find).toHaveBeenCalledWith({
        where: { user: { id: 1 } },
        relations: ['user'],
        skip: 0,
        take: 10,
      });
    });
  });

  describe('findOneNotification', () => {
    it('should return a notification by ID', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockNotification);

      const result = await notificationRepository.findOneNotification(1);
      expect(result).toEqual(mockNotification);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return undefined if notification not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(undefined);

      const result = await notificationRepository.findOneNotification(1);
      expect(result).toBeUndefined();
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification by ID', async () => {
      jest
        .spyOn(repository, 'delete')
        .mockResolvedValue({ affected: 1 } as any);

      await notificationRepository.deleteNotification(1);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('countUnseenNotifications', () => {
    it('should return the count of unseen notifications for a user', async () => {
      jest.spyOn(repository, 'count').mockResolvedValue(2);

      const result = await notificationRepository.countUnseenNotifications(1);
      expect(result).toBe(2);
      expect(repository.count).toHaveBeenCalledWith({
        where: { user: { id: 1 }, seen: false },
      });
    });
  });

  describe('saveNotification', () => {
    it('should save and return the updated notification', async () => {
      jest.spyOn(repository, 'save').mockResolvedValue(mockNotification);

      const result =
        await notificationRepository.saveNotification(mockNotification);
      expect(result).toEqual(mockNotification);
      expect(repository.save).toHaveBeenCalledWith(mockNotification);
    });
  });
});
