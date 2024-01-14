import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { BoxService } from './box.service';
import { MessagePattern } from '@nestjs/microservices';
import { boxMessagePatterns } from '@app/tcp/box.message.patterns';
import { AddBoxToExchangeDto } from '@app/dtos/boxDtos/add.box.to.exhange';
import { OpenBoxDto } from '@app/dtos/boxDtos/open.box.dto';

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
  async createBoxForExchange({
    addBoxToExchangeDto,
  }: {
    addBoxToExchangeDto: AddBoxToExchangeDto;
  }) {
    return this.boxService.createBoxForExchange(addBoxToExchangeDto);
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
    return this.boxService.generateCodeForBoxToOpen(id);
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
    return this.boxService.openBox(openBoxDto);
  }
}
