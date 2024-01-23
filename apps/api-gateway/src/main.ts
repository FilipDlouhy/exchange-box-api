import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import * as cookieParser from 'cookie-parser'; // Import cookie-parser

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);

  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });

  await app.listen(3000);
}
bootstrap();
