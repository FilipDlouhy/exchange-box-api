import { NestFactory } from '@nestjs/core';
import { ChatSupportModule } from './chat-support.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

bootstrap();
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ChatSupportModule,
    {
      transport: Transport.TCP,
      options: {
        port: 3010,
      },
    },
  );
  await app.listen();
}
bootstrap();
