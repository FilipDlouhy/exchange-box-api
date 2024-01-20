import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { FrontService } from './front.service';
import { frontMessagePatterns } from '@app/tcp/front.message.patterns';
import { MessagePattern } from '@nestjs/microservices';
import { DeleteExchangeFromFrontDto } from '@app/dtos/exchangeDtos/delete.exchange.from.front.dto';
import { Front } from '@app/database/entities/front.entity';

@Controller()
export class FrontController {
  constructor(private readonly frontService: FrontService) {}

  // Create a front entity associated with the specified center
  @MessagePattern(frontMessagePatterns.createFront)
  async createFront(): Promise<Front> {
    return await this.frontService.createFront();
  }

  @MessagePattern(frontMessagePatterns.getFrontForTask)
  async getFrontForTask({
    size,
    frontId,
  }: {
    size: string;
    frontId: number;
  }): Promise<Front> {
    return await this.frontService.getFrontForTask(size, frontId);
  }

  @MessagePattern(frontMessagePatterns.deleteTaskFromFront)
  async deleteTaskFromFront(
    deleteExchnageFromFront: DeleteExchangeFromFrontDto,
  ): Promise<boolean> {
    return await this.frontService.deleteTaskFromFront(deleteExchnageFromFront);
  }
}
