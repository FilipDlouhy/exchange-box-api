import { Test, TestingModule } from '@nestjs/testing';
import { FrontRepository } from './front.repository';
import { Front } from '@app/database/entities/front.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('FrontRepository', () => {
  let repository: FrontRepository;
  let mockRepository: jest.Mocked<Repository<Front>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FrontRepository,
        {
          provide: getRepositoryToken(Front),
          useClass: Repository,
        },
      ],
    }).compile();

    repository = module.get<FrontRepository>(FrontRepository);
    mockRepository = module.get<Repository<Front>>(
      getRepositoryToken(Front),
    ) as jest.Mocked<Repository<Front>>;
  });

  describe('createFront', () => {
    it('should create and save a new front entity', async () => {
      const frontData: Partial<Front> = {
        numberOfTasksInFront: 0,
        totalNumberOfTasks: 10,
        numberOfLargeBoxes: 0,
        numberOfMediumBoxes: 0,
        numberOfSmallBoxes: 0,
        numberOfLargeBoxesTotal: 5,
        numberOfMediumBoxesTotal: 5,
        numberOfSmallBoxesTotal: 5,
      };
      const savedFront = new Front(frontData);
      mockRepository.create.mockReturnValue(savedFront);
      mockRepository.save.mockResolvedValue(savedFront);

      const result = await repository.createFront(frontData);
      expect(result).toBe(savedFront);
      expect(mockRepository.create).toHaveBeenCalledWith(frontData);
      expect(mockRepository.save).toHaveBeenCalledWith(savedFront);
    });
  });

  describe('findFrontById', () => {
    it('should return a front entity by ID', async () => {
      const front = new Front({
        id: 1,
        numberOfTasksInFront: 0,
        totalNumberOfTasks: 10,
        numberOfLargeBoxes: 0,
        numberOfMediumBoxes: 0,
        numberOfSmallBoxes: 0,
        numberOfLargeBoxesTotal: 5,
        numberOfMediumBoxesTotal: 5,
        numberOfSmallBoxesTotal: 5,
        updatedAt: new Date(),
      });
      mockRepository.findOne.mockResolvedValue(front);

      const result = await repository.findFrontById(1);
      expect(result).toBe(front);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return null if no front entity is found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await repository.findFrontById(1);
      expect(result).toBeNull();
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('saveFront', () => {
    it('should save a front entity', async () => {
      const front = new Front({
        id: 1,
        numberOfTasksInFront: 0,
        totalNumberOfTasks: 10,
        numberOfLargeBoxes: 0,
        numberOfMediumBoxes: 0,
        numberOfSmallBoxes: 0,
        numberOfLargeBoxesTotal: 5,
        numberOfMediumBoxesTotal: 5,
        numberOfSmallBoxesTotal: 5,
        updatedAt: new Date(),
      });
      mockRepository.save.mockResolvedValue(front);

      const result = await repository.saveFront(front);
      expect(result).toBe(front);
      expect(mockRepository.save).toHaveBeenCalledWith(front);
    });
  });
});
