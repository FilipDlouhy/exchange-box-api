import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../../libs/database/src/entities/notification.entity';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async findAllSeenNotifications(): Promise<Notification[]> {
    return this.notificationRepository.find({ where: { seen: true } });
  }

  async createNotification(notification: Notification): Promise<Notification> {
    return this.notificationRepository.save(notification);
  }

  async findUserNotifications(
    userId: number,
    page: number,
    limit: number,
  ): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
      skip: page * limit,
      take: limit,
    });
  }

  async findOneNotification(id: number): Promise<Notification | undefined> {
    return this.notificationRepository.findOne({ where: { id } });
  }

  async deleteNotification(id: number): Promise<void> {
    await this.notificationRepository.delete(id);
  }

  async countUnseenNotifications(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: { user: { id: userId }, seen: false },
    });
  }

  async saveNotification(notification: Notification): Promise<Notification> {
    return this.notificationRepository.save(notification);
  }
}
