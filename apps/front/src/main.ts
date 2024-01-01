import { NestFactory } from '@nestjs/core';
import { FrontModule } from './front.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    FrontModule,
    {
      transport: Transport.TCP,
      options: {
        port: 3003,
      },
    },
  );
  await app.listen();
}
bootstrap();
