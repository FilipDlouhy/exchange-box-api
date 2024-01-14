import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { FrontService } from './front.service';
import { frontMessagePatterns } from '@app/tcp/front.message.patterns';
import { MessagePattern } from '@nestjs/microservices';
import { AddExchangeToFrontDto } from '@app/dtos/exchangeDtos/add.exchange.to.front..dto';
import { DeleteExchangeFromFrontDto } from '@app/dtos/exchangeDtos/delete.exchange.from.front.dto';

@Controller()
export class FrontController {
  constructor(private readonly frontService: FrontService) {}

  // Create a front entity associated with the specified center
  @MessagePattern(frontMessagePatterns.createFront)
  async createFront({ center_id }: { center_id: number }): Promise<boolean> {
    return await this.frontService.createFront(center_id);
  }

  @MessagePattern(frontMessagePatterns.getFrontForTask)
  async getFrontForTask({
    size,
    center_id,
  }: {
    size: string;
    center_id: number;
  }): Promise<number> {
    return await this.frontService.getFrontForTask(size, center_id);
  }

  @MessagePattern(frontMessagePatterns.addTaskToFront)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async addTaskToFront({
    addExchangeToTheFront,
  }: {
    addExchangeToTheFront: AddExchangeToFrontDto;
  }): Promise<boolean> {
    return await this.frontService.addTaskToFront(addExchangeToTheFront);
  }

  @MessagePattern(frontMessagePatterns.deleteTaskFromFront)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async deleteTaskFromFront(
    deleteExchnageFromFront: DeleteExchangeFromFrontDto,
  ): Promise<boolean> {
    return await this.frontService.deleteTaskFromFront(deleteExchnageFromFront);
  }

  // Delete a center by its ID and return a boolean indicating success or failure.
  @MessagePattern(frontMessagePatterns.getCenterIdByFront)
  async getCenterIdByFront({ id }: { id: number }): Promise<number> {
    return this.frontService.getCenterIdByFront(id);
  }
}
