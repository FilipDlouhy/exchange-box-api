import { NestFactory } from '@nestjs/core';
import { ExchangeModule } from './exchange.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ExchangeModule,
    {
      transport: Transport.TCP,
      options: {
        port: 3007,
      },
    },
  );
  await app.listen();
}
bootstrap();
