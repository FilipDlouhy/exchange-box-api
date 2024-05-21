import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event } from '@app/database/entities/event.entity';
import { Repository } from 'typeorm';
import { CreateEventDto } from 'libs/dtos/eventDtos/create.event.dto';
import { ClientProxy } from '@nestjs/microservices';
import { User } from '@app/database';
import { of } from 'rxjs';

describe('EventsService', () => {
  let eventsService: EventsService;
  let eventRepository: Repository<Event>;
  let userClient: ClientProxy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useClass: Repository,
        },
        {
          provide: 'userClient',
          useValue: {
            send: jest.fn(),
          },
        },
      ],
    }).compile();

    eventsService = module.get<EventsService>(EventsService);
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    userClient = module.get<ClientProxy>('userClient');
  });

  it('should be defined', () => {
    expect(eventsService).toBeDefined();
  });

  describe('createEvent', () => {
    it('should create a new event and save it in the repository', async () => {
      const createEventDto: CreateEventDto = {
        fromTime: new Date(),
        toTime: new Date(new Date().getTime() + 3600000), // 1 hour later
        eventName: 'Test Event',
        eventDescription: 'This is a test event',
        userId: 23,
      };

      const mockUser: User = {
        id: 1,
        name: 'John Doe',
        telephone: '1234567890',
        address: '123 Main St',
        email: 'john@example.com',
        longitude: 40,
        latitude: 30,
        password: 'password',
        imageUrl: 'image_url_1',
        backgroundImageUrl: 'background_image_url_1',
        events: [],
        exchanges: [],
        friends: [],
        items: [],
        notifications: [],
      } as User;

      const savedEvent: Event = {
        id: 123,
        fromTime: createEventDto.fromTime,
        toTime: createEventDto.toTime,
        eventName: createEventDto.eventName,
        eventDescription: createEventDto.eventDescription,
        user: mockUser,
        createdAt: new Date(),
      };

      jest.spyOn(eventRepository, 'create').mockReturnValue(savedEvent);
      jest.spyOn(userClient, 'send').mockImplementation(() => of(mockUser));
      jest.spyOn(eventRepository, 'save').mockResolvedValue(savedEvent);

      const result = await eventsService.createEvent(createEventDto);

      expect(eventRepository.create).toHaveBeenCalledWith(createEventDto);
      expect(userClient.send).toHaveBeenCalledWith(
        { cmd: 'getUserById' },
        { userId: createEventDto.userId },
      );
      expect(eventRepository.save).toHaveBeenCalledWith(savedEvent);
      expect(result).toEqual(savedEvent);
    });
  });
});
