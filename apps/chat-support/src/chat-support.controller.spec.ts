import { Test, TestingModule } from '@nestjs/testing';
import { ChatSupportController } from './chat-support.controller';
import { ChatSupportService } from './chat-support.service';

describe('ChatSupportController', () => {
  let chatSupportController: ChatSupportController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ChatSupportController],
      providers: [ChatSupportService],
    }).compile();

    chatSupportController = app.get<ChatSupportController>(ChatSupportController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(chatSupportController.getHello()).toBe('Hello World!');
    });
  });
});
