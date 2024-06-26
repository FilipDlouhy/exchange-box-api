import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Notification } from '@app/database/entities/notification.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationRepository } from './notification.repository';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    TypeOrmModule.forFeature([Notification]),
    CacheModule.register(),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationRepository],
})
export class NotificationsModule {}
