import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { CenterService } from './center.service';
import { MessagePattern } from '@nestjs/microservices';
import { centerMessagePatterns } from '@app/tcp/center.message.patterns';
import { CreateCenterDto } from '@app/dtos/centerDtos/create.center.dto';
import { CenterDto } from '@app/dtos/centerDtos/center.dto';
import { CenterWithFrontDto } from '@app/dtos/centerDtos/center.with.front.dto';
import { UpdateCenterDto } from '@app/dtos/centerDtos/update.center.dto';

@Controller()
export class CenterController {
  constructor(private readonly centerService: CenterService) {}

  // Create a new center and return its information.
  @MessagePattern(centerMessagePatterns.createCenter)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createCenterateUser(
    createCenterDto: CreateCenterDto,
  ): Promise<CenterDto> {
    return this.centerService.createCenter(createCenterDto);
  }

  // Retrieve a center's information by its ID.
  @MessagePattern(centerMessagePatterns.getCenter)
  async getCenter({ id }: { id: number }): Promise<CenterWithFrontDto> {
    return this.centerService.getCenter(id);
  }

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

  // Delete a center by its ID and return a boolean indicating success or failure.
  @MessagePattern(centerMessagePatterns.deleteCenter)
  async deleteCenter(id: number): Promise<boolean> {
    return this.centerService.deleteCenter(id);
  }
}
