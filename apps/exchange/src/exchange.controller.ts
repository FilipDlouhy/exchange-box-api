import { Controller } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { exchangeessagePatterns } from '@app/tcp/exchange.message.patterns';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @MessagePattern(exchangeessagePatterns.createExchange)
  async createExchange() {
    return await this.exchangeService.createExchange();
  }
}
