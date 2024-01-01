import { Controller, Get } from '@nestjs/common';
import { FrontService } from './front.service';

@Controller()
export class FrontController {
  constructor(private readonly frontService: FrontService) {}

  @Get()
  getHello(): string {
    return this.frontService.getHello();
  }
}
