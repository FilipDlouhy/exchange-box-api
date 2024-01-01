import { Test, TestingModule } from '@nestjs/testing';
import { CenterController } from './center.controller';
import { CenterService } from './center.service';

describe('CenterController', () => {
  let centerController: CenterController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CenterController],
      providers: [CenterService],
    }).compile();

    centerController = app.get<CenterController>(CenterController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(centerController.getHello()).toBe('Hello World!');
    });
  });
});
