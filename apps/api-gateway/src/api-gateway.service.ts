import { Injectable } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';

@Injectable()
export class ApiGatewayService {
  private paymentServiceClient: ClientProxy;
  private authServiceClient: ClientProxy;
  private centerServiceClient: ClientProxy;
  private frontServiceClient: ClientProxy;
  private itemServiceClient: ClientProxy;
  private userServiceClient: ClientProxy;

  constructor() {
    this.paymentServiceClient = this.createClient('payment', 3005);
    this.authServiceClient = this.createClient('auth', 3001);
    this.centerServiceClient = this.createClient('center', 3002);
    this.frontServiceClient = this.createClient('front', 3003);
    this.itemServiceClient = this.createClient('item', 3004);
    this.userServiceClient = this.createClient('user', 3006);
  }

  private createClient(serviceName: string, port: number): ClientProxy {
    return ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: port,
      },
    });
  }
}
