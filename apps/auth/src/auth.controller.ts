import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { authMessagePatterns } from '@app/tcp/authMessagePatterns/auth.messages.patterns';
import { LoginUserDto } from 'libs/dtos/userDtos/login.user.dto';

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
    try {
      return this.authService.login(email, password);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(authMessagePatterns.checkToken)
  async checkToken({ token }: { token: string }) {
    try {
      return this.authService.checkToken(token);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(authMessagePatterns.getUserByToken)
  async getUserByToken({ token }: { token: string }) {
    try {
      return this.authService.getUserByToken(token);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(authMessagePatterns.getUserId)
  async getUserIdFromToken({ token }: { token: string }): Promise<number> {
    try {
      return this.authService.getUserIdFromToken(token);
    } catch (error) {
      throw new RpcException(error.message);
    }
  }
}
