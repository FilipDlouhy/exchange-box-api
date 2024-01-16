import { Module } from '@nestjs/common';
import { ChatSupportController } from './chat-support.controller';
import { ChatSupportService } from './chat-support.service';

@Module({
  imports: [],
  controllers: [ChatSupportController],
  providers: [ChatSupportService],
})
export class ChatSupportModule {}
