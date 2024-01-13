import { NestFactory } from '@nestjs/core';
import { BoxModule } from './box.module';

async function bootstrap() {
  const app = await NestFactory.create(BoxModule);
  await app.listen(3000);
}
bootstrap();
