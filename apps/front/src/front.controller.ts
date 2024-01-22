import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { FrontService } from './front.service';
import { frontMessagePatterns } from '@app/tcp/front.message.patterns';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { DeleteExchangeFromFrontDto } from '@app/dtos/exchangeDtos/delete.exchange.from.front.dto';
import { Front } from '@app/database/entities/front.entity';

@Controller()
export class FrontController {
  constructor(private readonly frontService: FrontService) {}

  // Create a front entity associated with the specified center
  @MessagePattern(frontMessagePatterns.createFront)
  async createFront(): Promise<Front> {
    try {
      return await this.frontService.createFront();
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(frontMessagePatterns.getFrontForTask)
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

  @MessagePattern(frontMessagePatterns.deleteTaskFromFront)
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
