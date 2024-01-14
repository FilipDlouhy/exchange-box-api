import { NestFactory } from '@nestjs/core';
import { BoxModule } from './box.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    BoxModule,
    {
      transport: Transport.TCP,
      options: {
        port: 3008,
      },
    },
  );
  await app.listen();
}
bootstrap();
