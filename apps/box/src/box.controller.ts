import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { BoxService } from './box.service';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { boxMessagePatterns } from '@app/tcp/boxMessagePatterns/box.message.patterns';
import { OpenBoxDto } from 'libs/dtos/boxDtos/open.box.dto';

@Controller()
export class BoxController {
  constructor(private readonly boxService: BoxService) {}

  @MessagePattern(boxMessagePatterns.createBox)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createBoxForExchange() {
    try {
      return this.boxService.createBoxForExchange();
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(boxMessagePatterns.generateCodeForBoxToOpen)
  async generateCodeForBoxToOpen({
    id,
    exchangeState,
  }: {
    id: number;
    exchangeState: string;
  }) {
    try {
      return this.boxService.generateCodeForBoxToOpen(id, exchangeState);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(boxMessagePatterns.openBox)
  async openBox({
    openBoxDto,
    isFromCreator,
  }: {
    openBoxDto: OpenBoxDto;
    isFromCreator: boolean;
  }) {
    try {
      return this.boxService.openBox(openBoxDto, isFromCreator);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }
}
