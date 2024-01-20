import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { CenterService } from './center.service';
import { MessagePattern } from '@nestjs/microservices';
import { centerMessagePatterns } from '@app/tcp/center.message.patterns';
import { CenterDto } from '@app/dtos/centerDtos/center.dto';
import { CenterWithFrontDto } from '@app/dtos/centerDtos/center.with.front.dto';
import { UpdateCenterDto } from '@app/dtos/centerDtos/update.center.dto';
import { GetCenterDto } from '@app/dtos/centerDtos/get.center.dto';

@Controller()
export class CenterController {
  constructor(private readonly centerService: CenterService) {}

  // Update an existing center and return its updated information.
  @MessagePattern(centerMessagePatterns.updateCenter)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateCenter(
    updateCenterDto: UpdateCenterDto,
  ): Promise<CenterWithFrontDto> {
    return this.centerService.updateCenter(updateCenterDto);
  }

  // Retrieve a list of all centers.
  @MessagePattern(centerMessagePatterns.getCenters)
  async getCenters(): Promise<CenterDto[]> {
    return this.centerService.getCenters();
  }

  @MessagePattern(centerMessagePatterns.getCenter)
  async getCenter({ id }: { id: number }): Promise<CenterDto> {
    return this.centerService.getCenter(id);
  }

  // Delete a center by its ID and return a boolean indicating success or failure.
  @MessagePattern(centerMessagePatterns.deleteCenter)
  async deleteCenter(id: number): Promise<boolean> {
    return this.centerService.deleteCenter(id);
  }

  // Retrieve a center's information by its ID.
  @MessagePattern(centerMessagePatterns.getCenterForExchange)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async getCenterForExchnage(
    getCenterDto: GetCenterDto,
  ): Promise<CenterWithFrontDto[]> {
    return await this.centerService.getCenterForExchange(getCenterDto);
  }
}
