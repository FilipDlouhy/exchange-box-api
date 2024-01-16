import { Controller, Get } from '@nestjs/common';
import { ChatSupportService } from './chat-support.service';

@Controller()
export class ChatSupportController {
  constructor(private readonly chatSupportService: ChatSupportService) {}

  @Get()
  getHello(): string {
    return this.chatSupportService.getHello();
  }
}
