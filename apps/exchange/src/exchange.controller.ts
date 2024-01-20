import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { exchangeessagePatterns } from '@app/tcp/exchange.message.patterns';
import { MessagePattern } from '@nestjs/microservices';
import { CreateExchangeDto } from '@app/dtos/exchangeDtos/create.exchange.dto';
import { ExchangeDto } from '@app/dtos/exchangeDtos/exchange.dto';
import { UpdateExchangeDto } from '@app/dtos/exchangeDtos/update.exchange.dto';
import { ExchangeWithUserDto } from '@app/dtos/exchangeDtos/exchange.with.users.dto';
import { AddExchangeToFrontDto } from '@app/dtos/exchangeDtos/add.exchange.to.front..dto';
import { Exchange } from '@app/database/entities/exchange.entity';
import { ChangeExchangeStatusDto } from '@app/dtos/exchangeDtos/change.exchange.status.dto';

@Controller()
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @MessagePattern(exchangeessagePatterns.createExchange)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createExchange(createExchangeDto: CreateExchangeDto) {
    return await this.exchangeService.createExchange(createExchangeDto);
  }

  @MessagePattern(exchangeessagePatterns.deleteExchange)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async deleteExchange({ id }: { id: number }): Promise<boolean> {
    return await this.exchangeService.deleteExchange(id);
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
    return await this.exchangeService.updateExchange(updateExchangeDto);
  }

  @MessagePattern(exchangeessagePatterns.getUserExchanges)
  async getUserExchanges({
    id,
  }: {
    id: number;
  }): Promise<ExchangeWithUserDto[]> {
    return await this.exchangeService.getExchangesByUser(id, true);
  }

  @MessagePattern(exchangeessagePatterns.getFriendExchanges)
  async getFriendExchanges({
    id,
  }: {
    id: number;
  }): Promise<ExchangeWithUserDto[]> {
    return await this.exchangeService.getExchangesByUser(id, false);
  }

  @MessagePattern(exchangeessagePatterns.getFullExchange)
  async getFullExchange({ id }: { id: number }) {
    return await this.exchangeService.getFullExchange(id);
  }

  @MessagePattern(exchangeessagePatterns.getAllExchanges)
  async getAllExchanges(): Promise<ExchangeWithUserDto[]> {
    return await this.exchangeService.getAllExchanges();
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
    return await this.exchangeService.addExchangeToTheFront(
      addExchangeToTheFront,
    );
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
    return await this.exchangeService.deleteExchangeFromFront(boxId);
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
    return await this.exchangeService.changeExchangeStatus(
      changeExchangeStatus,
    );
  }
  @MessagePattern(exchangeessagePatterns.getBoxSize)
  async getBoxSize({ id }: { id: number }): Promise<string> {
    return await this.exchangeService.getBoxSize(id);
  }
}
