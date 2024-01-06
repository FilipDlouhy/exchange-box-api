import { Controller } from '@nestjs/common';
import { FrontService } from './front.service';
import { frontMessagePatterns } from '@app/tcp/front.message.patterns';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class FrontController {
  constructor(private readonly frontService: FrontService) {}

  // Create a front entity associated with the specified center
  @MessagePattern(frontMessagePatterns.createFront)
  async createFront({ center_id }: { center_id: number }): Promise<boolean> {
    return await this.frontService.createFront(center_id);
  }
}
