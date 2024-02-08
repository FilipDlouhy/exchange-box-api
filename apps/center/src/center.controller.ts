import { Controller, Inject, UsePipes, ValidationPipe } from '@nestjs/common';
import { CenterService } from './center.service';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { centerMessagePatterns } from '@app/tcp/centerMessagePatterns/center.message.patterns';
import { CenterDto } from '@app/dtos/centerDtos/center.dto';
import { CenterWithFrontDto } from '@app/dtos/centerDtos/center.with.front.dto';
import { UpdateCenterDto } from '@app/dtos/centerDtos/update.center.dto';
import { GetCenterDto } from '@app/dtos/centerDtos/get.center.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Controller()
export class CenterController {
  constructor(
    private readonly centerService: CenterService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

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
      const cacheKey = 'allCenters';
      const cachedCenters: CenterDto[] = await this.cacheManager.get(cacheKey);

      if (cachedCenters) {
        return cachedCenters;
      }

      const allCenters = await this.centerService.getCenters();
      await this.cacheManager.set(cacheKey, allCenters, 18000);

      return allCenters;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(centerMessagePatterns.getCenter)
  async getCenter({ id }: { id: number }): Promise<CenterDto> {
    try {
      const cacheKey = `center:${id}`;
      const cachedCenter: CenterDto = await this.cacheManager.get(cacheKey);

      if (cachedCenter) {
        return cachedCenter;
      }

      const center = await this.centerService.getCenter(id);
      await this.cacheManager.set(cacheKey, center, 18000);

      return center;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  // Delete a center by its ID and return a boolean indicating success or failure.
  @MessagePattern(centerMessagePatterns.deleteCenter)
  async deleteCenter(id: number) {
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
