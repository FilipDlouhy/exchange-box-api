import { Controller } from '@nestjs/common';
import { EventGateway } from './event.gateway';
import { MessagePattern } from '@nestjs/microservices';
import { notificationEventsPatterns } from '@app/tcp/notificationMessagePatterns/notification.events.message.patterns';

@Controller()
export class EventController {
  constructor(private readonly eventGateway: EventGateway) {}

  @MessagePattern(notificationEventsPatterns.newNotification)
  async handleNotificationCreated(data: any) {
    console.log('Received event:', data);
    this.eventGateway.sendToUI({
      message: 'Notification',
      ...data,
    });
  }
}
