import { Module } from '@nestjs/common';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { EventGateway } from './event.gateway';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventController } from './event.controler';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClientsModule.register([
      {
        name: 'REDIS_CLIENT',
        transport: Transport.REDIS,
        options: {
          host: 'localhost',
          port: 6379,
        },
      },
    ]),
  ],
  controllers: [ApiGatewayController, EventController],
  providers: [ApiGatewayService, EventGateway],
})
export class ApiGatewayModule {}
