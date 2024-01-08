import { Injectable } from '@nestjs/common';

@Injectable()
export class BoxService {
  getHello(): string {
    return 'Hello World!';
  }
}
