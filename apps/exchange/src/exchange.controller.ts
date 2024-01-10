import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { exchangeessagePatterns } from '@app/tcp/exchange.message.patterns';
import { MessagePattern } from '@nestjs/microservices';
import { CreateExchangeDto } from '@app/dtos/exchangeDtos/create.exchange.dto';
import { ExchangeDto } from '@app/dtos/exchangeDtos/exchange.dto';

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
  async createExchange(
    createExchangeDto: CreateExchangeDto,
  ): Promise<ExchangeDto> {
    return await this.exchangeService.createExchange(createExchangeDto);
  }
}
