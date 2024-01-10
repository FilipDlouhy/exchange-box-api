import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Injectable,
  UseInterceptors,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { validateDto } from './dto.validation';

@Injectable()
export class ValidationInterceptor<T> implements NestInterceptor {
  constructor(private dtoClass: new () => T) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    await validateDto(request.body, this.dtoClass);
    return next.handle();
  }
}
