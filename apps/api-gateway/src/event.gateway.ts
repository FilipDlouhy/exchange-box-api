import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.UI_PORT ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['my-custom-header'],
    credentials: true,
  },
})
export class EventGateway {
  @WebSocketServer() server: Server;

  sendToUI(data: any) {
    console.log('Sending data to UI:', data);
    this.server.emit('notification', data);
  }
}
