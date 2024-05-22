import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from '@app/database/entities/center.entity';
import { CenterRepository } from './center.repository';
import { NotFoundException } from '@nestjs/common';
import { CreateCenterDto } from 'libs/dtos/centerDtos/create.center.dto';
import { UpdateCenterDto } from 'libs/dtos/centerDtos/update.center.dto';

const mockCenter = {
  id: 1,
  latitude: 10,
  longitude: 20,
  front: { id: 1, name: 'Test Front' },
};

const mockCenterRepository = {
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('CenterRepository', () => {
  let centerRepository: CenterRepository;
  let repository: Repository<Center>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CenterRepository,
        {
          provide: getRepositoryToken(Center),
          useValue: mockCenterRepository,
        },
      ],
    }).compile();

    centerRepository = module.get<CenterRepository>(CenterRepository);
    repository = module.get<Repository<Center>>(getRepositoryToken(Center));
  });

  it('should be defined', () => {
    expect(centerRepository).toBeDefined();
  });

  describe('count', () => {
    it('should return the count of centers', async () => {
      repository.count.mockResolvedValue(5);
      expect(await centerRepository.count()).toBe(5);
    });
  });

  describe('createCenter', () => {
    it('should create and save a new center', async () => {
      const createCenterDto: CreateCenterDto = { latitude: 10, longitude: 20 };
      const front = { id: 1, name: 'Test Front' };

      repository.create.mockReturnValue(mockCenter);
      repository.save.mockResolvedValue(mockCenter);

      expect(
        await centerRepository.createCenter(createCenterDto, front),
      ).toEqual(mockCenter);
      expect(repository.create).toHaveBeenCalledWith({
        latitude: createCenterDto.latitude,
        longitude: createCenterDto.longitude,
        front,
      });
      expect(repository.save).toHaveBeenCalledWith(mockCenter);
    });
  });

  describe('findOneWithFront', () => {
    it('should find one center with front relation', async () => {
      repository.findOne.mockResolvedValue(mockCenter);
      expect(await centerRepository.findOneWithFront(1)).toEqual(mockCenter);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['front'],
      });
    });
  });

  describe('findAll', () => {
    it('should return all centers with front relation', async () => {
      repository.find.mockResolvedValue([mockCenter]);
      expect(await centerRepository.findAll()).toEqual([mockCenter]);
      expect(repository.find).toHaveBeenCalledWith({
        select: ['id', 'latitude', 'longitude'],
        relations: ['front'],
      });
    });
  });

  describe('findById', () => {
    it('should find a center by id', async () => {
      repository.findOne.mockResolvedValue(mockCenter);
      expect(await centerRepository.findById(1)).toEqual(mockCenter);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('updateCenter', () => {
    it('should update a center', async () => {
      const updateCenterDto: UpdateCenterDto = {
        id: 1,
        latitude: 15,
        longitude: 25,
      };

      repository.findOne.mockResolvedValue(mockCenter);
      repository.save.mockResolvedValue(mockCenter);

      expect(await centerRepository.updateCenter(updateCenterDto)).toEqual(
        mockCenter,
      );
      expect(repository.save).toHaveBeenCalledWith({
        ...mockCenter,
        latitude: updateCenterDto.latitude,
        longitude: updateCenterDto.longitude,
      });
    });

    it('should throw an error if center not found', async () => {
      const updateCenterDto: UpdateCenterDto = {
        id: 1,
        latitude: 15,
        longitude: 25,
      };

      repository.findOne.mockResolvedValue(null);

      await expect(
        centerRepository.updateCenter(updateCenterDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCenter', () => {
    it('should delete a center', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });

      await expect(centerRepository.deleteCenter(1)).resolves.not.toThrow();
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw an error if center not found', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(centerRepository.deleteCenter(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findCentersNearby', () => {
    it('should find centers nearby given coordinates and range', async () => {
      repository.find.mockResolvedValue([mockCenter]);

      expect(await centerRepository.findCentersNearby(10, 20, 5)).toEqual([
        mockCenter,
      ]);
      expect(repository.find).toHaveBeenCalledWith({
        where: {
          latitude: Between(5, 15),
          longitude: Between(15, 25),
        },
        relations: ['front'],
      });
    });
  });

  describe('findCenterCoordinatesByFrontId', () => {
    it('should find center coordinates by front id', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockCenter),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      expect(await centerRepository.findCenterCoordinatesByFrontId(1)).toEqual({
        long: mockCenter.longitude,
        lat: mockCenter.latitude,
      });
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'center.front',
        'front',
      );
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'center.latitude',
        'center.longitude',
      ]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'front.id = :frontId',
        { frontId: 1 },
      );
    });

    it('should throw an error if center not found', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(
        centerRepository.findCenterCoordinatesByFrontId(1),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
