import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Notification } from '../../../libs/database/src/entities/notification.entity';
import { User } from '../../../libs/database/src/entities/user.entity';
import { userManagementCommands } from '../../../libs/tcp/src/userMessagePatterns/user.management.message.patterns';
import { notificationEventsPatterns } from '../../../libs/tcp/src/notificationMessagePatterns/notification.events.message.patterns';
import { CreateNotificationDto } from 'libs/dtos/notificationDtos/create.notification.dto';
import { NotificationDto } from 'libs/dtos/notificationDtos/notification.dto';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly userClient;
  private client: ClientProxy;

  constructor(
    private readonly notificationRepository: NotificationRepository, // Inject the repository
    private schedulerRegistry: SchedulerRegistry,
  ) {
    this.userClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3006,
      },
    });

    const microserviceOptions: MicroserviceOptions = {
      transport: Transport.REDIS,
      options: {
        host: 'localhost',
        port: 6379,
      },
    };

    this.client = ClientProxyFactory.create(microserviceOptions);
  }

  async onModuleInit() {
    const notifications =
      await this.notificationRepository.findAllSeenNotifications();
    notifications.forEach((notification) =>
      this.scheduleNotificationDeletion(notification.id),
    );
  }

  async createNotification(createNotificationDto: CreateNotificationDto) {
    try {
      const user: User = await this.userClient
        .send(
          { cmd: userManagementCommands.getUserById.cmd },
          {
            userId: createNotificationDto.userId,
          },
        )
        .toPromise();

      const notification = new Notification(createNotificationDto);
      notification.user = user;

      await this.notificationRepository.createNotification(notification);

      const notificationCount =
        await this.notificationRepository.countUnseenNotifications(user.id);

      this.client.emit<any>(notificationEventsPatterns.newNotification, {
        notificationCount,
      });
    } catch (err) {
      console.error(err);
      throw new BadRequestException(
        `Error creating notification: ${err.message}`,
      );
    }
  }

  async getNotifications(id: number, query: any = {}) {
    try {
      const page = parseInt(query.page, 10) || 0;
      const limit = parseInt(query.limit, 10) || 10;

      const notifications =
        await this.notificationRepository.findUserNotifications(
          id,
          page,
          limit,
        );

      return notifications.map(
        (notification) =>
          new NotificationDto(
            notification.id,
            notification.createdAt,
            notification.user.id,
            notification.text,
            notification.initials,
            notification.seen,
          ),
      );
    } catch (error) {
      console.error(
        'An error occurred while fetching the notification:',
        error,
      );
      throw new Error('Failed to fetch notification');
    }
  }

  async getNotification(id: number) {
    try {
      const notification =
        await this.notificationRepository.findOneNotification(id);

      if (!notification) {
        throw new Error('Notification not found');
      }

      return new NotificationDto(
        notification.id,
        notification.createdAt,
        notification.user.id,
        notification.text,
        notification.initials,
        notification.seen,
      );
    } catch (error) {
      console.error(
        'An error occurred while fetching the notification:',
        error,
      );
      throw new Error('Failed to fetch notification');
    }
  }

  async deleteNotification(id: number) {
    try {
      const notification =
        await this.notificationRepository.findOneNotification(id);

      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }

      await this.notificationRepository.deleteNotification(id);
    } catch (err) {
      console.error(`Error deleting notification with ID ${id}:`, err);
      if (err instanceof NotFoundException) {
        throw err;
      } else {
        throw new InternalServerErrorException(
          `An error occurred during the delete notification operation: ${err.message}`,
        );
      }
    }
  }

  async changeNotificationSeenState(id: number) {
    try {
      const notification =
        await this.notificationRepository.findOneNotification(id);

      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }

      notification.seen = true;
      await this.notificationRepository.saveNotification(notification);
      this.scheduleNotificationDeletion(id);
    } catch (err) {
      console.error(
        `Error updating notification seen state for ID ${id}:`,
        err,
      );
      if (err instanceof NotFoundException) {
        throw err;
      } else {
        throw new InternalServerErrorException(
          `An error occurred during the update operation: ${err.message}`,
        );
      }
    }
  }

  async getNumberOfNotifications(id: number): Promise<number> {
    try {
      return await this.notificationRepository.countUnseenNotifications(id);
    } catch (error) {
      console.error('Failed to get notification count:', error);
      throw error;
    }
  }

  private scheduleNotificationDeletion(notificationId: number) {
    const deleteNotification = setTimeout(async () => {
      try {
        await this.deleteNotification(notificationId);
      } catch (timeoutError) {
        console.error('Error during timeout processing:', timeoutError);
      }
    }, 60000);
    this.schedulerRegistry.addTimeout(
      `delete_notification_${notificationId}`,
      deleteNotification,
    );
  }
}
