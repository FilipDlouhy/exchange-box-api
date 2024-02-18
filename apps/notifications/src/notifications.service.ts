import { Notification } from '@app/database/entities/notification.entity';
import { User } from '@app/database/entities/user.entity';
import { userManagementCommands } from '@app/tcp';
import { notificationEventsPatterns } from '@app/tcp/eventMessagePatterns/notification.events.message.patterns';
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
import { InjectRepository } from '@nestjs/typeorm';
import { CreateNotificationDto } from 'libs/dtos/notificationDtos/create.notification.dto';
import { NotificationDto } from 'libs/dtos/notificationDtos/notification.dto';
import { Repository } from 'typeorm';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly userClient;
  private client: ClientProxy;
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
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

  /**
   * Initializes the module and schedules deletion of seen notifications.
   */
  async onModuleInit() {
    const notifications = await this.notificationRepository.find({
      where: { seen: true },
    });
    notifications.forEach((notification) =>
      this.scheduleNotificationDeletion(notification.id),
    );
  }

  /**
   * Creates a new notification in the database based on the provided data.
   *
   * @param {CreateNotificationDto} createNotificationDto - The data to create the notification.
   * @throws {BadRequestException} - If an error occurs during the creation process.
   * @returns {Promise<void>} - A promise that resolves once the notification is created successfully.
   */
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

      await this.notificationRepository.save(notification);

      const notificationCount = await this.notificationRepository.count({
        where: { user: { id: user.id }, seen: false },
      });

      this.client.emit<any>(notificationEventsPatterns.newNotification, {
        notificationCount,
      });
    } catch (err) {
      console.error(err); // It's a good practice to log the actual error
      throw new BadRequestException('Error creating notification');
    }
  }

  /**
   * Retrieves notifications associated with a user by the user's ID from the database and returns them as DTOs.
   *
   * @param {number} id - The ID of the user whose notifications to retrieve.
   * @throws {Error} - If an error occurs during the retrieval.
   * @returns {Promise<NotificationDto[]>} - A promise that resolves to an array of DTO representations of the retrieved notifications.
   */
  async getNotifications(id: number, query: any = {}) {
    try {
      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 10;

      const notifications = await this.notificationRepository.find({
        where: { user: { id: id } },
        relations: ['user'],
        skip: (page - 1) * limit,
        take: limit,
      });

      const notificationDtos = notifications.map((notification) => {
        return new NotificationDto(
          notification.id,
          notification.createdAt,
          notification.user.id,
          notification.text,
          notification.initials,
          notification.seen,
        );
      });

      return notificationDtos;
    } catch (error) {
      console.error(
        'An error occurred while fetching the notification:',
        error,
      );
      throw new Error('Failed to fetch notification');
    }
  }

  /**
   * Retrieves a notification by its ID from the database and returns it as a DTO.
   *
   * @param {number} id - The ID of the notification to retrieve.
   * @throws {Error} - If the notification with the given ID is not found or if an error occurs during the retrieval.
   * @returns {Promise<NotificationDto>} - A promise that resolves to the DTO representation of the retrieved notification.
   */
  async getNotification(id: number) {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: id },
      });

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

  /**
   * Deletes a notification from the database by the provided ID.
   *
   * @param {number} id - The ID of the notification to delete.
   * @throws {NotFoundException} - If the notification with the given ID is not found.
   * @throws {InternalServerErrorException} - If an error occurs during the deletion operation.
   * @returns {Promise<void>} - A promise that resolves once the deletion is successful.
   */
  async deleteNotification(id: number) {
    try {
      const result = await this.notificationRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`notification with ID ${id} not found`);
      }
    } catch (err) {
      console.error(`Error deleting notification with ID ${id}:`, err);
      if (err instanceof NotFoundException) {
        throw err;
      } else {
        throw new InternalServerErrorException(
          `An error occurred during the deletenotification operation: ${err.message}`,
        );
      }
    }
  }

  /**
   * Marks a notification as seen and schedules its deletion.
   *
   * @param {number} id - ID of the notification to update.
   * @throws {NotFoundException} If no notification is found.
   * @throws {InternalServerErrorException} On update or deletion error.
   */
  async changeNotificationSeenState(id: number) {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id },
      });

      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      notification.seen = true;
      await this.notificationRepository.save(notification);
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

  /**
   * Gets the number of unseen notifications for a specific user.
   * @param id The ID of the user for whom to count the unseen notifications.
   * @returns The count of unseen notifications.
   */
  async getNumberOfNotifications(id: number): Promise<number> {
    try {
      const notificationCount = await this.notificationRepository.count({
        where: { user: { id }, seen: false },
      });

      return notificationCount;
    } catch (error) {
      console.error('Failed to get notification count:', error);
      throw error;
    }
  }

  /**
   * Schedules the deletion of a notification after a specified delay.
   * @param notificationId The ID of the notification to delete.
   */
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
