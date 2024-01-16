import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatSupportService {
  getHello(): string {
    return 'Hello World!';
  }
}
