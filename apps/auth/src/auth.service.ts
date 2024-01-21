import { userMessagePatterns } from '@app/tcp';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly userClient;

  constructor(private readonly jwtService: JwtService) {
    this.userClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3006,
      },
    });
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userClient
      .send(
        { cmd: userMessagePatterns.getUserByEmail.cmd },
        {
          userEmail: email,
        },
      )
      .toPromise();

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);

    if (isPasswordValid) {
      return user;
    } else {
      return null;
    }
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }

    const payload = { email: user.email, userId: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async checkJwtToken(token: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.verify(token);
      return !!decoded;
    } catch (error) {
      return false;
    }
  }
}
