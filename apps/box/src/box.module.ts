import { Module } from '@nestjs/common';
import { BoxController } from './box.controller';
import { BoxService } from './box.service';

@Module({
  imports: [],
  controllers: [BoxController],
  providers: [BoxService],
})
export class BoxModule {}
