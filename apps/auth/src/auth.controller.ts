import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern } from '@nestjs/microservices';
import { authMessagePatterns } from '@app/tcp/auth.messages.patterns';
import { LoginUserDto } from '@app/dtos/userDtos/login.user.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(authMessagePatterns.login)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async login({ email, password }: LoginUserDto) {
    return this.authService.login(email, password);
  }

  @MessagePattern(authMessagePatterns.checkJwtToken)
  async checkToken({ token }: { token: string }) {
    return this.authService.checkJwtToken(token);
  }
}
