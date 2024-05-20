import { Test, TestingModule } from '@nestjs/testing';
import { FrontController } from './front.controller';
import { FrontService } from './front.service';
import { RpcException } from '@nestjs/microservices';
import { Front } from '@app/database/entities/front.entity';
import { DeleteExchangeFromFrontDto } from 'libs/dtos/exchangeDtos/delete.exchange.from.front.dto';
import { frontManagementCommands } from '@app/tcp/frontMessagePatterns/front.management.message.patterns';
import { taskManagementCommands } from '@app/tcp/frontMessagePatterns/front.task.management.message.patterns';

describe('FrontController', () => {
  let controller: FrontController;
  let service: jest.Mocked<FrontService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FrontController],
      providers: [
        {
          provide: FrontService,
          useValue: {
            createFront: jest.fn(),
            addTaskToFront: jest.fn(),
            deleteTaskFromFront: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FrontController>(FrontController);
    service = module.get<FrontService>(
      FrontService,
    ) as jest.Mocked<FrontService>;
  });

  describe('createFront', () => {
    it('should return the created front', async () => {
      const newFront = new Front({
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
      service.createFront.mockResolvedValue(newFront);

      const result = await controller.createFront();
      expect(result).toBe(newFront);
      expect(service.createFront).toHaveBeenCalled();
    });

    it('should throw an RpcException if service throws an error', async () => {
      const errorMessage = 'Error creating front';
      service.createFront.mockRejectedValue(new Error(errorMessage));

      await expect(controller.createFront()).rejects.toThrow(RpcException);
      await expect(controller.createFront()).rejects.toThrow(errorMessage);
    });
  });

  describe('addTaskToFront', () => {
    it('should call the service to add a task to the front', async () => {
      const size = 'Small';
      const frontId = 1;

      await controller.addTaskToFront({ size, frontId });
      expect(service.addTaskToFront).toHaveBeenCalledWith(size, frontId);
    });

    it('should throw an RpcException if service throws an error', async () => {
      const errorMessage = 'Error adding task to front';
      service.addTaskToFront.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.addTaskToFront({ size: 'Small', frontId: 1 }),
      ).rejects.toThrow(RpcException);
      await expect(
        controller.addTaskToFront({ size: 'Small', frontId: 1 }),
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteTaskFromFront', () => {
    it('should call the service to delete a task from the front', async () => {
      const deleteDto: DeleteExchangeFromFrontDto = {
        id: 4,
        frontId: 1,
        boxSize: 'Small',
        itemIds: [],
      };

      await controller.deleteTaskFromFront(deleteDto);
      expect(service.deleteTaskFromFront).toHaveBeenCalledWith(deleteDto);
    });

    it('should throw an RpcException if service throws an error', async () => {
      const errorMessage = 'Error deleting task from front';
      service.deleteTaskFromFront.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.deleteTaskFromFront({
          id: 4,
          frontId: 1,
          boxSize: 'Small',
          itemIds: [],
        }),
      ).rejects.toThrow(RpcException);
      await expect(
        controller.deleteTaskFromFront({
          id: 4,
          frontId: 1,
          boxSize: 'Small',
          itemIds: [],
        }),
      ).rejects.toThrow(errorMessage);
    });
  });
});
