import { Test, TestingModule } from '@nestjs/testing';
import { BoxController } from './box.controller';
import { BoxService } from './box.service';

describe('BoxController', () => {
  let boxController: BoxController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BoxController],
      providers: [BoxService],
    }).compile();

    boxController = app.get<BoxController>(BoxController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(boxController.getHello()).toBe('Hello World!');
    });
  });
});
