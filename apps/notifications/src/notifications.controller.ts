import { Controller } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { notificationManagementCommands } from '../../../libs/tcp/src/notificationMessagePatterns/notification.management.message.patterns';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { CreateNotificationDto } from 'libs/dtos/notificationDtos/create.notification.dto';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @MessagePattern(notificationManagementCommands.createNotification)
  async createNotification(createNotificationDto: CreateNotificationDto) {
    try {
      return this.notificationsService.createNotification(
        createNotificationDto,
      );
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(notificationManagementCommands.getNotification)
  async getNotification({ id }: { id: number }) {
    try {
      return this.notificationsService.getNotification(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(notificationManagementCommands.getNotifications)
  async getNotifications({ id, query }: { id: number; query: any }) {
    try {
      return this.notificationsService.getNotifications(id, query);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(notificationManagementCommands.deleteNotification)
  async deleteNotification({ id }: { id: number }) {
    try {
      return this.notificationsService.deleteNotification(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(notificationManagementCommands.changeNotificationSeenState)
  async changeNotificationSeenState({ id }: { id: number }) {
    try {
      return this.notificationsService.changeNotificationSeenState(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(notificationManagementCommands.getNumberOfNotifications)
  async getNumberOfNotifications({ id }: { id: number }) {
    try {
      return this.notificationsService.getNumberOfNotifications(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }
}
