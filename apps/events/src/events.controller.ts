import { Controller } from '@nestjs/common';
import { EventsService } from './events.service';
import { MessagePattern } from '@nestjs/microservices';
import { eventMessagePatterns } from '@app/tcp/eventMessagePatterns/event.message.patterns';
import { CreateEventDto } from 'libs/dtos/eventDtos/create.event.dto';

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @MessagePattern(eventMessagePatterns.createEvent)
  async createEvent({ createEvent }: { createEvent: CreateEventDto }) {
    await this.eventsService.createEvent(createEvent);
  }
}
