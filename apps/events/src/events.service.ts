import { Event } from '@app/database/entities/event.entity';
import { Injectable } from '@nestjs/common';
import { CreateEventDto } from 'libs/dtos/eventDtos/create.event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { userManagementCommands } from '@app/tcp';
import { User } from '@app/database';

@Injectable()
export class EventsService {
  private readonly userClient;
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {
    this.userClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3006,
      },
    });
  }

  /**
   * Asynchronously creates a new event in the database.
   * @param createEventDto The data transfer object containing the details of the event to be created.
   * @returns The newly created event object.
   */
  async createEvent(createEventDto: CreateEventDto) {
    const newEvent = this.eventRepository.create(createEventDto);
    const user: User = await this.userClient
      .send(
        { cmd: userManagementCommands.getUserById.cmd },
        {
          userId: createEventDto.userId,
        },
      )
      .toPromise();
    newEvent.user = user;
    await this.eventRepository.save(newEvent);
    return newEvent;
  }
}
