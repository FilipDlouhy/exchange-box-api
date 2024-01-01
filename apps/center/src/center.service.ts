import { Injectable } from '@nestjs/common';

@Injectable()
export class CenterService {
  getHello(): string {
    return 'Hello World!';
  }
}
