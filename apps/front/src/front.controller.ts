import { Controller } from '@nestjs/common';
import { FrontService } from './front.service';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { DeleteExchangeFromFrontDto } from '@app/dtos/exchangeDtos/delete.exchange.from.front.dto';
import { Front } from '@app/database/entities/front.entity';
import { frontManagementCommands } from '@app/tcp/frontMessagePatterns/front.management.message.patterns';
import { taskManagementCommands } from '@app/tcp/frontMessagePatterns/front.task.management.message.patterns';

@Controller()
export class FrontController {
  constructor(private readonly frontService: FrontService) {}

  // Create a front entity associated with the specified center
  @MessagePattern(frontManagementCommands.createFront)
  async createFront(): Promise<Front> {
    try {
      return await this.frontService.createFront();
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(taskManagementCommands.getFrontForTask)
  async getFrontForTask({
    size,
    frontId,
  }: {
    size: string;
    frontId: number;
  }): Promise<Front> {
    try {
      return await this.frontService.getFrontForTask(size, frontId);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(taskManagementCommands.deleteTaskFromFront)
  async deleteTaskFromFront(
    deleteExchnageFromFront: DeleteExchangeFromFrontDto,
  ): Promise<boolean> {
    try {
      return await this.frontService.deleteTaskFromFront(
        deleteExchnageFromFront,
      );
    } catch (error) {
      throw new RpcException(error.message);
    }
  }
}
