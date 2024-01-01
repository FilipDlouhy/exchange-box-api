import { Test, TestingModule } from '@nestjs/testing';
import { FrontController } from './front.controller';
import { FrontService } from './front.service';

describe('FrontController', () => {
  let frontController: FrontController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FrontController],
      providers: [FrontService],
    }).compile();

    frontController = app.get<FrontController>(FrontController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(frontController.getHello()).toBe('Hello World!');
    });
  });
});
