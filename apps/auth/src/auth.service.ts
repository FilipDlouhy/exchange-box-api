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
  /**
   * Validates the provided email and password against the stored credentials.
   * If the user is found and the password matches, the user object is returned.
   * Otherwise, null is returned, indicating that the credentials are invalid.
   *
   * @param {string} email - The user's email address.
   * @param {string} pass - The user's password.
   * @returns The user object or null.
   */
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

  /**
   * Handles user login by validating credentials and generating a JWT token.
   * Throws an UnauthorizedException if the credentials are invalid.
   *
   * @param {string} email - The user's email address.
   * @param {string} password - The user's password.
   * @returns An object containing the access token.
   */
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

  /**
   * Checks the validity of the given JWT token using the JwtService's verify method.
   * Returns true if the token is valid, false otherwise.
   *
   * @param {string} token - The JWT token to be verified.
   * @returns A promise that resolves to a boolean indicating token validity.
   */
  async checkJwtToken(token: string): Promise<boolean> {
    try {
      this.jwtService.verify(token);
      return true;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }
}
