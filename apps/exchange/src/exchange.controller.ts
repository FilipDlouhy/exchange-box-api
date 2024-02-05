import { Controller, Inject, UsePipes, ValidationPipe } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { exchangeessagePatterns } from '@app/tcp/exchange.message.patterns';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { CreateExchangeDto } from '@app/dtos/exchangeDtos/create.exchange.dto';
import { ExchangeDto } from '@app/dtos/exchangeDtos/exchange.dto';
import { UpdateExchangeDto } from '@app/dtos/exchangeDtos/update.exchange.dto';
import { ExchangeWithUserDto } from '@app/dtos/exchangeDtos/exchange.with.users.dto';
import { AddExchangeToFrontDto } from '@app/dtos/exchangeDtos/add.exchange.to.front..dto';
import { Exchange } from '@app/database/entities/exchange.entity';
import { ChangeExchangeStatusDto } from '@app/dtos/exchangeDtos/change.exchange.status.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Controller()
export class ExchangeController {
  constructor(
    private readonly exchangeService: ExchangeService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @MessagePattern(exchangeessagePatterns.createExchange)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createExchange(createExchangeDto: CreateExchangeDto) {
    try {
      return await this.exchangeService.createExchange(createExchangeDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(exchangeessagePatterns.deleteExchange)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async deleteExchange({ id }: { id: number }) {
    try {
      return await this.exchangeService.deleteExchange(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(exchangeessagePatterns.updateExchange)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateExchange(
    updateExchangeDto: UpdateExchangeDto,
  ): Promise<ExchangeDto> {
    try {
      return await this.exchangeService.updateExchange(updateExchangeDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(exchangeessagePatterns.getUserExchanges)
  async getUserExchanges({
    id,
  }: {
    id: number;
  }): Promise<ExchangeWithUserDto[]> {
    try {
      const cacheKey = `userExchanges:${id}`;
      const cachedUserExchanges: ExchangeWithUserDto[] =
        await this.cacheManager.get(cacheKey);

      if (cachedUserExchanges) {
        return cachedUserExchanges;
      }

      const userExchanges = await this.exchangeService.getExchangesByUser(
        id,
        true,
      );
      await this.cacheManager.set(cacheKey, userExchanges, 18000);

      return userExchanges;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(exchangeessagePatterns.getFriendExchanges)
  async getFriendExchanges({
    id,
  }: {
    id: number;
  }): Promise<ExchangeWithUserDto[]> {
    try {
      const cacheKey = `friendExchanges:${id}`;
      const cachedFriendExchanges: ExchangeWithUserDto[] =
        await this.cacheManager.get(cacheKey);

      if (cachedFriendExchanges) {
        return cachedFriendExchanges;
      }
      const friendExchanges = await this.exchangeService.getExchangesByUser(
        id,
        false,
      );
      await this.cacheManager.set(cacheKey, friendExchanges, 18000);

      return friendExchanges;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(exchangeessagePatterns.getFullExchange)
  async getFullExchange({ id }: { id: number }) {
    try {
      const cacheKey = `fullExchange:${id}`;
      const cachedFullExchange: any = await this.cacheManager.get(cacheKey);

      if (cachedFullExchange) {
        return cachedFullExchange;
      }

      const fullExchange = await this.exchangeService.getFullExchange(id);

      await this.cacheManager.set(cacheKey, fullExchange, 18000);

      return fullExchange;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(exchangeessagePatterns.getAllExchanges)
  async getAllExchanges(): Promise<ExchangeWithUserDto[]> {
    try {
      const cacheKey = 'allExchanges';
      const cachedExchanges: ExchangeWithUserDto[] =
        await this.cacheManager.get(cacheKey);

      if (cachedExchanges) {
        return cachedExchanges;
      }

      const allExchanges = await this.exchangeService.getAllExchanges();
      await this.cacheManager.set(cacheKey, allExchanges, 18000);

      return allExchanges;
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(exchangeessagePatterns.addExchangeToTheFront)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async addExchangeToTheFront(
    addExchangeToTheFront: AddExchangeToFrontDto,
  ): Promise<Exchange> {
    try {
      return await this.exchangeService.addExchangeToTheFront(
        addExchangeToTheFront,
      );
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(exchangeessagePatterns.deleteExchangeFromFront)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async deleteExchangeFromFront({ boxId }: { boxId: number }) {
    try {
      return await this.exchangeService.deleteExchangeFromFront(boxId);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(exchangeessagePatterns.changeExchangeStatus)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async changeExchangeStatus(changeExchangeStatus: ChangeExchangeStatusDto) {
    try {
      return await this.exchangeService.changeExchangeStatus(
        changeExchangeStatus,
      );
    } catch (error) {
      throw new RpcException(error.message);
    }
  }
  @MessagePattern(exchangeessagePatterns.getBoxSize)
  async getBoxSize({ id }: { id: number }): Promise<string> {
    try {
      return await this.exchangeService.getBoxSize(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }
}
