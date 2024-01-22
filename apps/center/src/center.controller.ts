import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { CenterService } from './center.service';
import { MessagePattern, RpcException } from '@nestjs/microservices';
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
    try {
      return this.centerService.updateCenter(updateCenterDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Retrieve a list of all centers.
  @MessagePattern(centerMessagePatterns.getCenters)
  async getCenters(): Promise<CenterDto[]> {
    try {
      return this.centerService.getCenters();
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(centerMessagePatterns.getCenter)
  async getCenter({ id }: { id: number }): Promise<CenterDto> {
    try {
      return this.centerService.getCenter(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Delete a center by its ID and return a boolean indicating success or failure.
  @MessagePattern(centerMessagePatterns.deleteCenter)
  async deleteCenter(id: number): Promise<boolean> {
    try {
      return this.centerService.deleteCenter(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
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
    try {
      return await this.centerService.getCenterForExchange(getCenterDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }
}
