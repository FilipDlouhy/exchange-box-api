import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { CreateEventDto } from 'libs/dtos/eventDtos/create.event.dto';

describe('EventsController', () => {
  let eventsController: EventsController;
  let eventsService: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: {
            createEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    eventsController = module.get<EventsController>(EventsController);
    eventsService = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(eventsController).toBeDefined();
  });

  describe('createEvent', () => {
    it('should call EventsService.createEvent with the correct parameters', async () => {
      const createEventDto: CreateEventDto = {
        fromTime: new Date(),
        toTime: new Date(new Date().getTime() + 3600000), // 1 hour later
        eventName: 'Test Event',
        eventDescription: 'This is a test event',
        userId: 123,
      };
      const eventPayload = { createEvent: createEventDto };

      await eventsController.createEvent(eventPayload);

      expect(eventsService.createEvent).toHaveBeenCalledWith(createEventDto);
    });

    it('should return undefined when createEvent is called', async () => {
      const createEventDto: CreateEventDto = {
        fromTime: new Date(),
        toTime: new Date(new Date().getTime() + 3600000), // 1 hour later
        eventName: 'Test Event',
        eventDescription: 'This is a test event',
        userId: 123,
      };
      const eventPayload = { createEvent: createEventDto };

      const result = await eventsController.createEvent(eventPayload);

      expect(result).toBeUndefined();
    });
  });
});
