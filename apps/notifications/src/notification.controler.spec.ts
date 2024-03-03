import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from 'libs/dtos/notificationDtos/create.notification.dto';

const mockNotificationsService = {
  createNotification: jest.fn(),
  getNotification: jest.fn(),
  getNotifications: jest.fn(),
  deleteNotification: jest.fn(),
  changeNotificationSeenState: jest.fn(),
  getNumberOfNotifications: jest.fn(),
};

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);

    Object.values(mockNotificationsService).forEach((mockFn) =>
      mockFn.mockReset(),
    );
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const createNotificationDto = new CreateNotificationDto();
      mockNotificationsService.createNotification.mockResolvedValue(
        'someValue',
      );

      expect(await controller.createNotification(createNotificationDto)).toBe(
        'someValue',
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        createNotificationDto,
      );
    });
  });

  describe('getNotification', () => {
    it('should get a notification by id', async () => {
      const id = 1;
      mockNotificationsService.getNotification.mockResolvedValue(
        'someNotification',
      );

      expect(await controller.getNotification({ id })).toBe('someNotification');
      expect(mockNotificationsService.getNotification).toHaveBeenCalledWith(id);
    });
  });

  describe('getNotifications', () => {
    it('should get notifications for a user with query parameters', async () => {
      const id = 1,
        query = {};
      mockNotificationsService.getNotifications.mockResolvedValue([
        'notification1',
        'notification2',
      ]);

      expect(await controller.getNotifications({ id, query })).toEqual([
        'notification1',
        'notification2',
      ]);
      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(
        id,
        query,
      );
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification by id', async () => {
      const id = 1;
      mockNotificationsService.deleteNotification.mockResolvedValue(
        'deleteResult',
      );

      expect(await controller.deleteNotification({ id })).toBe('deleteResult');
      expect(mockNotificationsService.deleteNotification).toHaveBeenCalledWith(
        id,
      );
    });
  });

  describe('changeNotificationSeenState', () => {
    it('should change the seen state of a notification', async () => {
      const id = 1;
      mockNotificationsService.changeNotificationSeenState.mockResolvedValue(
        'changeStateResult',
      );

      expect(await controller.changeNotificationSeenState({ id })).toBe(
        'changeStateResult',
      );
      expect(
        mockNotificationsService.changeNotificationSeenState,
      ).toHaveBeenCalledWith(id);
    });
  });

  describe('getNumberOfNotifications', () => {
    it('should get the number of notifications for a user', async () => {
      const id = 1;
      mockNotificationsService.getNumberOfNotifications.mockResolvedValue(5);

      expect(await controller.getNumberOfNotifications({ id })).toBe(5);
      expect(
        mockNotificationsService.getNumberOfNotifications,
      ).toHaveBeenCalledWith(id);
    });
  });
});
