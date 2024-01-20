import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { BoxService } from './box.service';
import { MessagePattern } from '@nestjs/microservices';
import { boxMessagePatterns } from '@app/tcp/box.message.patterns';
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
  async createBoxForExchange() {
    return this.boxService.createBoxForExchange();
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
