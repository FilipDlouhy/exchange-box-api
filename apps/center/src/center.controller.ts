import { Controller, Get } from '@nestjs/common';
import { CenterService } from './center.service';

@Controller()
export class CenterController {
  constructor(private readonly centerService: CenterService) {}

  @Get()
  getHello(): string {
    return this.centerService.getHello();
  }
}
