import { Test, TestingModule } from '@nestjs/testing';
import { FrontService } from './front.service';
import { FrontRepository } from './front.repository';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Front } from '@app/database/entities/front.entity';
import { DeleteExchangeFromFrontDto } from 'libs/dtos/exchangeDtos/delete.exchange.from.front.dto';

describe('FrontService', () => {
  let service: FrontService;
  let repository: jest.Mocked<FrontRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FrontService,
        {
          provide: FrontRepository,
          useValue: {
            createFront: jest.fn(),
            findFrontById: jest.fn(),
            saveFront: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FrontService>(FrontService);
    repository = module.get(FrontRepository);
  });

  describe('createFront', () => {
    it('should create a new front and return it', async () => {
      const boxTotals = {
        smallBoxes: 5,
        mediumBoxes: 3,
        largeBoxes: 2,
        total: 10,
      };

      const newFront = new Front({
        numberOfTasksInFront: 0,
        totalNumberOfTasks: boxTotals.total,
        numberOfLargeBoxes: 0,
        numberOfMediumBoxes: 0,
        numberOfSmallBoxes: 0,
        numberOfLargeBoxesTotal: boxTotals.largeBoxes,
        numberOfMediumBoxesTotal: boxTotals.mediumBoxes,
        numberOfSmallBoxesTotal: boxTotals.smallBoxes,
        exchanges: [],
        updatedAt: new Date(),
      });

      repository.createFront.mockResolvedValue(newFront);

      const result = await service.createFront();
      expect(result).toBe(newFront);
      expect(repository.createFront).toHaveBeenCalledWith({
        totalNumberOfTasks: 10,
        numberOfTasksInFront: 0,
        numberOfLargeBoxesTotal: 2,
        numberOfMediumBoxesTotal: 3,
        numberOfSmallBoxesTotal: 5,
      });
    });

    it('should throw an error if creation fails', async () => {
      await expect(service.createFront()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('addTaskToFront', () => {
    it('should add a task to the front', async () => {
      const front = new Front({
        id: 1,
        numberOfTasksInFront: 1,
        totalNumberOfTasks: 10,
        numberOfLargeBoxes: 0,
        numberOfMediumBoxes: 0,
        numberOfSmallBoxes: 1,
        numberOfLargeBoxesTotal: 5,
        numberOfMediumBoxesTotal: 5,
        numberOfSmallBoxesTotal: 5,
        exchanges: [],
        updatedAt: new Date(),
      });

      repository.findFrontById.mockResolvedValue(front);

      await service.addTaskToFront('Small', 1);
      expect(front.numberOfSmallBoxes).toBe(2);
      expect(repository.saveFront).toHaveBeenCalledWith(front);
    });

    it('should throw NotFoundException if front is not found', async () => {
      repository.findFrontById.mockResolvedValue(null);
      await expect(service.addTaskToFront('Small', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if front is full', async () => {
      const front = new Front({
        id: 1,
        numberOfTasksInFront: 1,
        totalNumberOfTasks: 10,
        numberOfLargeBoxes: 0,
        numberOfMediumBoxes: 0,
        numberOfSmallBoxes: 5,
        numberOfLargeBoxesTotal: 5,
        numberOfMediumBoxesTotal: 5,
        numberOfSmallBoxesTotal: 5,
        exchanges: [],
        updatedAt: new Date(),
      });

      repository.findFrontById.mockResolvedValue(front);

      await expect(service.addTaskToFront('Small', 1)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('deleteTaskFromFront', () => {
    it('should delete a task from the front', async () => {
      const front = new Front({
        id: 1,
        numberOfTasksInFront: 1,
        totalNumberOfTasks: 10,
        numberOfLargeBoxes: 0,
        numberOfMediumBoxes: 0,
        numberOfSmallBoxes: 2,
        numberOfLargeBoxesTotal: 5,
        numberOfMediumBoxesTotal: 5,
        numberOfSmallBoxesTotal: 5,
        exchanges: [],
        updatedAt: new Date(),
      });

      repository.findFrontById.mockResolvedValue(front);

      const deleteExchangeFromFrontDto: DeleteExchangeFromFrontDto = {
        boxSize: 'Small',
        frontId: 1,
        id: 4,
        itemIds: [],
      };
      await service.deleteTaskFromFront(deleteExchangeFromFrontDto);

      expect(front.numberOfSmallBoxes).toBe(1);
      expect(front.numberOfTasksInFront).toBe(0);
      expect(repository.saveFront).toHaveBeenCalledWith(front);
    });

    it('should throw NotFoundException if front is not found', async () => {
      repository.findFrontById.mockResolvedValue(null);
      const deleteExchangeFromFrontDto: DeleteExchangeFromFrontDto = {
        boxSize: 'Small',
        frontId: 1,
        id: 4,
        itemIds: [],
      };
      await expect(
        service.deleteTaskFromFront(deleteExchangeFromFrontDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
