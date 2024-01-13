import { Controller, Get } from '@nestjs/common';
import { BoxService } from './box.service';

@Controller()
export class BoxController {
  constructor(private readonly boxService: BoxService) {}

  @Get()
  getHello(): string {
    return this.boxService.getHello();
  }
}
