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
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async generateCodeForBoxToOpen({ id }: { id: number }) {
    try {
      return this.boxService.generateCodeForBoxToOpen(id);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(boxMessagePatterns.openBox)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async openBox(openBoxDto: OpenBoxDto) {
    try {
      return this.boxService.openBox(openBoxDto);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }
}
